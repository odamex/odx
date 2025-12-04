/**
 * OdalPapi UDP service for Electron main process
 * 
 * Implements the Odamex launcher API (OdalPapi) protocol for querying
 * master servers and game servers using UDP sockets.
 * 
 * @module odalpapi-main
 */
import * as dgram from 'dgram';

/** Tag identifier for OdalPapi packets */
export const TAG_ID = 0xAD0;

/** Current OdalPapi protocol version */
export const PROTOCOL_VERSION = 9;

/** Extract major version number from protocol version */
function VERSIONMAJOR(V: number) { return Math.floor(V / 256); }

/** Extract minor version number from protocol version */
function VERSIONMINOR(V: number) { return Math.floor((V % 256) / 10); }

/** Extract patch version number from protocol version */
function VERSIONPATCH(V: number) { return Math.floor((V % 256) % 10); }

/** Calculate full version number for protocol */
function VERSION() { return Math.floor(0 * 256 + (PROTOCOL_VERSION*10)); }

/**
 * OdalPapi protocol implementation namespace
 * Contains all types, enums, and interfaces for server communication
 */
export namespace OdalPapi {
  /** Challenge value sent to master server */
  export const MASTER_CHALLENGE = 777123;
  
  /** Expected response value from master server */
  export const MASTER_RESPONSE  = 777123;
  
  /** Challenge value for querying game server information */
  export const SERVER_CHALLENGE = 0xAD011002;
  
  /** Challenge value for querying server version */
  export const SERVER_VERSION_CHALLENGE = 0xAD011001;
  
  /** Challenge value for pinging a server */
  export const PING_CHALLENGE = 1;

  /**
   * Response from master server containing game server address
   */
  export interface MasterResponse {
    /** Server IP address */
    ip: string;
    /** Server port number */
    port: number;
  }

  /**
   * Console variable (cvar) data types
   */
  export enum CvarType {
    CVARTYPE_NONE = 0,
    CVARTYPE_BOOL,
    CVARTYPE_BYTE,
    CVARTYPE_WORD,
    CVARTYPE_INT,
    CVARTYPE_FLOAT,
    CVARTYPE_STRING,
    CVARTYPE_MAX = 255
  }

  /**
   * Game mode types
   */
  export enum GameType {
    /** Cooperative gameplay against monsters */
    GT_Cooperative = 0,
    /** Free-for-all deathmatch */
    GT_Deathmatch,
    /** Team-based deathmatch */
    GT_TeamDeathmatch,
    /** Capture the flag */
    GT_CaptureTheFlag,
    GT_Max
  }

  /**
   * Server console variable (cvar) information
   */
  export interface Cvar {
    /** Variable name */
    name: string;
    /** String representation of value */
    value: string;
    /** Data type of the cvar */
    cType: CvarType;
    /** 32-bit signed integer value */
    i32?: number;
    /** 32-bit unsigned integer value */
    ui32?: number;
    /** 16-bit signed integer value */
    i16?: number;
    /** 16-bit unsigned integer value */
    ui16?: number;
    /** 8-bit signed integer value */
    i8?: number;
    /** 8-bit unsigned integer value */
    ui8?: number;
    /** Boolean value */
    b?: boolean;
  }

  /**
   * Team information for team-based game modes
   */
  export interface Team {
    /** Team name */
    name: string;
    /** Team color identifier */
    color: number;
    /** Team's current score */
    score: number;
  }

  /**
   * Player information from game server
   */
  export interface Player {
    /** Player name */
    name: string;
    /** Player color identifier */
    color: number;
    /** Number of kills (monsters in co-op, players in DM) */
    kills: number;
    /** Number of deaths */
    deaths: number;
    /** Time connected in seconds */
    time: number;
    /** Frag count (kills minus deaths) */
    frags: number;
    /** Network latency in milliseconds */
    ping: number;
    /** Team number (if team game) */
    team: number;
    /** Whether player is spectating */
    spectator: boolean;
  }

  /**
   * WAD file information
   */
  export interface Wad {
    /** WAD filename */
    name: string;
    /** MD5 hash of WAD file */
    hash: string;
  }

