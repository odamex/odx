import { Component, OnChanges, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { OdalPapiService } from '../../../shared/odalpapi-node/odalpapi.service';
import { OdalPapi } from '../../../shared/odalpapi-node/odalpapi.models';
import { ServerRow } from '../../models/server.interface';
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import { utf8Encode } from '@angular/compiler/src/util';

const masterList = [
	'208.97.140.174',
	'64.62.190.251'
];

export interface GameTypeItem {
	value: number;
	label: string;
}

const gameTypes: GameTypeItem[] = [
	{value: OdalPapi.GameType.GT_Deathmatch, label: 'DM'},
	{value: OdalPapi.GameType.GT_TeamDeathmatch, label: 'Team DM'},
	{value: OdalPapi.GameType.GT_CaptureTheFlag, label: 'CTF'},
	{value: OdalPapi.GameType.GT_Cooperative, label: 'Cooperative'}
];

@Component({
	selector: 'app-classic-launcher',
	templateUrl: './launcher.component.html',
	styleUrls: ['./launcher.component.scss']
})
export class ClassicLauncherComponent implements OnInit, OnChanges, OnDestroy {
	public displayedColumns = ['private', 'name', 'players', 'gametype', 'iwad', 'map'];
	public serverList$: BehaviorSubject<ServerRow[]> = new BehaviorSubject([]);
	public loading$: BehaviorSubject<boolean> = new BehaviorSubject(true);

	public get serverCount() {
		return this.servers.length;
	}

	private subs: Subscription = new Subscription();
	public serverList: ServerRow[] = [];
	private masterCount = 0;
	private servers: OdalPapi.ServerInfo[] = [];

	constructor(
		private odal: OdalPapiService,
		private cdr: ChangeDetectorRef
	) {}

	ngOnInit() {
		this.queryMasterServers();
	}

	ngOnChanges() {
		console.log("CHANGE");
	}

	async queryMasterServers() {
		return new Promise((resolve, reject) => {

			this.loading$.next(true);
			this.servers = [];
			this.serverList = [];

			resolve(
				this.odal.queryMasterServer(masterList[0])
				.then((list: OdalPapi.MasterResponse[]) => {
					this.masterCount = list.length;
					this.queryGameServers(list);
				})
			);
		}).then(() => {
			this.loading$.next(false);
		});
	}

	queryGameServers(list: OdalPapi.MasterResponse[]) {
		list.forEach((serverIdentity: OdalPapi.MasterResponse) => {
			const server = new OdalPapi.ServerInfo();
			server.address = serverIdentity;
			this.saveGameServer(server, 0, true);

			this.queryGameServer(serverIdentity);
		});
	}

	queryGameServer(serverIdentity: OdalPapi.MasterResponse, single: boolean = false) {
		this.odal.queryGameServer(serverIdentity, single)
		.then(({server, pong}) => {
			if (server.name === null) {
				this.deleteGameServer(server);
			} else {
				this.saveGameServer(server, pong);
			}
		});
	}

	private deleteGameServer(serverInfo: OdalPapi.ServerInfo) {
		//console.log("Deleting game server ", serverInfo);

		const index = this.servers.findIndex(server => {
			return server.address.ip === serverInfo.address.ip &&
					server.address.port === serverInfo.address.port;
		});

		if (index !== -1) {
			console.log(this.servers.splice(index,1));
			console.log(this.serverList.splice(index,1));
		}

		this.serverList$.next([...this.serverList.slice()]);
	}

	private saveGameServer(serverInfo: OdalPapi.ServerInfo, ping: number, init: boolean = false) {

		//console.log("Saving game server ", serverInfo);

		const index = this.servers.findIndex(server => {
			return server.address.ip === serverInfo.address.ip &&
					server.address.port === serverInfo.address.port;
		});

		const hidden = serverInfo.name === null ? true : false;

		serverInfo.ping = ping;

		if (index === -1) {
			this.servers.push(serverInfo);
			this.serverList.push(this.translateOdalPapi(serverInfo, hidden));
			return;
		}

		Object.assign(this.servers[index], serverInfo);
		Object.assign(this.serverList[index], this.translateOdalPapi(serverInfo));

		if (!init) {
			this.serverList$.next([...this.serverList.slice()]);
		}
	}

	private translateOdalPapi(server: OdalPapi.ServerInfo, hidden?: boolean): ServerRow {
		return {
			private: (server.passwordHash != null && server.passwordHash.length > 0),
			name: server.name,
			ip: `${server.address.ip}:${server.address.port}`,
			iwad: server?.wads?.length > 0 ? server?.wads[1]?.name.split('.')[0] : '',
			gametype: gameTypes.find(g => g.value === server?.gameType).label ?? '',
			map: server.currentMap ?? '',
			wads: '',
			ping: server.ping ?? 0,
			players: `${server?.players.length} / ${server?.maxPlayers}`,
			hidden
		};
	}

	handleRowSelection(row: ServerRow) {
		console.log('Handling selection of row', row);
		this.cdr.detectChanges();
		const ident: OdalPapi.MasterResponse = {ip: row.ip.split(':')[0], port: parseInt(row.ip.split(':')[1], 10)};
		this.queryGameServer(ident, true);
	}

	ngOnDestroy() {
		this.serverList$.complete();
		this.loading$.complete();
		this.subs.unsubscribe();
	}
}
