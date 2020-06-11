import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { OdalPapiService } from '../../../shared/odalpapi-node/odalpapi.service';
import { OdalPapi } from '../../../shared/odalpapi-node/odalpapi.models';
import { ServerRow } from '../../models/server.interface';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';

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
export class ClassicLauncherComponent implements OnInit, OnDestroy {
	public masterCount$: BehaviorSubject<Number> = new BehaviorSubject(0);
	public serverList$: BehaviorSubject<ServerRow[]> = new BehaviorSubject([]);
	public displayedColumns = ['private', 'name', 'ping', 'players', 'gametype', 'iwad', 'wads', 'map', 'ip'];
	private subs: Subscription = new Subscription();
	private serverList: ServerRow[] = [];
	private servers: OdalPapi.ServerInfo[] = [];
	private servers$: BehaviorSubject<OdalPapi.ServerInfo[]> = new BehaviorSubject([]);
	public loading$: BehaviorSubject<boolean> = new BehaviorSubject(true);

	public get serverCount() {
		return this.serverList.length;
	}

	constructor(
		private odal: OdalPapiService,
		private cdr: ChangeDetectorRef
	) {}

	ngOnInit() {
		this.queryMasterServers();
	}

	queryMasterServers() {

		this.loading$.next(true);
		this.serverList = [];

		this.odal.queryMasterServer(masterList[0], (list: OdalPapi.MasterResponse[]) => {
			console.log('Processing server list...');
			this.masterCount$.next(list.length);

			list.forEach((serverIdentity: OdalPapi.MasterResponse) => this.queryGameServer(serverIdentity));
		});
	}

	queryGameServer(serverIdentity: OdalPapi.MasterResponse, single: boolean = false) {
		this.odal.queryGameServer(serverIdentity, single, (server, pong) => {
			if (server.name !== null) {
				this.saveGameServer(server, pong);
			}
		});
	}

	saveGameServer(serverInfo: OdalPapi.ServerInfo, ping: number) {

		const index = this.serverList.findIndex(server => {
			return server.ip === `${serverInfo.address.ip}:${serverInfo.address.port}`;
		});

		serverInfo.ping = ping;

		if (index === -1) {
			this.serverList.push(this.translateOdalPapi(serverInfo));
		} else {
			Object.assign(this.serverList[index], this.translateOdalPapi(serverInfo));
		}

		// console.log(this.serverList.length, this.odal.serverCount);

		if (this.serverList.length === this.odal.serverCount) {
			this.serverList$.next(this.serverList);
			this.loading$.next(false);
			this.cdr.detectChanges();
		}
	}

	translateOdalPapi(server: OdalPapi.ServerInfo): ServerRow {
		return {
			private: (server.passwordHash != null && server.passwordHash.length > 0),
			name: server.name,
			ip: `${server.address.ip}:${server.address.port}`,
			iwad: server.wads[1].name.split('.')[0],
			gametype: '',
			map: server.currentMap,
			wads: gameTypes.find(g => g.value === server.gameType).label,
			ping: server.ping,
			players: `${server.players.length} / ${server.maxPlayers}`
		};
	}

	handleRowSelection(row: ServerRow) {
		console.log('Handling selection of row', row);
		this.cdr.detectChanges();
		const ident: OdalPapi.MasterResponse = {ip: row.ip.split(':')[0], port: parseInt(row.ip.split(':')[1], 10)};
		this.queryGameServer(ident, true);
	}

	ngOnDestroy() {
		this.subs.unsubscribe();
	}
}
