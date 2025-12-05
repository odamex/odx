import { Injectable, inject } from '@angular/core';
import { OdalPapi } from './odalpapi.models';
import { validateServerAddress, validateIPAddress } from '@shared/utils/validation.utils';
import { NetworkStatusService } from '@shared/services/network-status/network-status.service';

@Injectable({providedIn: 'root'})
export class OdalPapiService {
  private networkStatus = inject(NetworkStatusService);
  
  public serverCount = 0;
  public processCount = 0;
  public queryCount = 0;

  constructor() {}

  /**
   * Query master server for list of game servers
   * 
   * @param ip Master server address (hostname or hostname:port format)
   * @returns Promise resolving to list of server addresses
   * @throws {Error} If address format is invalid or offline
   */
  queryMasterServer(ip: string): Promise<OdalPapi.MasterResponse[]> {
    if (!ip || typeof ip !== 'string' || !ip.trim()) {
      return Promise.reject(new Error('Master server address is required'));
    }
    
    // Check if offline
    if (this.networkStatus.isOffline()) {
      console.log('[OdalPapi] Cannot query master server - offline mode');
      return Promise.reject(new Error('Cannot query servers in offline mode'));
    }
    
    // For master servers, allow hostname without port (backend uses default port)
    // If port is provided, validate the full address
    if (ip.includes(':')) {
      const validation = validateServerAddress(ip);
      if (!validation.valid) {
        return Promise.reject(new Error(`Invalid master server address: ${validation.error}`));
      }
    } else {
      // Just validate the hostname
      const validation = validateIPAddress(ip);
      if (!validation.valid) {
        return Promise.reject(new Error(`Invalid master server hostname: ${validation.error}`));
      }
    }
    
    return this.networkStatus.withOfflineHandling(
      () => window.electron.odalPapi.queryMaster(ip),
      []
    );
  }

  /**
   * Query individual game server for detailed information
   * 
   * @param serverIdentity Server IP and port
   * @param single Whether this is a single server query
   * @returns Promise with server info and ping time
   */
  queryGameServer(serverIdentity: OdalPapi.MasterResponse, single: boolean = false): Promise<{server: OdalPapi.ServerInfo, pong: number}> {
    // Validate server identity
    if (!serverIdentity || !serverIdentity.ip || !serverIdentity.port) {
      return Promise.reject(new Error('Invalid server identity: missing ip or port'));
    }
    
    const validation = validateServerAddress(`${serverIdentity.ip}:${serverIdentity.port}`);
    if (!validation.valid) {
      return Promise.reject(new Error(`Invalid server address: ${validation.error}`));
    }
    
    return window.electron.odalPapi.queryServer(serverIdentity);
  }

  /**
   * Ping a game server for latency measurement
   * 
   * @param serverIdentity Server IP and port
   * @param callback Function called with ping result
   */
  async pingGameServer(serverIdentity: OdalPapi.MasterResponse, callback: (ping: number) => void): Promise<void> {
    // Validate server identity
    if (!serverIdentity || !serverIdentity.ip || !serverIdentity.port) {
      console.warn('Invalid server identity for ping: missing ip or port');
      return;
    }
    
    try {
      const ping = await window.electron.odalPapi.pingServer(serverIdentity);
      callback(ping);
    } catch (err: unknown) {
      // Silently fail for ping errors - they're not critical
      const message = err instanceof Error ? err.message : String(err);
      console.debug(`Ping failed for ${serverIdentity.ip}:${serverIdentity.port}:`, message);
    }
  }
}

