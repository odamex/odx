import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { NetworkStatusService, NotificationService } from '@shared/services';

/**
 * Status of Odamex online services
 */
export interface OdamexServiceStatus {
  /** Whether the master server is reachable */
  masterAvailable: boolean;
  /** Last time the master server was checked */
  lastChecked: Date | null;
  /** Whether a check is currently in progress */
  checkInProgress: boolean;
  /** Last error message if check failed */
  lastError: string | null;
}

/**
 * Overall connection status combining network and service availability
 */
export type ConnectionStatus = 
  | 'online'      // Online and services available
  | 'offline'     // No internet connection
  | 'degraded';   // Online but services unavailable

/**
 * Service to monitor Odamex online services availability
 * 
 * Tracks master server connectivity and provides status indicators.
 * Automatically checks service status when network comes online.
 */
@Injectable({
  providedIn: 'root'
})
export class OdamexServiceStatusService {
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly notificationService = inject(NotificationService);
  
  private readonly MASTER_SERVER = 'master1.odamex.net';
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private checkTimer: any = null;
  private previousStatus: ConnectionStatus | null = null; // Track previous status for notifications
  private statusChangeCount = 0; // Count status changes - only notify after the first change

  private readonly _serviceStatus = signal<OdamexServiceStatus>({
    masterAvailable: false,
    lastChecked: null,
    checkInProgress: false,
    lastError: null
  });

  /** Current service status */
  readonly serviceStatus = this._serviceStatus.asReadonly();

  /** Computed overall connection status */
  readonly connectionStatus = computed<ConnectionStatus>(() => {
    const network = this.networkStatus.isOnline();
    const service = this._serviceStatus();

    if (!network) {
      return 'offline';
    }

    // If we haven't checked yet or master is unavailable, show degraded
    if (service.lastChecked === null || !service.masterAvailable) {
      return 'degraded';
    }

    return 'online';
  });

  /** Computed status message for UI display */
  readonly statusMessage = computed(() => {
    const status = this.connectionStatus();
    const service = this._serviceStatus();

    switch (status) {
      case 'online':
        return 'Connected to Odamex Online Services';
      case 'offline':
        return 'No internet connection';
      case 'degraded':
        return service.lastError || 'Odamex services unavailable';
    }
  });

  /** Computed status icon */
  readonly statusIcon = computed(() => {
    const status = this.connectionStatus();
    switch (status) {
      case 'online':
        return 'bi-check-circle-fill text-success';
      case 'offline':
        return 'bi-wifi-off text-muted';
      case 'degraded':
        return 'bi-exclamation-triangle-fill text-danger';
    }
  });

  constructor() {
    // Check service status when network comes online
    effect(() => {
      const online = this.networkStatus.isOnline();
      if (online) {
        console.log('[OdamexServiceStatus] Network online, checking services');
        // Use untracked to prevent infinite loop
        untracked(() => this.checkServiceStatus());
      } else {
        console.log('[OdamexServiceStatus] Network offline');
        this._serviceStatus.update(s => ({
          ...s,
          masterAvailable: false,
          lastError: 'No internet connection'
        }));
      }
    });

    // Start periodic checks
    this.startPeriodicChecks();

    // Log status changes and update tray
    effect(() => {
      const status = this.connectionStatus();
      const message = this.statusMessage();
      console.log(`[OdamexServiceStatus] Status changed: ${status} - ${message}`);
      
      // Track status changes
      if (this.previousStatus !== null && this.previousStatus !== status) {
        this.statusChangeCount++;
        console.log(`[OdamexServiceStatus] Status change #${this.statusChangeCount}`);
      }
      
      // Only send notifications after the first status change (skip initial startup transition)
      if (this.statusChangeCount > 1) {
        untracked(() => {
          if (status === 'degraded' && this.previousStatus !== 'degraded') {
            this.notificationService.show(
              'Odamex Services Degraded',
              'Connection to Odamex services is experiencing issues. Server browser may be unavailable.',
              'update'
            );
          } else if (status === 'online' && this.previousStatus === 'degraded') {
            this.notificationService.show(
              'Odamex Services Restored',
              'Connection to Odamex services has been restored.',
              'update'
            );
          }
        });
      }
      
      // Update previous status for next comparison
      this.previousStatus = status;
      
      // Update tray icon whenever status changes
      untracked(() => this.updateTrayIcon(status));
    });
  }

