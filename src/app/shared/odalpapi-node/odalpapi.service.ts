// tslint:disable: no-bitwise
import { Injectable } from '@angular/core';
import * as dgram from 'dgram';
// import { DgramAsPromised } from 'dgram-as-promised';
import * as ping from 'ping';
import { BehaviorSubject } from 'rxjs';

import { VERSION, VERSIONMAJOR, VERSIONMINOR, VERSIONPATCH, TAG_ID, OdalPapi } from './odalpapi.models';

export interface PingObject {
	start: number;
	end: number;
};

@Injectable({providedIn: 'root'})
export class OdalPapiService {
	public servers$: BehaviorSubject<OdalPapi.ServerInfo[]> = new BehaviorSubject([]);
	public serverCount = 0;

	private servers: OdalPapi.ServerInfo[] = [];
	private currentIndex = 0;

	constructor() {}

	queryMasterServer(ip: string, callback) {
		console.log('Querying master server...');
		const cb = Buffer.alloc(4);
		cb.writeUInt32LE(OdalPapi.MASTER_CHALLENGE, 0);
		let baseList = [];

		const socket = dgram.createSocket('udp4', (response, info) => {
			baseList = this.processMasterResponse(response, info);
			this.serverCount = baseList.length;

			callback(baseList);
		});

		socket.send(cb, 15000, ip, (error, bytes) => {});
	}

	pingGameServer(serverIdentity: OdalPapi.MasterResponse, callback) {

		const pingObj = {
			start: Date.now(),
			end: 0
		};

		const pingBuf = Buffer.alloc(4);
		pingBuf.writeUInt32LE(OdalPapi.PING_CHALLENGE, 0);

		dgram.createSocket('udp4', () => {
			pingObj.end = Date.now();
			const pingResponse = pingObj.end - pingObj.start;
			callback(pingResponse);
		}).send(pingBuf, serverIdentity.port, serverIdentity.ip);
	}

	queryGameServer(serverIdentity: OdalPapi.MasterResponse, single: boolean = false, callback) {
		// console.log('Querying game server ', JSON.stringify(serverIdentity));

		const pingObj = {
			start: Date.now(),
			end: 0
		};

		const cb = Buffer.alloc(4);
		cb.writeUInt32LE(OdalPapi.SERVER_CHALLENGE, 0);
		const socket = dgram.createSocket('udp4')
		.on('message', (response, info) => {
			pingObj.end = Date.now();
			const pingDivisor = single === true ? 1 : 2;
			const pingResponse = Math.ceil((pingObj.end - pingObj.start) / pingDivisor);
			const server = this.processGameServerResponse(response, info);
			callback(server, pingResponse);
		})
		.on('error', (err) => {
			console.log(err);
			this.serverCount--;
		});

		socket.send(cb, serverIdentity.port, serverIdentity.ip, (error, bytes) => {
			// Do something while message is processing or throw an error.
			if (error !== null) {
				console.log(error);
			}
		});
	}

