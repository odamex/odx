import { Injectable, inject, signal, effect, DestroyRef } from '@angular/core';
import { UpdatesService } from '../updates/updates.service';
import { FileManagerService } from '../file-manager/file-manager.service';
import { NotificationService } from '../notification/notification.service';
import { NetworkStatusService } from '../network-status/network-status.service';
import versions from '../../../../_versions';

/**
 * Settings for periodic update checking
 */
export interface PeriodicCheckSettings {
  /** Whether periodic update checks are enabled */
  enabled: boolean;
  /** Interval between update checks in minutes (default: 60) */
  intervalMinutes: number;
}

/**
 * Service for periodic update checking
 * 
 * Checks for Odamex and ODX updates at regular intervals (default: hourly).
 * Shows system notifications when updates are detected.
 */
@Injectable({
  providedIn: 'root'
})
export class PeriodicUpdateService {
  private updatesService = inject(UpdatesService);
  private fileManager = inject(FileManagerService);
  private notificationService = inject(NotificationService);
  private networkStatus = inject(NetworkStatusService);
  private destroyRef = inject(DestroyRef);

  private readonly _settings = signal<PeriodicCheckSettings>(this.loadSettings());
  private checkInterval: any = null;
  private lastOdamexVersion = signal<string | null>(null);
  private lastODXVersion = signal<string>(versions.version);

  readonly settings = this._settings.asReadonly();

  constructor() {
    console.log('[PeriodicUpdate] Service initialized with settings:', this._settings());

    // Setup periodic check effect
    effect(() => {
      this.setupPeriodicCheck();
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    });

    // Load last known versions
    this.loadLastKnownVersions();
  }

  /**
   * Update periodic check settings
   * 
   * @param settings - Partial settings to update (only provided fields will be changed)
   * @example
   * updateSettings({ enabled: false }) // Disable periodic checks
   * updateSettings({ intervalMinutes: 120 }) // Check every 2 hours
   */
  updateSettings(settings: Partial<PeriodicCheckSettings>): void {
    const current = this._settings();
    const updated = { ...current, ...settings };
    
    this._settings.set(updated);
    this.saveSettings(updated);
    
    console.log('[PeriodicUpdate] Settings updated:', updated);
  }

  /**
   * Manually trigger an update check
   * 
   * Bypasses the periodic schedule and immediately checks for updates.
   * Respects offline mode - will skip check if device is offline.
   * 
   * @returns Promise that resolves when check is complete
   */
  async checkNow(): Promise<void> {
    if (this.networkStatus.isOffline()) {
      console.log('[PeriodicUpdate] Skipping check - offline mode');
      return;
    }

    console.log('[PeriodicUpdate] Manual update check triggered');
    await this.performUpdateCheck();
  }

  /**
   * Setup periodic update checking based on current settings
   * 
   * Clears any existing interval and creates a new one if checks are enabled.
   * Called automatically when settings change.
   * 
   * @private
   */
  private setupPeriodicCheck(): void {
    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    const settings = this._settings();
    
    if (!settings.enabled) {
      console.log('[PeriodicUpdate] Periodic checks disabled');
      return;
    }

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    console.log(`[PeriodicUpdate] Setting up periodic check every ${settings.intervalMinutes} minutes`);

    this.checkInterval = setInterval(() => {
      this.performUpdateCheck();
    }, intervalMs);
  }

  /**
   * Perform an update check for both Odamex and ODX
   * 
   * Checks for new versions and shows notifications if updates are detected.
   * Only notifies if the version has changed since the last check.
   * Respects offline mode and user notification preferences.
   * 
   * @private
   * @returns Promise that resolves when check is complete
   */
  private async performUpdateCheck(): Promise<void> {
    if (this.networkStatus.isOffline()) {
      console.log('[PeriodicUpdate] Skipping check - offline mode');
      return;
    }

    console.log('[PeriodicUpdate] Performing periodic update check');

    try {
      // Check for Odamex updates
      const updateInfo = await this.updatesService.checkForUpdates();
      
      if (updateInfo.available && updateInfo.latestVersion) {
        const lastVersion = this.lastOdamexVersion();
        
        // Only notify if this is a new version we haven't seen before
        if (lastVersion !== updateInfo.latestVersion) {
          console.log(`[PeriodicUpdate] New Odamex version detected: ${updateInfo.latestVersion}`);
          
          this.notificationService.show(
            'Odamex Update Available',
            `Version ${updateInfo.latestVersion} is now available. Current: ${updateInfo.currentVersion}`,
            'update'
          );
          
          this.lastOdamexVersion.set(updateInfo.latestVersion);
          this.saveLastKnownVersions();
        }
      }

      // Check for ODX updates
      // Note: This requires checking GitHub releases for the ODX repository
      // For now, we'll just log that we should check it
      // TODO: Implement ODX version checking against GitHub releases
      console.log('[PeriodicUpdate] ODX update check not yet implemented');
      
    } catch (err) {
      console.error('[PeriodicUpdate] Failed to check for updates:', err);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): PeriodicCheckSettings {
    try {
      const enabled = localStorage.getItem('periodicUpdateCheckEnabled');
      const intervalMinutes = localStorage.getItem('periodicUpdateCheckInterval');
      
      return {
        enabled: enabled !== null ? enabled === 'true' : true,
        intervalMinutes: intervalMinutes !== null ? parseInt(intervalMinutes, 10) : 60 // Default: 1 hour
      };
    } catch (err) {
      console.warn('[PeriodicUpdate] Failed to load settings from localStorage:', err);
      return {
        enabled: true,
        intervalMinutes: 60
      };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: PeriodicCheckSettings): void {
    try {
      localStorage.setItem('periodicUpdateCheckEnabled', String(settings.enabled));
      localStorage.setItem('periodicUpdateCheckInterval', String(settings.intervalMinutes));
    } catch (err) {
      console.warn('[PeriodicUpdate] Failed to save settings to localStorage:', err);
    }
  }

  /**
   * Load last known versions from localStorage
   */
  private loadLastKnownVersions(): void {
    try {
      const odamexVersion = localStorage.getItem('lastKnownOdamexVersion');
      if (odamexVersion) {
        this.lastOdamexVersion.set(odamexVersion);
      }
    } catch (err) {
      console.warn('[PeriodicUpdate] Failed to load last known versions:', err);
    }
  }

  /**
   * Save last known versions to localStorage
   */
  private saveLastKnownVersions(): void {
    try {
      const odamexVersion = this.lastOdamexVersion();
      if (odamexVersion) {
        localStorage.setItem('lastKnownOdamexVersion', odamexVersion);
      }
    } catch (err) {
      console.warn('[PeriodicUpdate] Failed to save last known versions:', err);
    }
  }
}
