import { Injectable, signal, inject } from '@angular/core';
import { ServersStore } from '@app/store';
import { OdalPapiService } from '@shared/services';
import type { OdalPapi } from '@shared/services';

/**
 * User preferences for local network discovery
 */
export interface LocalNetworkDiscoverySettings {
  /** Enable local network scanning */
  enabled: boolean;
  
  // Advanced settings
  /** Starting port number to scan */
  portRangeStart: number;
  /** Ending port number to scan */
  portRangeEnd: number;
  /** Timeout in milliseconds for each query */
  scanTimeout: number;
  /** Refresh interval in seconds */
  refreshInterval: number;
  /** Maximum concurrent queries */
  maxConcurrent: number;
}

/**
 * Information about a detected network interface
 */
export interface NetworkInterface {
  /** Interface name (e.g., "Ethernet", "WiFi") */
  name: string;
  /** IP address */
  address: string;
  /** Network mask */
  netmask: string;
  /** CIDR notation (e.g., "10.0.0.50/24") */
  cidr: string;
}

/**
 * Service for discovering Odamex servers on the local network
 * 
 * Automatically detects local subnets and scans for servers that may not be
 * registered with the master server.
 */
@Injectable({
  providedIn: 'root'
})
export class LocalNetworkDiscoveryService {
  private readonly serversStore = inject(ServersStore);
  private readonly odalPapi = inject(OdalPapiService);
  
  private readonly _settings = signal<LocalNetworkDiscoverySettings>(this.loadSettings());
  private readonly _scanning = signal<boolean>(false);
  private readonly _lastScanTime = signal<Date | null>(null);
  private readonly _detectedNetworks = signal<NetworkInterface[]>([]);
  
  private refreshIntervalId: number | null = null;
  
  /** Current discovery settings */
  readonly settings = this._settings.asReadonly();
  
  /** Whether a scan is currently in progress */
  readonly scanning = this._scanning.asReadonly();
  
  /** Last time a scan completed */
  readonly lastScanTime = this._lastScanTime.asReadonly();
  
  /** Detected network interfaces */
  readonly detectedNetworks = this._detectedNetworks.asReadonly();

  constructor() {
    const settings = this._settings();
    
    // Start discovery if enabled
    if (settings.enabled) {
      this.start();
    }
  }

  /**
   * Update discovery settings
   * 
   * @param settings New settings (partial update supported)
   */
  updateSettings(settings: Partial<LocalNetworkDiscoverySettings>): void {
    const current = this._settings();
    const updated = { ...current, ...settings };
    
    this._settings.set(updated);
    this.saveSettings(updated);
    
    // Restart discovery if enabled state changed
    if ('enabled' in settings) {
      if (settings.enabled) {
        this.start();
      } else {
        this.stop();
      }
    } else if (updated.enabled) {
      // If enabled and other settings changed, restart to apply new settings
      this.restart();
    }
  }

  /**
   * Start local network discovery
   */
  async start(): Promise<void> {
    if (!this._settings().enabled) {
      return;
    }

    // Detect networks first
    await this.detectNetworks();
    
    // Add a small delay before first scan to ensure network stack is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Perform initial scan
    await this.scan();
    
    // Set up periodic scanning
    this.scheduleNextScan();
  }