	private processGameServerResponse(response: Buffer, info: dgram.RemoteInfo): OdalPapi.ServerInfo {
		const server = new OdalPapi.ServerInfo();

		try {
			server.address = {ip: info.address, port: info.port};
			this.currentIndex = 0;

			const r = this.read32(response);

			const tagId = ((r >> 20) & 0x0FFF);
			const tagApplication = ((r >> 16) & 0x0F);
			const tagQRId = ((r >> 12) & 0x0F);
			const tagPacketType = (r & 0xFFFF0FFF);
			let validResponse = false;

			if (tagId === TAG_ID) {
				const tResult = this.translateResponse(tagId, tagApplication, tagQRId, tagPacketType);
				validResponse = tResult ? true : false;
			}

			if (!validResponse) {
				throw new Error(`Received invalid response from', ${server.address.ip}:${server.address.port}`);
			}

			const SvVersion = this.read32(response);
			const SvProtocolVersion = this.read32(response);

			// Prevent possible divide by zero
			if (SvVersion === 0) {
				throw new Error('Version issue');
			}

			server.versionMajor = VERSIONMAJOR(SvVersion);
			server.versionMinor = VERSIONMINOR(SvVersion);
			server.versionPatch = VERSIONPATCH(SvVersion);
			server.versionProtocol = SvProtocolVersion;

			if ((VERSIONMAJOR(SvVersion) < VERSIONMAJOR(VERSION())) ||
			(VERSIONMAJOR(SvVersion) <= VERSIONMAJOR(VERSION()) && VERSIONMINOR(SvVersion) < VERSIONMINOR(VERSION()))) {
				// Server is an older version
				throw new Error(`Server ${info.address}:${info.port} is version ${VERSIONMAJOR(SvVersion)}.${VERSIONMINOR(SvVersion)}.${VERSIONPATCH(SvVersion)} which is not supported`);
			}

			// Passed version checks, we'll count it
			server.responded = true;

			server.pTime = this.read32(response);

			server.versionRealProtocol = this.read32(response);

			// TODO: Remove guard if not needed
			if (server.versionRealProtocol >= 7) {
				server.versionRevStr = this.readString(response);

			} else {
				server.versionRevision = this.read32(response);
			}

			// Process CVARs
			const cvarCount = this.read8(response);

			for (let i = 0; i < cvarCount; i++) {
				const cvar: OdalPapi.Cvar = { name: '', value: '', cType: 0 };

				cvar.name = this.readString(response);
				cvar.cType = this.read8(response);

				switch (cvar.cType) {
					case OdalPapi.CvarType.CVARTYPE_BOOL:
						cvar.b = true;
					break;
					case OdalPapi.CvarType.CVARTYPE_BYTE:
						cvar.ui8 = this.read8(response);
					break;
					case OdalPapi.CvarType.CVARTYPE_WORD:
						cvar.ui16 = this.read16(response);
					break;
					case OdalPapi.CvarType.CVARTYPE_INT:
						cvar.i32 = this.read32(response);
					break;
					case OdalPapi.CvarType.CVARTYPE_FLOAT:
					case OdalPapi.CvarType.CVARTYPE_STRING:
						cvar.value = this.readString(response);
					break;

					case OdalPapi.CvarType.CVARTYPE_NONE:
					case OdalPapi.CvarType.CVARTYPE_MAX:
					default:
					break;
				}

				// Traverse CVAR values for server info

				if (cvar.name === 'sv_hostname') {
					server.name = cvar.value;
					continue;
				}

				if (cvar.name === 'sv_maxplayers') {
					server.maxPlayers = cvar.ui8;
					continue;
				}

				if (cvar.name === 'sv_maxclients') {
					server.maxClients = cvar.ui8;
					continue;
				}

				if (cvar.name === 'sv_gametype') {
					server.gameType = cvar.ui8;
					continue;
				}

				if (cvar.name === 'sv_scorelimit') {
					server.scoreLimit = cvar.ui8;
					continue;
				}

				if (cvar.name === 'sv_timelimit') {
					// Add this to the cvar list as well
					server.timeLimit = cvar.ui16;
				}

				server.cvars.push(cvar);
			}

			// Get password hash (private server)
			server.passwordHash = this.readHexString(response);

			// Get current map
			server.currentMap = this.readString(response);

			// Get Time left
			if (server.timeLimit > 0) {
				server.timeLeft = this.read16(response);
			}

			// Teams
			if (server.gameType === OdalPapi.GameType.GT_TeamDeathmatch ||
				server.gameType === OdalPapi.GameType.GT_CaptureTheFlag) {

				const teamCount = this.read8(response);

				for (let i = 0; i < teamCount; ++i) {
					const team: OdalPapi.Team = {name: '', color: 0, score: 0 };

					team.name = this.readString(response);
					team.color = this.read32(response);
					team.score = this.read16(response);

					server.teams.push(team);
				}
			}

			// Dehacked/Bex files
			const patchCount = this.read8(response);

			for (let i = 0; i < patchCount; ++i) {
				let patch = '';

				patch = this.readString(response);

				server.patches.push(patch);
			}

			// Wad files
			const wadCount = this.read8(response);

			for (let i = 0; i < wadCount; ++i) {
				const wad: OdalPapi.Wad = {name: '', hash: ''};

				wad.name = this.readString(response);
				wad.hash = this.readHexString(response);

				server.wads.push(wad);
			}

			// Player information
			const playerCount = this.read8(response);

			for (let i = 0; i < playerCount; ++i) {
				const player: OdalPapi.Player = {
					name: '', color: 0, kills: 0, ping: 0, deaths: 0, frags: 0, spectator: false, time: 0, team: 0
				};

				player.name = this.readString(response);
				player.color = this.read32(response);

				if (server.gameType === OdalPapi.GameType.GT_TeamDeathmatch ||
						server.gameType === OdalPapi.GameType.GT_CaptureTheFlag) {
					player.team = this.read8(response);
				}

				player.ping = this.read16(response);
				player.time = this.read16(response);
				player.spectator = (this.read8(response) > 0);
				player.frags = this.read16(response);
				player.kills = this.read16(response);
				player.deaths = this.read16(response);
				server.players.push(player);
			}
		} catch (e) {
			console.log(e);
			this.serverCount--;
		}

		return server;
	}