  /**
   * Complete server information from game server query
   */
  export interface ServerInfo {
    /** Server network address (IP and port) */
    address: MasterResponse;
    /** Applied patches/modifications */
    patches: string[];
    /** Server console variables */
    cvars: Cvar[];
    /** Teams (if team-based game) */
    teams: Team[];
    /** Required WAD files */
    wads: Wad[];
    /** Connected players */
    players: Player[];
    /** Server name */
    name: string | null;
    /** Join password hash (null if no password) */
    passwordHash: string | null;
    /** Current map being played */
    currentMap: string | null;
    /** Server version revision string */
    versionRevStr: string | null;
    /** Game mode type */
    gameType: GameType;
    /** Server response ID */
    response: number | null;
    /** Version revision number */
    versionRevision: number | null;
    /** Protocol version */
    versionProtocol: number | null;
    /** Real protocol version */
    versionRealProtocol: number | null;
    /** Processing time */
    pTime: number | null;
    /** Score limit for match */
    scoreLimit: number | null;
    /** Time limit in minutes */
    timeLimit: number | null;
    /** Time remaining in seconds */
    timeLeft: number | null;
    /** Server version major number */
    versionMajor: number | null;
    /** Server version minor number */
    versionMinor: number | null;
    /** Server version patch number */
    versionPatch: number | null;
    /** Maximum connected clients */
    maxClients: number | null;
    /** Maximum players (excluding spectators) */
    maxPlayers: number | null;
    /** Lives per player */
    lives: number | null;
    /** Number of teams/sides */
    sides: number | null;
    /** Whether server responded to query */
    responded: boolean;
    /** Network latency to server in milliseconds */
    ping: number;
  }
}

/**
 * Custom error class for OdalPapi processing errors
 */
class OdalPapiProcessError extends Error {
  /** Whether the server should be removed from the list */
  public removeServer = false;

  /**
   * @param message Error message
   * @param removeServer Whether to remove the server from the list
   */
  constructor(message: string, removeServer = false) {
    super(message);
    this.removeServer = removeServer;
  }
}

/**
 * OdalPapi main service for querying Odamex master and game servers
 * 
 * Handles UDP socket communication for:
 * - Querying master server for list of game servers
 * - Querying individual game servers for detailed information
 * - Pinging servers for latency measurement
 * 
 * @example
 * const service = new OdalPapiMainService();
 * const servers = await service.queryMasterServer('master1.odamex.net:15000');
 */
export class OdalPapiMainService {
  private currentIndex = 0;

