import { Injectable, inject } from '@angular/core';
import { FileManagerStore } from './file-manager.store';
import { NetworkStatusService } from '../network-status/network-status.service';

export interface InstallationInfo {
  installed: boolean;
  version: string | null;
  path: string | null;
  clientPath: string | null;
  serverPath: string | null;
  source: 'odx' | 'system' | 'custom' | 'none';
  systemInstallPath: string | null;
  needsUpdate: boolean;
  latestVersion: string | null;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface DirectoryInfo {
  odx: string;
  bin: string;
  wads: string;
  config: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
  private store = inject(FileManagerStore);
  private networkStatus = inject(NetworkStatusService);

  // Expose store signals
  readonly downloadProgress = this.store.downloadProgress;
  readonly installationInfo = this.store.installationInfo;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  
  // Session-level cache for release data
  private latestReleaseCache: any = null;
  private installationInfoCache: InstallationInfo | null = null;

  constructor() {
    // Listen for download progress events from main process
    if (window.electron?.fileManager?.onDownloadProgress) {
      window.electron.fileManager.onDownloadProgress((progress: DownloadProgress) => {
        this.store.setDownloadProgress(progress);
      });
    }
  }

  /**
   * Clear the download progress
   */
  clearDownloadProgress(): void {
    this.store.clearDownloadProgress();
  }

  /**
   * Get information about the current Odamex installation
   * @param customPath - Optional custom installation path
   * @param forceRefresh - Force refresh even if cached
   */
  async getInstallationInfo(customPath?: string, forceRefresh = false): Promise<InstallationInfo> {
    // Return cached data if available and no custom path (custom paths should always refresh)
    if (!forceRefresh && !customPath && this.installationInfoCache) {
      return this.installationInfoCache;
    }
    
    this.store.setLoading(true);
    try {
      const info = await window.electron.fileManager.getInstallationInfo(customPath);
      this.store.setInstallationInfo(info);
      
      // Cache only for default path
      if (!customPath) {
        this.installationInfoCache = info;
      }
      
      return info;
    } catch (err) {
      this.store.setError('Failed to get installation info');
      throw err;
    }
  }

  /**
   * Check if an update is available
   * @param currentVersion - Current installed version
   */
  async checkForUpdates(currentVersion: string | null): Promise<{ needsUpdate: boolean; latestVersion: string | null }> {
    // Skip update check if offline
    if (this.networkStatus.isOffline()) {
      console.log('[FileManager] Skipping update check - offline mode');
      return { needsUpdate: false, latestVersion: currentVersion };
    }
    
    return this.networkStatus.withOfflineHandling(
      () => window.electron.fileManager.checkForUpdates(currentVersion),
      { needsUpdate: false, latestVersion: currentVersion }
    );
  }

  /**
   * Compare two version strings
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  async compareVersions(v1: string, v2: string): Promise<number> {
    return window.electron.fileManager.compareVersions(v1, v2);
  }

  /**
   * Get the latest release from GitHub
   * Uses session-level cache to avoid redundant API calls
   */
  async getLatestRelease() {
    // Return cached data if available
    if (this.latestReleaseCache) {
      return this.latestReleaseCache;
    }
    
    // Skip if offline
    if (this.networkStatus.isOffline()) {
      console.log('[FileManager] Cannot fetch releases - offline mode');
      return null;
    }
    
    try {
      const release = await this.networkStatus.withOfflineHandling(
        () => window.electron.fileManager.getLatestRelease(),
        null
      );
      
      if (release) {
        this.latestReleaseCache = release;
      }
      
      return release;
    } catch (error) {
      console.error('[FileManager] Failed to fetch latest release:', error);
      return null;
    }
  }
  
  /**
   * Clear the release cache (useful after installation/update)
   */
  clearReleaseCache(): void {
    this.latestReleaseCache = null;
    this.installationInfoCache = null;
  }

  /**
   * Get all releases from GitHub
   */
  async getAllReleases() {
    // Skip if offline
    if (this.networkStatus.isOffline()) {
      console.log('[FileManager] Cannot fetch releases - offline mode');
      return [];
    }
    
    return this.networkStatus.withOfflineHandling(
      () => window.electron.fileManager.getAllReleases(),
      []
    );
  }

  /**
   * Download a file from URL
   * @param url - The URL to download from
   * @param filename - The filename to save as
   * @returns Path to the downloaded file
   */
  async downloadFile(url: string, filename: string): Promise<string> {
    return window.electron.fileManager.download(url, filename);
  }

  /**
   * Extract a ZIP file to the bin directory
   * @param zipPath - Path to the ZIP file
   */
  async extractZip(zipPath: string): Promise<void> {
    return window.electron.fileManager.extractZip(zipPath);
  }

  /**
   * Run the Windows installer silently (Windows only)
   * @param installerPath - Path to the installer EXE
   * @param installDir - Optional custom installation directory
   */
  async runInstaller(installerPath: string, installDir?: string): Promise<void> {
    return window.electron.fileManager.runInstaller(installerPath, installDir);
  }

  /**
   * Find the installer asset from a release
   * @param release - Release object from GitHub API
   * @returns The installer filename or null if not found
   */
  async findInstallerAsset(release: any): Promise<string | null> {
    return window.electron.fileManager.findInstallerAsset(release);
  }

  /**
   * Save version information to version.txt
   * @param version - Version string to save
   */
  async saveVersion(version: string): Promise<void> {
    return window.electron.fileManager.saveVersion(version);
  }

  /**
   * Get all directory paths
   */
  async getDirectories(): Promise<DirectoryInfo> {
    return window.electron.fileManager.getDirectories();
  }

  /**
   * List all WAD files in the wads directory
   */
  async listWadFiles(): Promise<string[]> {
    return window.electron.fileManager.listWads();
  }

  /**
   * Open a directory in the system file explorer
   * @param dirPath - Path to the directory
   */
  async openDirectory(dirPath: string): Promise<void> {
    return window.electron.fileManager.openDirectory(dirPath);
  }

  /**
   * Get the platform-specific asset name for download
   */
  async getPlatformAssetName(): Promise<string> {
    return window.electron.fileManager.getPlatformAsset();
  }

  /**
   * Check if the user has completed first run configuration
   */
  async hasConfiguredInstallation(): Promise<boolean> {
    return window.electron.fileManager.hasConfiguredInstallation();
  }

  /**
   * Save the user's first run installation choice
   * @param source - The installation source: 'odx', 'system', or 'custom'
   * @param customPath - Optional custom installation path (for 'custom' source)
   */
  async saveFirstRunChoice(source: 'odx' | 'system' | 'custom', customPath?: string): Promise<void> {
    return window.electron.fileManager.saveFirstRunChoice(source, customPath);
  }

  /**
   * Reset the first run configuration
   */
  async resetFirstRunConfig(): Promise<void> {
    return window.electron.fileManager.resetFirstRunConfig();
  }

  /**
   * Launch Odamex client with optional command line arguments
   * @param args - Command line arguments (e.g., ['+connect', 'ip:port'])
   */
  async launchOdamex(args: string[] = []): Promise<void> {
    return window.electron.fileManager.launchOdamex(args);
  }
}
