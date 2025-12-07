import { Injectable, inject, effect, signal, DestroyRef } from '@angular/core';
import { OdalPapiService, NotificationService, OdalPapi } from '@shared/services';
import { ServersStore } from '@app/store';

@Injectable({ providedIn: 'root' })
export class ServerRefreshService {
  private odalPapi = inject(OdalPapiService);
  private store = inject(ServersStore);
  private destroyRef = inject(DestroyRef);
  private notificationService = inject(NotificationService);

  private autoRefreshEnabled = signal(true);
  private autoRefreshMinutes = signal(5);
  private autoRefreshInterval: any = null;
  private isRefreshing = false;
  private abortController: AbortController | null = null;
  private previousServerSnapshot: Map<string, number> = new Map(); // Track player counts
  private readonly MAX_CONCURRENT_QUERIES = 10; // Limit concurrent server queries

  constructor() {
    // Load settings from localStorage with error handling
    try {
      const savedAutoRefresh = localStorage.getItem('autoRefreshEnabled');
      if (savedAutoRefresh !== null) {
        this.autoRefreshEnabled.set(savedAutoRefresh === 'true');
      }

      const savedAutoRefreshMinutes = localStorage.getItem('autoRefreshMinutes');
      if (savedAutoRefreshMinutes !== null) {
        const minutes = parseInt(savedAutoRefreshMinutes, 10);
        if (!isNaN(minutes) && minutes > 0) {
          this.autoRefreshMinutes.set(minutes);
        }
      }
    } catch (err) {
      console.warn('Failed to load settings from localStorage:', err);
      // Continue with defaults if localStorage is unavailable
    }

    // Setup auto-refresh effect
    effect(() => {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
      }

      if (this.autoRefreshEnabled()) {
        const minutes = this.autoRefreshMinutes();
        this.autoRefreshInterval = setInterval(() => {
          this.refreshServers();
        }, minutes * 60 * 1000);
      }
    });