  /**
   * Query the master server for a list of active game servers
   * 
   * @param ip Master server address in format "hostname:port" or "ip:port"
   * @returns Promise resolving to array of server addresses
   * @throws {Error} If query times out or fails
   * 
   * @example
   * const servers = await service.queryMasterServer('master1.odamex.net:15000');
   * console.log(`Found ${servers.length} servers`);
   */
  queryMasterServer(ip: string): Promise<OdalPapi.MasterResponse[]> {
    return new Promise((resolve, reject) => {
      const timeout = 10000;
      const socket = dgram.createSocket('udp4');
      const cb = Buffer.alloc(4);
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        try {
          socket.close();
        } catch (err) {
          // Socket may already be closed
        }
      };

      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error("Master server query timed out"));
        }
      }, timeout);

      cb.writeUInt32LE(OdalPapi.MASTER_CHALLENGE, 0);

      socket.on('message', (response) => {
        if (!isResolved) {
          isResolved = true;
          try {
            const baseList = this.processMasterResponse(response);
            cleanup();
            resolve(baseList);
          } catch (err) {
            cleanup();
            reject(err);
          }
        }
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          console.error("Master server error:", err);
          cleanup();
          reject(err);
        }
      });

      socket.send(cb, 15000, ip, err => {
        if (err && !isResolved) {
          isResolved = true;
          cleanup();
          reject(err);
        }
      });
    });
  }

  queryGameServer(serverIdentity: OdalPapi.MasterResponse): Promise<{server: OdalPapi.ServerInfo, pong: number}> {
    return new Promise((resolve, reject) => {
      const timeout = 10000;
      const socket = dgram.createSocket('udp4');
      const cb = Buffer.alloc(4);
      const pingStart = Date.now();
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        try {
          socket.close();
        } catch (err) {
          // Socket may already be closed
        }
      };

      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Query timeout for ${serverIdentity.ip}:${serverIdentity.port} after ${timeout}ms`));
        }
      }, timeout);

      cb.writeUInt32LE(OdalPapi.SERVER_CHALLENGE, 0);

      socket.on('message', (response) => {
        if (!isResolved) {
          isResolved = true;
          try {
            const pingResponse = Math.ceil((Date.now() - pingStart) / 2);
            const server = this.processGameServerResponse(response, serverIdentity);
            
            if (server.responded) {
              cleanup();
              resolve({server, pong: pingResponse});
            } else {
              cleanup();
              reject(new Error(`Invalid response from ${serverIdentity.ip}:${serverIdentity.port}`));
            }
          } catch (err) {
            cleanup();
            reject(err);
          }
        }
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          console.error(`Server query error for ${serverIdentity.ip}:${serverIdentity.port}:`, err);
          cleanup();
          reject(new Error(`Query error for ${serverIdentity.ip}:${serverIdentity.port}: ${err.message}`));
        }
      });

      socket.send(cb, serverIdentity.port, serverIdentity.ip, err => {
        if (err && !isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Failed to send query to ${serverIdentity.ip}:${serverIdentity.port}: ${err.message}`));
        }
      });
    });
  }

  pingGameServer(serverIdentity: OdalPapi.MasterResponse): Promise<number> {
    return new Promise((resolve, reject) => {
      const pingStart = Date.now();
      const pingBuf = Buffer.alloc(4);
      pingBuf.writeUInt32LE(OdalPapi.PING_CHALLENGE, 0);

      const socket = dgram.createSocket('udp4');
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        try {
          socket.close();
        } catch (err) {
          // Socket may already be closed
        }
      };

      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Ping timeout for ${serverIdentity.ip}:${serverIdentity.port}`));
        }
      }, 5000);

      socket.on('message', () => {
        if (!isResolved) {
          isResolved = true;
          const pingResponse = Date.now() - pingStart;
          cleanup();
          resolve(pingResponse);
        }
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Ping error for ${serverIdentity.ip}:${serverIdentity.port}: ${err.message}`));
        }
      });

      socket.send(pingBuf, serverIdentity.port, serverIdentity.ip, (err) => {
        if (err && !isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Failed to send ping to ${serverIdentity.ip}:${serverIdentity.port}: ${err.message}`));
        }
      });
    });
  }

  private processGameServerResponse(response: Buffer, serverAddr: OdalPapi.MasterResponse): OdalPapi.ServerInfo {
    const server: OdalPapi.ServerInfo = {
      address: serverAddr,
      patches: [],
      cvars: [],
      teams: [],
      wads: [],
      players: [],
      name: null,
      passwordHash: null,
      currentMap: null,
      versionRevStr: null,
      gameType: 0,
      response: null,
      versionRevision: null,
      versionProtocol: null,
      versionRealProtocol: null,
      pTime: null,
      scoreLimit: null,
      timeLimit: null,
      timeLeft: null,
      versionMajor: null,
      versionMinor: null,
      versionPatch: null,
      maxClients: null,
      maxPlayers: null,
      lives: null,
      sides: null,
      responded: false,
      ping: 0
    };

    try {
      this.currentIndex = 0;

      const r = this.read32(response);
      const tagId = ((r >> 20) & 0x0FFF);
      const tagApplication = ((r >> 16) & 0x0F);
      const tagQRId = ((r >> 12) & 0x0F);
      const tagPacketType = (r & 0xFFFF0FFF);

      if (tagId !== TAG_ID || !this.translateResponse(tagId, tagApplication, tagQRId, tagPacketType)) {
        throw new OdalPapiProcessError(`Invalid response from ${serverAddr.ip}:${serverAddr.port}`);
      }

      const SvVersion = this.read32(response);
      const SvProtocolVersion = this.read32(response);

      if (SvVersion === 0) {
        throw new OdalPapiProcessError('Version issue');
      }

      server.versionMajor = VERSIONMAJOR(SvVersion);
      server.versionMinor = VERSIONMINOR(SvVersion);
      server.versionPatch = VERSIONPATCH(SvVersion);
      server.versionProtocol = SvProtocolVersion;

      if ((VERSIONMAJOR(SvVersion) < VERSIONMAJOR(VERSION())) ||
        (VERSIONMAJOR(SvVersion) <= VERSIONMAJOR(VERSION()) && VERSIONMINOR(SvVersion) < VERSIONMINOR(VERSION()))) {
        throw new OdalPapiProcessError(
          `Server ${serverAddr.ip}:${serverAddr.port} is version ${VERSIONMAJOR(SvVersion)}.${VERSIONMINOR(SvVersion)}.${VERSIONPATCH(SvVersion)} which is not supported`,
          true
        );
      }

      server.responded = true;
      server.pTime = this.read32(response);
      server.versionRealProtocol = this.read32(response);
      server.versionRevStr = this.readString(response);

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
        }

        if (cvar.name === 'sv_hostname') server.name = cvar.value;
        if (cvar.name === 'sv_maxplayers') server.maxPlayers = cvar.ui8!;
        if (cvar.name === 'sv_maxclients') server.maxClients = cvar.ui8!;
        if (cvar.name === 'sv_gametype') server.gameType = cvar.ui8!;
        if (cvar.name === 'sv_scorelimit') server.scoreLimit = cvar.ui16!;
        if (cvar.name === 'sv_timelimit') server.timeLimit = parseFloat(cvar.value);
        if (cvar.name === 'g_lives') server.lives = cvar.ui16!;
        if (cvar.name === 'g_sides') server.sides = cvar.ui16!;

        server.cvars.push(cvar);
      }

      server.passwordHash = this.readHexString(response);
      server.currentMap = this.readString(response);

      if (server.timeLimit && server.timeLimit > 0) {
        server.timeLeft = this.read16(response);
      }

      // Teams
      if (server.gameType === OdalPapi.GameType.GT_TeamDeathmatch || 
          server.gameType === OdalPapi.GameType.GT_CaptureTheFlag) {
        const teamCount = this.read8(response);
        for (let i = 0; i < teamCount; i++) {
          server.teams.push({
            name: this.readString(response),
            color: this.read32(response),
            score: this.read16(response)
          });
        }
      }

      // Patches
      const patchCount = this.read8(response);
      for (let i = 0; i < patchCount; i++) {
        server.patches.push(this.readString(response));
      }

      // WADs
      const wadCount = this.read8(response);
      for (let i = 0; i < wadCount; i++) {
        server.wads.push({
          name: this.readString(response),
          hash: this.readHexString(response)
        });
      }

      // Players
      const playerCount = this.read8(response);
      for (let i = 0; i < playerCount; i++) {
        const player: OdalPapi.Player = {
          name: this.readString(response),
          color: this.read32(response),
          kills: 0,
          deaths: 0,
          time: 0,
          frags: 0,
          ping: 0,
          team: 0,
          spectator: false
        };

        if (server.gameType === OdalPapi.GameType.GT_TeamDeathmatch || 
            server.gameType === OdalPapi.GameType.GT_CaptureTheFlag) {
          player.team = this.read8(response);
        }

        player.ping = this.read16(response);
        player.time = this.read16(response);
        player.spectator = this.read8(response) > 0;
        player.frags = this.read16(response);
        player.kills = this.read16(response);
        player.deaths = this.read16(response);
        
        server.players.push(player);
      }
    } catch (e) {
      console.error("Server response parsing error:", e);
    }

    return server;
  }

  private processMasterResponse(response: Buffer): OdalPapi.MasterResponse[] {
    let start = 0;
    const baseList: OdalPapi.MasterResponse[] = [];

    const masterResponse = response.readUInt32LE(start);
    start += 4;
    const count = response.readUInt16LE(start);
    start += 2;

    while (start + 4 < response.length) {
      const serverIPstring = 
        response.readUInt8(start + 0) + '.' +
        response.readUInt8(start + 1) + '.' +
        response.readUInt8(start + 2) + '.' +
        response.readUInt8(start + 3);

      baseList.push({
        ip: serverIPstring,
        port: response.readUInt16LE(start + 4)
      });

      start += 6;
    }

    return baseList;
  }

  private translateResponse(tagId: number, tagApplication: number, tagQRId: number, tagPacketType: number): boolean {
    if (tagQRId !== 2) return false;
    if (tagApplication !== 3) return false;
    if (tagPacketType === 2) return false;
    return true;
  }

  private readString(buffer: Buffer): string {
    const r = [];
    let ch = buffer.toString('utf8', this.currentIndex, this.currentIndex + 1);
    this.currentIndex++;

    while (ch !== '\0' && this.currentIndex < buffer.length) {
      r.push(ch);
      ch = buffer.toString('utf8', this.currentIndex, this.currentIndex + 1);
      this.currentIndex++;
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
    const size = this.read8(buffer);
    if (size === 0) return '';
    
    const r = buffer.toString('hex', this.currentIndex, this.currentIndex + size);
    this.currentIndex += size;
    return r;
  }
}