  /**
   * Manually check service availability
   * 
   * @returns Promise resolving to true if services are available
   */
  async checkServiceStatus(): Promise<boolean> {
    // Don't run multiple checks simultaneously
    if (this._serviceStatus().checkInProgress) {
      console.log('[OdamexServiceStatus] Check already in progress, skipping');
      return this._serviceStatus().masterAvailable;
    }

    // Can't check if offline
    if (this.networkStatus.isOffline()) {
      this._serviceStatus.update(s => ({
        ...s,
        masterAvailable: false,
        lastError: 'No internet connection'
      }));
      return false;
    }

    console.log('[OdamexServiceStatus] Starting master server check...');
    this._serviceStatus.update(s => ({ ...s, checkInProgress: true }));

    try {
      // Try to query the master server
      const result = await window.electron.odalPapi.queryMaster(this.MASTER_SERVER);
      
      const available = Array.isArray(result) && result.length >= 0;
      
      this._serviceStatus.set({
        masterAvailable: available,
        lastChecked: new Date(),
        checkInProgress: false,
        lastError: null
      });

      console.log(`[OdamexServiceStatus] Master server check: ${available ? 'available' : 'unavailable'}`);
      return available;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      this._serviceStatus.set({
        masterAvailable: false,
        lastChecked: new Date(),
        checkInProgress: false,
        lastError: message
      });

      console.warn('[OdamexServiceStatus] Master server check failed:', message);
      return false;
    }
  }

  /**
   * Start periodic service checks
   */
  private startPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      if (this.networkStatus.isOnline()) {
        this.checkServiceStatus();
      }
    }, this.CHECK_INTERVAL);

    // Initial check - do it almost immediately
    if (this.networkStatus.isOnline()) {
      setTimeout(() => this.checkServiceStatus(), 100);
    }
  }

  /**
   * Stop periodic service checks
   */
  stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Update tray icon based on connection status
   */
  private updateTrayIcon(status: ConnectionStatus): void {
    const message = this.statusMessage();
    console.log(`[OdamexServiceStatus] Updating tray icon: ${status} - ${message}`);
    
    try {
      if (window.electron.updateTrayIcon) {
        window.electron.updateTrayIcon(status);
        console.log('[OdamexServiceStatus] updateTrayIcon called successfully');
      } else {
        console.warn('[OdamexServiceStatus] updateTrayIcon method not available');
      }
      
      if (window.electron.updateTrayTooltip) {
        window.electron.updateTrayTooltip(`ODX - ${message}`);
        console.log('[OdamexServiceStatus] updateTrayTooltip called successfully');
      } else {
        console.warn('[OdamexServiceStatus] updateTrayTooltip method not available');
      }
    } catch (error) {
      console.error('[OdamexServiceStatus] Error updating tray:', error);
    }
  }

  /**
   * Force set service status (useful for testing)
   */
  setServiceAvailable(available: boolean): void {
    this._serviceStatus.update(s => ({
      ...s,
      masterAvailable: available,
      lastChecked: new Date(),
      lastError: available ? null : 'Manually set unavailable'
    }));
  }

  /**
   * Test overlay icons (for debugging)
   */
  testOverlayIcons(): void {
    console.log('[OdamexServiceStatus] Testing overlay icons...');
    
    // Test all three states
    setTimeout(() => {
      console.log('[OdamexServiceStatus] Testing: online');
      this.updateTrayIcon('online');
    }, 1000);
    
    setTimeout(() => {
      console.log('[OdamexServiceStatus] Testing: degraded');
      this.updateTrayIcon('degraded');
    }, 3000);
    
    setTimeout(() => {
      console.log('[OdamexServiceStatus] Testing: offline');
      this.updateTrayIcon('offline');
    }, 5000);
    
    setTimeout(() => {
      console.log('[OdamexServiceStatus] Test complete, restoring actual status');
      this.updateTrayIcon(this.connectionStatus());
    }, 7000);
  }
}
