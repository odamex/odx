export const TAG_ID = 0xAD0;

export function VERSIONMAJOR(V) { return Math.floor(V / 256); }
export function VERSIONMINOR(V) { return Math.floor((V % 256) / 10); }
export function VERSIONPATCH(V) { return Math.floor((V % 256) % 10); }
export function VERSION() { return Math.floor(0 * 256 + 83); }
export const PROTOCOL_VERSION = 8;

export namespace OdalPapi {

	export const MASTER_CHALLENGE = 777123;
	export const MASTER_RESPONSE  = 777123;
	export const SERVER_CHALLENGE = 0xAD011002;
	export const SERVER_VERSION_CHALLENGE = 0xAD011001;

	export interface MasterResponse {
		ip: string;
		port: number;
	}

	export enum CvarType {
		CVARTYPE_NONE = 0, // Used for no sends
		CVARTYPE_BOOL,
		CVARTYPE_BYTE,
		CVARTYPE_WORD,
		CVARTYPE_INT,
		CVARTYPE_FLOAT,
		CVARTYPE_STRING,

		CVARTYPE_MAX = 255
	}

	export enum GameType {
		GT_Cooperative = 0,
		GT_Deathmatch,
		GT_TeamDeathmatch,
		GT_CaptureTheFlag,
		GT_Max
	}

	export interface Cvar {
		name: string;
		value: string;
		cType: CvarType;

		// TODO: Can we remove these?
		i32?: number;
		ui32?: number;
		i16?: number;
		ui16?: number;
		i8?: number;
		ui8?: number;
		b?: boolean;
	}

	export interface Team {
		name: string;
		color: number;
		score: number;
	}

	export interface Player	{
		name: string;
		color: number;
		kills: number;
		deaths: number;
		time: number;
		frags: number;
		ping: number;
		team: number;
		spectator: boolean;
	}

	export interface Wad {
		name: string;
		hash: string;
	}

	export class ServerInfo {
		address: MasterResponse = {ip: '', port: 0};
		patches: string[] = [];
		cvars: Cvar[] = [];
		teams: Team[] = [];
		wads: Wad[] = [];
		players: Player[] = [];
		name: string = null; // Launcher specific: Server name
		passwordHash: string = null;
		currentMap: string = null;
		versionRevStr: string = null;
		gameType: GameType = 0; // Launcher specific: Game type
		response: number = null; // Launcher specific: Server response
		versionRevision: number = null;
		versionProtocol: number = null;
		versionRealProtocol: number = null;
		pTime: number = null;
		scoreLimit: number = null; // Launcher specific: Score limit
		timeLimit: number = null;
		timeLeft: number = null;
		versionMajor: number = null; // Launcher specific: Version fields
		versionMinor: number = null;
		versionPatch: number = null;
		maxClients: number = null; // Launcher specific: Maximum clients
		maxPlayers: number = null; // Launcher specific: Maximum players
		responded = false;

		constructor() {}
	}
}