  /**
   * Stop local network discovery
   */
  stop(): void {
    if (this.refreshIntervalId !== null) {
      clearTimeout(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    
    // Clear local servers from store
    this.serversStore.setLocalServers([]);
  }

  /**
   * Restart local network discovery (stop and start)
   */
  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  /**
   * Perform a single scan of the local network
   * @param force If true, scan even if auto-discovery is disabled
   */
  async scan(force: boolean = false): Promise<void> {
    if (this._scanning()) {
      console.log('[LocalNetworkDiscoveryService] Scan already in progress, skipping');
      return;
    }

    const settings = this._settings();
    if (!settings.enabled && !force) {
      console.log('[LocalNetworkDiscoveryService] Discovery disabled and not forced, skipping scan');
      return;
    }

    this._scanning.set(true);
    
    try {
      const servers = await window.electron.discoverLocalServers({
        portRangeStart: settings.portRangeStart,
        portRangeEnd: settings.portRangeEnd,
        scanTimeout: settings.scanTimeout,
        maxConcurrent: settings.maxConcurrent
      });
      
      // Query each discovered server for full information
      const fullServerInfo: OdalPapi.ServerInfo[] = [];
      for (const server of servers) {
        try {
          const result = await this.odalPapi.queryGameServer({
            ip: server.address.ip,
            port: server.address.port
          });
          // Use the ping from the full OdalPapi query (more accurate, includes server processing time)
          if (result.pong) {
            result.server.ping = result.pong;
          }
          fullServerInfo.push(result.server);
        } catch (err) {
          // If query fails, use the basic info we have
          fullServerInfo.push(server as OdalPapi.ServerInfo);
        }
      }
      
      // Update store with discovered servers
      this.serversStore.setLocalServers(fullServerInfo);
      
      this._lastScanTime.set(new Date());
    } catch (err) {
      console.error('[LocalNetworkDiscoveryService] Scan failed:', err);
    } finally {
      this._scanning.set(false);
    }
  }

  /**
   * Detect available network interfaces
   */
  async detectNetworks(): Promise<void> {
    try {
      const networks = await window.electron.getLocalNetworks();
      this._detectedNetworks.set(networks);
    } catch (err) {
      console.error('[LocalNetworkDiscoveryService] Failed to detect networks:', err);
      this._detectedNetworks.set([]);
    }
  }

  /**
   * Schedule the next scan
   */
  private scheduleNextScan(): void {
    const settings = this._settings();
    
    if (this.refreshIntervalId !== null) {
      clearTimeout(this.refreshIntervalId);
    }

    this.refreshIntervalId = window.setTimeout(() => {
      if (settings.enabled) {
        this.scan().then(() => {
          this.scheduleNextScan();
        });
      }
    }, settings.refreshInterval * 1000);
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): LocalNetworkDiscoverySettings {
    try {
      const enabled = localStorage.getItem('localDiscoveryEnabled');
      const portRangeStart = localStorage.getItem('localDiscoveryPortStart');
      const portRangeEnd = localStorage.getItem('localDiscoveryPortEnd');
      const scanTimeout = localStorage.getItem('localDiscoveryScanTimeout');
      const refreshInterval = localStorage.getItem('localDiscoveryRefreshInterval');
      const maxConcurrent = localStorage.getItem('localDiscoveryMaxConcurrent');
      
      return {
        enabled: enabled !== null ? enabled === 'true' : false, // Off by default
        portRangeStart: portRangeStart !== null ? parseInt(portRangeStart, 10) : 10666,
        portRangeEnd: portRangeEnd !== null ? parseInt(portRangeEnd, 10) : 10675,
        scanTimeout: scanTimeout !== null ? parseInt(scanTimeout, 10) : 200,
        refreshInterval: refreshInterval !== null ? parseInt(refreshInterval, 10) : 60, // 60 seconds
        maxConcurrent: maxConcurrent !== null ? parseInt(maxConcurrent, 10) : 50
      };
    } catch (err) {
      console.warn('[LocalNetworkDiscoveryService] Failed to load settings from localStorage:', err);
      // Return defaults if localStorage fails
      return {
        enabled: false,
        portRangeStart: 10666,
        portRangeEnd: 10675,
        scanTimeout: 200,
        refreshInterval: 60,
        maxConcurrent: 50
      };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: LocalNetworkDiscoverySettings): void {
    try {
      localStorage.setItem('localDiscoveryEnabled', String(settings.enabled));
      localStorage.setItem('localDiscoveryPortStart', String(settings.portRangeStart));
      localStorage.setItem('localDiscoveryPortEnd', String(settings.portRangeEnd));
      localStorage.setItem('localDiscoveryScanTimeout', String(settings.scanTimeout));
      localStorage.setItem('localDiscoveryRefreshInterval', String(settings.refreshInterval));
      localStorage.setItem('localDiscoveryMaxConcurrent', String(settings.maxConcurrent));
    } catch (err) {
      console.warn('[LocalNetworkDiscoveryService] Failed to save settings to localStorage:', err);
    }
  }
}
