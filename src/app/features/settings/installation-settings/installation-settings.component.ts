import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { 
  FileManagerService, 
  AutoUpdateService
} from '@shared/services';
import versions from '../../../../_versions';

@Component({
  selector: 'app-installation-settings',
  imports: [FormsModule],
  templateUrl: './installation-settings.component.html',
  styleUrls: ['./installation-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstallationSettingsComponent implements OnInit {
  protected fileManager = inject(FileManagerService);
  protected autoUpdateService = inject(AutoUpdateService);

  // Use store signals
  readonly installationInfo = this.fileManager.installationInfo;
  readonly downloadProgress = this.fileManager.downloadProgress;
  readonly storeLoading = this.fileManager.loading;
  readonly storeError = this.fileManager.error;
  readonly directories = this.fileManager.directories;
  readonly customPath = this.fileManager.customPath;
  readonly useCustomPath = this.fileManager.useCustomPath;

  // Local component state
  downloading = signal(false);
  error = signal<string | null>(null);
  initializing = signal(false);
  
  // Debounce timer for custom path updates
  private customPathDebounceTimer?: number;
  
  // Version information
  readonly appVersion = versions.version;
  readonly appVersionDate = new Date(versions.versionDate).toLocaleDateString();
  readonly appCommitHash = versions.gitCommitHash;
  
  // Make Math available in template
  protected readonly Math = Math;

  ngOnInit() {
    // Load data if not already loaded
    if (!this.directories()) {
      this.initializing.set(true);
      this.loadData().finally(() => this.initializing.set(false));
    }
  }

  async loadData() {
    try {
      this.error.set(null);

      const customPathValue = this.useCustomPath() ? this.customPath() : undefined;

      const [info, release, dirs, asset] = await Promise.all([
        this.fileManager.getInstallationInfo(customPathValue),
        this.fileManager.getLatestRelease(),
        this.fileManager.getDirectories(),
        this.fileManager.getPlatformAssetName()
      ]);

      // Check for updates if installed
      if (info.installed && info.version) {
        const updateCheck = await this.fileManager.checkForUpdates(info.version);
        info.needsUpdate = updateCheck.needsUpdate;
        info.latestVersion = updateCheck.latestVersion;
        // Update the store with the enhanced info
        this.fileManager.getInstallationInfo(customPathValue);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      this.error.set('Failed to load installation information');
    }
  }

  async checkForOdamexUpdate() {
    try {
      this.error.set(null);
      const info = this.installationInfo();
      if (info?.version) {
        const updateCheck = await this.fileManager.checkForUpdates(info.version);
        if (updateCheck.needsUpdate) {
          // Update the installation info with the new version information
          await this.loadData();
        }
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      this.error.set('Failed to check for updates');
    }
  }

  async checkForODXUpdate() {
    await this.autoUpdateService.checkForUpdates();
  }

  async downloadLatest() {
    try {
      this.downloading.set(true);
      this.error.set(null);

      const release = await this.fileManager.getLatestRelease();
      if (!release) return;

      // Find the appropriate asset for this platform
      let assetName: string;
      let assetObj: any;

      const isWindows = navigator.platform.toLowerCase().includes('win');
      const isLinux = navigator.platform.toLowerCase().includes('linux');

      if (isWindows) {
        // Find the installer EXE
        assetName = await this.fileManager.findInstallerAsset(release) || '';
        if (!assetName) {
          throw new Error('Could not find Windows installer in release assets');
        }
        assetObj = release.assets.find((a: any) => a.name === assetName);
      } else if (isLinux) {
        // For Linux, search for flatpak file matching the pattern
        const pattern = await this.fileManager.getPlatformAssetName();
        const prefix = pattern.replace('-*.flatpak', '');
        assetObj = release.assets.find((a: any) => 
          a.name.startsWith(prefix) && a.name.endsWith('.flatpak')
        );
        if (!assetObj) {
          throw new Error(`Could not find Linux flatpak in release assets matching ${pattern}`);
        }
        assetName = assetObj.name;
      } else {
        // macOS - use DMG
        assetName = await this.fileManager.getPlatformAssetName();
        assetObj = release.assets.find((a: any) => a.name === assetName);
      }
      
      if (!assetObj) {
        throw new Error(`Could not find asset ${assetName} in release`);
      }

      console.log('Downloading:', assetObj.browser_download_url);
      const downloadPath = await this.fileManager.downloadFile(
        assetObj.browser_download_url,
        assetName
      );

      console.log('Downloaded to:', downloadPath);

      // Handle installation based on platform and file type
      if (isWindows && assetName.endsWith('.exe')) {
        console.log('Running Windows installer silently...');
        await this.fileManager.runInstaller(downloadPath);
        console.log('Installation complete');
      } else if (assetName.endsWith('.zip')) {
        console.log('Extracting ZIP...');
        await this.fileManager.extractZip(downloadPath);
        console.log('Extraction complete');
      } else if (assetName.endsWith('.dmg')) {
        console.log('DMG downloaded - manual installation required');
        // TODO: Handle macOS DMG mounting/installation
      } else if (assetName.endsWith('.flatpak')) {
        console.log('Installing Flatpak...');
        await this.fileManager.installFlatpak(downloadPath);
        console.log('Flatpak installation complete');
      } else if (assetName.endsWith('.AppImage')) {
        console.log('AppImage downloaded - making executable');
        // TODO: Make AppImage executable
      }

      // Save version info
      await this.fileManager.saveVersion(release.tag_name);

      // Clear cache to force fresh data on next load
      this.fileManager.clearReleaseCache();
      
      // Clear progress and reload installation info (will fetch fresh data)
      this.fileManager.clearDownloadProgress();
      await this.loadData();
    } catch (err) {
      console.error('Download failed:', err);
      this.error.set(`Download failed: ${err}`);
      this.fileManager.clearDownloadProgress();
    } finally {
      this.downloading.set(false);
    }
  }

  formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  toggleCustomPath() {
    const newValue = !this.useCustomPath();
    this.fileManager.setUseCustomPath(newValue);
    
    // Reload data immediately with new path setting
    this.loadData();
  }

  updateCustomPath(newPath: string) {
    // Cancel any pending debounce timer
    if (this.customPathDebounceTimer) {
      clearTimeout(this.customPathDebounceTimer);
    }

    // Update the store immediately (for UI reactivity)
    this.fileManager.setCustomPath(newPath);

    // Debounce the data reload (wait for user to finish typing)
    this.customPathDebounceTimer = window.setTimeout(() => {
      this.loadData();
    }, 500);
  }

  async openDir(path: string) {
    try {
      await this.fileManager.openDirectory(path);
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }
}
