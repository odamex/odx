import { Injectable, OnInit, OnDestroy } from '@angular/core';
import * as dgram from 'dgram';

import { OdalPapi } from './odalpapi.models';
import { BehaviorSubject, Subject, Subscription, Observable, of } from 'rxjs';
import { first, tap } from 'rxjs/operators';


const SERVER_CHALLENGE = Buffer.from('a3db0b00', 'hex');
const LAUNCHER_CHALLENGE = Buffer.from('021001ad510000000800000000000000', 'hex');
// const MASTER_CHALLENGE = Buffer.from();

@Injectable({providedIn: 'root'})
export class OdalPapiService implements OnInit, OnDestroy {
	masterResponse: Subject<OdalPapi.MasterResponse[]> = new Subject();
	private servers: OdalPapi.ServerInfo[] = [];
	$servers: Observable<OdalPapi.ServerInfo[]>;
	private subs = new Subscription();

	test = 4;

	public get serverCount(): number {
		return this.servers.length;
	}

	constructor() {
		this.subs.add(
			this.masterResponse.subscribe((list) => this.processMasterList(list))
		);
	}

	ngOnInit() {
		console.log('init');
	}

	processMasterResponse(response: Buffer, info: dgram.RemoteInfo): void {
		let start = 0;
		const list: OdalPapi.MasterResponse[] = [];

		while (start + 4 < response.length) {

			let serverIPstring = '';

			serverIPstring += response.readUInt8(start + 0) + '.';
			serverIPstring += response.readUInt8(start + 1) + '.';
			serverIPstring += response.readUInt8(start + 2) + '.';
			serverIPstring += response.readUInt8(start + 3);

			list.push({
				ip: serverIPstring,
				port: response.readUInt16LE(start + 4)
			});

			start += 6;
		}

		this.masterResponse.next(list);
	}

	processServerResponse(response: Buffer, info: dgram.RemoteInfo): void {

		console.log(info, response);

		/************************************************/
		/*
		console.log('HUR SERVER');
		const hexResponse = response.toString('hex');

		if (hexResponse.indexOf('d4d65400') !== -1) {
			console.log('This came from the server response');
		} else {
			console.log('This came from the launcher response');
		}
		*/
	}

	queryMasterServer(ip: string) {

		dgram.createSocket('udp4', (response, info) => {
			this.processMasterResponse(response, info);
		}).send(SERVER_CHALLENGE, 15000, ip, (error, bytes) => {
			// Do something while message is processing or throw an error.
		});
	}

	async queryGameServer(serverIdentity: OdalPapi.MasterResponse): Promise<OdalPapi.ServerInfo> {

		console.log('Processing', serverIdentity);

		const server = new OdalPapi.ServerInfo();

		const result = new Promise<OdalPapi.ServerInfo>((resolve, reject) => {
			dgram.createSocket('udp4', (response, info) => {
				server.address.ip = info.address;
				server.address.port = info.port;
				// _server.address.ip = info.address;
				// _server.address.port = info.port;


			}).send(SERVER_CHALLENGE, serverIdentity.port, serverIdentity.ip, (error, bytes) => {
				// Do something while message is processing or throw an error.
			});

			resolve(server);
		});

		return result;
	}

	processMasterList(data: OdalPapi.MasterResponse[]) {
		if (data.length === 0) {
			return;
		}

		const _servers = [];

		data.forEach((serverIdentity) => {
			this.queryGameServer(serverIdentity).then(
				(value) => _servers.push(value)
			);
		});

		console.log(_servers);
	}

	ngOnDestroy() {
		this.subs.unsubscribe();
	}
}
