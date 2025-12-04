import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { SplashService } from '../../../core/splash/splash.service';

/**
 * Information about an available update
 */
export interface UpdateInfo {
  /** Version number of the update (e.g., "1.2.3") */
  version: string;
  /** Release notes in markdown format */
  releaseNotes?: string;
  /** ISO 8601 date string of the release */
  releaseDate: string;
}

/**
 * Progress information for an ongoing download
 */
export interface UpdateProgress {
  /** Download progress percentage (0-100) */
  percent: number;
  /** Current download speed in bytes per second */
  bytesPerSecond: number;
  /** Number of bytes transferred so far */
  transferred: number;
  /** Total size of the download in bytes */
  total: number;
}

/**
 * Current state of the auto-update process
 * 
 * - `idle` - No update activity
 * - `checking` - Checking for updates
 * - `available` - Update is available for download
 * - `downloading` - Update is being downloaded
 * - `downloaded` - Update is ready to install
 * - `installing` - Update is being installed
 * - `error` - An error occurred during the update process
 */
export type UpdateState = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

/**
 * Service for managing ODX auto-updates
 * 
 * Handles the complete update lifecycle:
 * 1. Check for updates (background or manual)
 * 2. Download update (manual trigger)
 * 3. Show splash with "Updating..." when user triggers install
 * 4. Quit and install (app restarts automatically)
 */
@Injectable({
  providedIn: 'root'
})
export class AutoUpdateService {
  private splashService = inject(SplashService);
  private destroyRef = inject(DestroyRef);

  private readonly _state = signal<UpdateState>('idle');
  private readonly _updateInfo = signal<UpdateInfo | null>(null);
  private readonly _downloadProgress = signal<UpdateProgress | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly updateInfo = this._updateInfo.asReadonly();
  readonly downloadProgress = this._downloadProgress.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    if (!window.electron) {
      console.warn('[AutoUpdate] Electron API not available');
      return;
    }

    this.setupListeners();
  }

  /**
   * Manually check for updates
   */
  checkForUpdates(): void {
    console.log('[AutoUpdate] Checking for updates...');
    this._state.set('checking');
    this._error.set(null);
    window.electron.checkForUpdates();
  }

  /**
   * Download the available update
   */
  downloadUpdate(): void {
    if (this._state() !== 'available') {
      console.warn('[AutoUpdate] No update available to download');
      return;
    }

    console.log('[AutoUpdate] Starting download...');
    this._state.set('downloading');
    window.electron.downloadUpdate();
  }

  /**
   * Install update and restart app
   * Shows splash screen with "Updating..." message
   */
  async installAndRestart(): Promise<void> {
    if (this._state() !== 'downloaded') {
      console.warn('[AutoUpdate] Update not downloaded yet');
      return;
    }

    console.log('[AutoUpdate] Installing update and restarting...');
    this._state.set('installing');

    // Show splash screen with updating message
    this.splashService.show();
    this.splashService.setMessages('Updating ODX...', 'Installing new version');
    this.splashService.setProgress(null); // Indeterminate progress

    // Brief delay to ensure splash is visible
    await this.delay(500);

    // Trigger quit and install
    try {
      await window.electron.quitAndInstall();
      // App will quit and restart with new version
    } catch (err) {
      console.error('[AutoUpdate] Failed to install:', err);
      this._error.set('Failed to install update');
      this._state.set('error');
      this.splashService.hide();
    }
  }

  /**
   * Dismiss the update (user can update later)
   */
  dismissUpdate(): void {
    console.log('[AutoUpdate] Update dismissed');
    this._state.set('idle');
    this._updateInfo.set(null);
    this._downloadProgress.set(null);
  }

  /**
   * Setup listeners for update events from Electron
   */
  private setupListeners(): void {
    // Checking for update
    window.electron.onUpdateChecking(() => {
      console.log('[AutoUpdate] Checking for updates...');
      this._state.set('checking');
    });

    // Update available
    window.electron.onUpdateAvailable((info: any) => {
      console.log('[AutoUpdate] Update available:', info);
      this._state.set('available');
      this._updateInfo.set({
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      });
    });

    // Update not available
    window.electron.onUpdateNotAvailable((info: any) => {
      console.log('[AutoUpdate] No updates available');
      this._state.set('idle');
    });

    // Download progress
    window.electron.onUpdateDownloadProgress((progress: any) => {
      console.log('[AutoUpdate] Download progress:', progress.percent.toFixed(2) + '%');
      this._state.set('downloading');
      this._downloadProgress.set({
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    });

    // Update downloaded
    window.electron.onUpdateDownloaded((info: any) => {
      console.log('[AutoUpdate] Update downloaded:', info);
      this._state.set('downloaded');
      this._downloadProgress.set(null);
    });

    // Update error
    window.electron.onUpdateError((err: any) => {
      console.error('[AutoUpdate] Update error:', err);
      this._state.set('error');
      this._error.set(err.message || 'Unknown update error');
    });

    // Cleanup listeners on destroy
    this.destroyRef.onDestroy(() => {
      // Electron listeners are automatically cleaned up when window closes
      console.log('[AutoUpdate] Service destroyed');
    });
  }

  /**
   * Format bytes to human-readable string
   * 
   * @param bytes - Number of bytes to format
   * @returns Formatted string (e.g., "1.23 MB")
   * @example
   * formatBytes(1024) // "1.00 KB"
   * formatBytes(1048576) // "1.00 MB"
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Utility method to delay execution
   * 
   * @param ms - Number of milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