    // Cleanup interval and abort any in-progress requests on service destroy
    this.destroyRef.onDestroy(() => {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
      }
      this.cancelRefresh();
    });
  }

  // Public methods to read settings
  isEnabled(): boolean {
    return this.autoRefreshEnabled();
  }

  getMinutes(): number {
    return this.autoRefreshMinutes();
  }

  // Update settings (called from settings component)
  setEnabled(enabled: boolean) {
    this.autoRefreshEnabled.set(enabled);
    try {
      localStorage.setItem('autoRefreshEnabled', String(enabled));
    } catch (err) {
      console.warn('Failed to save auto-refresh setting to localStorage:', err);
    }
  }

  setMinutes(minutes: number) {
    if (minutes > 0) {
      this.autoRefreshMinutes.set(minutes);
      try {
        localStorage.setItem('autoRefreshMinutes', String(minutes));
      } catch (err) {
        console.warn('Failed to save auto-refresh minutes to localStorage:', err);
      }
    }
  }

  // Cancel any in-progress refresh
  cancelRefresh(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Manual refresh method (called from servers component)
  async refreshServers(): Promise<void> {
    // Cancel any existing refresh
    this.cancelRefresh();

    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    // Don't show loading overlay - we'll update servers progressively
    this.store.clearError();

    // Create new abort controller for this refresh
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // Query the master server
      const masterList = await this.odalPapi.queryMasterServer('master1.odamex.net');

      // Check if cancelled
      if (signal.aborted) {
        return;
      }

      if (masterList.length === 0) {
        this.store.setError('No servers returned from master server');
        return;
      }

      // Query game servers with progressive updates
      await this.queryServersWithProgressiveUpdate(masterList, signal);

    } catch (err: any) {
      // Don't show error if manually cancelled
      if (err.name !== 'AbortError' && !signal.aborted) {
        console.error('Failed to refresh servers:', err);
        this.store.setError(err.message || 'Failed to query master server');
      }
    } finally {
      this.isRefreshing = false;
      this.abortController = null;
    }
  }

  /**
   * Query servers with progressive updates - shows results as they come in
   */
  private async queryServersWithProgressiveUpdate(
    serverList: OdalPapi.MasterResponse[],
    signal: AbortSignal
  ): Promise<void> {
    const CONCURRENT_QUERIES = 10;
    const results: (OdalPapi.ServerInfo | null)[] = new Array(serverList.length);
    const inProgress = new Set<Promise<void>>();
    let completedCount = 0;

    for (let i = 0; i < serverList.length; i++) {
      // Check if cancelled
      if (signal.aborted) {
        return;
      }

      // Wait if we've hit the concurrency limit
      while (inProgress.size >= CONCURRENT_QUERIES) {
        await Promise.race(inProgress);
      }

      const index = i;
      const serverAddr = serverList[i];

      const promise = (async () => {
        try {
          const { server, pong } = await this.odalPapi.queryGameServer(serverAddr);
          server.ping = pong;
          results[index] = server;

          // Update store progressively (every 5 servers or on completion)
          completedCount++;
          if (completedCount % 5 === 0 || completedCount === serverList.length) {
            const validServers = results.filter((s): s is OdalPapi.ServerInfo => s !== null && s.responded);
            if (validServers.length > 0) {
              this.checkForPlayerActivity(validServers);
              this.store.setServers(validServers);
              this.pingAllServers(validServers);
            }
          }
        } catch (err) {
          results[index] = null;
        }
      })();

      inProgress.add(promise);
      promise.finally(() => inProgress.delete(promise));
    }

    // Wait for all queries to complete
    await Promise.all(inProgress);

    // Final update with all valid servers
    const validServers = results.filter((s): s is OdalPapi.ServerInfo => s !== null && s.responded);
    if (validServers.length === 0) {
      this.store.setError('No valid servers found. All servers timed out or returned invalid responses.');
    } else {
      this.checkForPlayerActivity(validServers);
      this.store.setServers(validServers);
      this.pingAllServers(validServers);
    }
  }

  /**
   * Query servers with concurrency limit to prevent socket exhaustion
   */
  private async queryServersWithLimit(
    serverList: OdalPapi.MasterResponse[],
    signal: AbortSignal
  ): Promise<(OdalPapi.ServerInfo | null)[]> {
    const results: (OdalPapi.ServerInfo | null)[] = [];
    const queue = [...serverList];
    const inProgress = new Set<Promise<void>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Check if cancelled
      if (signal.aborted) {
        return results;
      }

      // Fill up to max concurrent queries
      while (inProgress.size < this.MAX_CONCURRENT_QUERIES && queue.length > 0) {
        const serverAddr = queue.shift()!;
        const index = serverList.indexOf(serverAddr);

        const promise = (async () => {
          try {
            const { server, pong } = await this.odalPapi.queryGameServer(serverAddr);
            server.ping = pong;
            results[index] = server;
          } catch (err) {
            console.warn(`Failed to query server ${serverAddr.ip}:${serverAddr.port}:`, err);
            results[index] = null;
          }
        })();

        inProgress.add(promise);
        promise.finally(() => inProgress.delete(promise));
      }

      // Wait for at least one to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  private pingAllServers(servers: OdalPapi.ServerInfo[]): void {
    servers.forEach(server => {
      this.odalPapi.pingGameServer(server.address, (ping) => {
        this.store.updateServerPing(server.address, ping);
      });
    });
  }

  /**
   * Checks if a server should be visible based on user filter settings
   */
  private shouldIncludeServer(server: OdalPapi.ServerInfo): boolean {
    try {
      // Check version filtering
      const filterByVersion = localStorage.getItem('filterByVersion') === 'true';
      if (filterByVersion) {
        const clientVersion = localStorage.getItem('currentVersion');
        if (clientVersion) {
          const [clientMajor, clientMinor] = clientVersion.split('.').map(Number);
          
          // Major version must match
          if (server.versionMajor !== clientMajor) return false;
          
          // Server minor version must be <= client minor version
          if (server.versionMinor !== null && server.versionMinor > clientMinor) return false;
        }
      }

      // Check hide empty filter
      const hideEmpty = localStorage.getItem('hideEmpty') === 'true';
      if (hideEmpty && server.players.length === 0) return false;

      // Check max ping filter
      const maxPing = localStorage.getItem('maxPing');
      if (maxPing) {
        const threshold = parseInt(maxPing, 10);
        if (!isNaN(threshold) && threshold > 0 && server.ping > threshold) return false;
      }

      return true;
    } catch (err) {
      // If there's any error reading settings, include the server
      return true;
    }
  }

  private checkForPlayerActivity(servers: OdalPapi.ServerInfo[]): void {
    let activityDetected = false;
    const notifications: string[] = [];

    // Filter servers based on user's visibility settings
    const visibleServers = servers.filter(server => this.shouldIncludeServer(server));

    for (const server of visibleServers) {
      const serverKey = `${server.address.ip}:${server.address.port}`;
      const currentPlayers = server.players.length;
      const previousPlayers = this.previousServerSnapshot.get(serverKey);

      // Check if this is a new server
      if (previousPlayers === undefined) {
        if (currentPlayers > 0) {
          notifications.push(`New server: ${server.name} (${currentPlayers} players)`);
        }
      }
      // If we have a previous snapshot and player count changed
      else if (previousPlayers !== currentPlayers) {
        activityDetected = true;
        const change = currentPlayers - previousPlayers;
        const action = change > 0 ? 'joined' : 'left';
        const count = Math.abs(change);
        notifications.push(`${server.name}: ${count} player(s) ${action}`);
      }

      // Update snapshot
      this.previousServerSnapshot.set(serverKey, currentPlayers);
    }

    // Show notifications and flash taskbar if activity detected
    if (activityDetected || notifications.length > 0) {
      try {
        window.electron.flashWindow();
        
        // Show a single notification with all activity
        if (notifications.length > 0) {
          const title = notifications.length === 1 ? 'Server Activity' : `Server Activity (${notifications.length})`;
          let body = notifications.slice(0, 3).join('\n'); // Show first 3 notifications
          if (notifications.length > 3) {
            body += `\n... and ${notifications.length - 3} more`;
          }
          
          this.notificationService.show(title, body, 'server-activity');
        }
      } catch (err) {
        console.warn('Failed to show notification:', err);
      }
    }
  }
}
