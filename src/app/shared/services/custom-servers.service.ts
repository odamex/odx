import { Injectable, inject, signal } from '@angular/core';
import { CustomServersStore } from '@app/store/custom-servers.store';
import { OdalPapiService, OdalPapi } from '@shared/services';
import { parseCustomServerAddress } from '@shared/utils/custom-server-validation';

/**
 * Service for querying custom servers via OdalPapi.
 * Manages server queries and updates the CustomServersStore with results.
 */
@Injectable({
  providedIn: 'root'
})
export class CustomServersService {
  private store = inject(CustomServersStore);
  private odalpapi = inject(OdalPapiService);
  
  private queryInProgress = signal(false);

  constructor() {
    // Perform initial query on startup if there are addresses
    const addresses = this.store.addresses();
    if (addresses.length > 0) {
      this.queryCustomServers();
    }
  }
  
  /**
   * Queries all custom servers and updates the store with results.
   * Prevents concurrent queries using a flag.
   */
  async queryCustomServers(): Promise<void> {
    if (this.queryInProgress()) {
      return; // Prevent concurrent queries
    }
    
    this.queryInProgress.set(true);
    this.store.setLoading(true);
    
    try {
      const addresses = this.store.addresses();
      const servers: OdalPapi.ServerInfo[] = [];
      
      // Query each custom server
      for (const customServer of addresses) {
        try {
          const parsed = parseCustomServerAddress(customServer.address);
          if (!parsed) {
            console.warn(`Failed to parse custom server address: ${customServer.address}`);
            continue;
          }
          
          // Create a MasterResponse object for the query
          const masterResponse: OdalPapi.MasterResponse = {
            ip: parsed.host,
            port: parsed.port
          };
          
          const { server, pong } = await this.odalpapi.queryGameServer(masterResponse);
          server.ping = pong;
          
          if (server) {
            servers.push(server);
          }
        } catch (error) {
          console.error(`Failed to query custom server ${customServer.address}:`, error);
          // Continue with other servers even if one fails
        }
      }
      
      this.store.setServers(servers);
    } finally {
      this.store.setLoading(false);
      this.queryInProgress.set(false);
    }
  }
  
  /**
   * Queries a single custom server and returns its information.
   * Does not update the store.
   * @param address Server address in format IP:port or domain:port
   * @returns Server information or null if query fails
   */
  async queryCustomServer(address: string): Promise<OdalPapi.ServerInfo | null> {
    try {
      const parsed = parseCustomServerAddress(address);
      if (!parsed) {
        return null;
      }
      
      // Create a MasterResponse object for the query
      const masterResponse: OdalPapi.MasterResponse = {
        ip: parsed.host,
        port: parsed.port
      };
      
      const { server, pong } = await this.odalpapi.queryGameServer(masterResponse);
      server.ping = pong;
      
      if (server) {
        // Update the store with the new server info
        const servers = this.store.servers();
        const existingIndex = servers.findIndex(s => 
          s.address.ip === server.address.ip && s.address.port === server.address.port
        );
        
        if (existingIndex >= 0) {
          // Update existing
          const newServers = [...servers];
          newServers[existingIndex] = server;
          this.store.setServers(newServers);
        } else {
          // Add new
          this.store.setServers([...servers, server]);
        }
      }
      
      return server;
    } catch (error) {
      console.error(`Failed to query custom server ${address}:`, error);
      return null;
    }
  }
}