	private processMasterResponse(response: Buffer, info: dgram.RemoteInfo): OdalPapi.MasterResponse[] {

		console.log('Processing master response...');

		let start = 0;
		const baseList: OdalPapi.MasterResponse[] = [];

		// Get the master response token
		const masterResponse = response.readUInt32LE(start);
		start += 4;

		// Read the number of verified servers
		const count = response.readUInt16LE(start);
		start += 2;

		while (start + 4 < response.length) {

			let serverIPstring = '';

			serverIPstring += response.readUInt8(start + 0) + '.';
			serverIPstring += response.readUInt8(start + 1) + '.';
			serverIPstring += response.readUInt8(start + 2) + '.';
			serverIPstring += response.readUInt8(start + 3);

			baseList.push({
				ip: serverIPstring,
				port: response.readUInt16LE(start + 4)
			});

			start += 6;
		}

		return baseList;
	}

	private translateResponse(tagId: number, tagApplication: number, tagQRId: number, tagPacketType: number): boolean {
		let r = true;

		// It isn't a response
		if (tagQRId !== 2) {
			// console.log('Query/Response Id is not valid');
			return false;
		}

		switch (tagApplication) {

			// Server
			case 3:
				// console.log('Application is Server');
			break;

			case 1: // ("Application is Enquirer"));
			case 2: // ("Application is Client"));
			case 4: // ("Application is Master Server"));
			default: // ("Application is Unknown"));
				console.log('Value is ', tagApplication);
				r = false;
			break;
		}

		if (r === false) {
			return false;
		}

		if (tagPacketType === 2) {
			// Launcher is an old version
			console.log('Launcher is too old to parse the data from Server.');
			return false;
		}

		// Success
		return true;
	}

	private readString(buffer: Buffer): string {
		const r = [];

		let ch = buffer.toString('utf8', this.currentIndex, this.currentIndex + 1);
		let isRead = (ch.length > 0);

		this.currentIndex++;

		while (ch !== '\0' && isRead === true) {
			r.push(ch);
			ch = buffer.toString('utf8', this.currentIndex, this.currentIndex + 1);
			this.currentIndex++;
			if (this.currentIndex + 1 > buffer.toString().length) {
				isRead = false;
			}
		}

		return r.join('');
	}

	private read8(buffer: Buffer): number {

		const r = buffer.readUInt8(this.currentIndex);
		this.currentIndex += 1;

		return r;
	}

	private read16(buffer: Buffer): number {

		const r = buffer.readUInt16LE(this.currentIndex);
		this.currentIndex += 2;

		return r;
	}

	private read32(buffer: Buffer): number {

		const r = buffer.readUInt32LE(this.currentIndex);
		this.currentIndex += 4;

		return r;
	}

	private readHexString(buffer: Buffer): string {

		let r = '';
		const size = this.read8(buffer);

		if (size > 0) {
			r = buffer.toString('hex', this.currentIndex, this.currentIndex + size);
			this.currentIndex += size;
		}

		return r;
	}
}
