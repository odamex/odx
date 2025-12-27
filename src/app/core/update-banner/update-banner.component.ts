import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UpdatesService, AutoUpdateService, FileManagerService } from '@shared/services';

/**
 * Component that displays update banners for both Odamex and ODX launcher
 * 
 * Shows notification banners at the top of the app when updates are available.
 * Provides controls for downloading and installing updates.
 */
@Component({
  selector: 'app-update-banner',
  imports: [],
  templateUrl: './update-banner.component.html',
  styleUrl: './update-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateBannerComponent {
  protected updatesService = inject(UpdatesService);
  protected autoUpdate = inject(AutoUpdateService);
  private router = inject(Router);
  private fileManager = inject(FileManagerService);

  // Track Odamex download state
  protected odamexDownloading = signal(false);

  // ODX update state
  readonly odxUpdateState = this.autoUpdate.state;
  readonly odxUpdateInfo = this.autoUpdate.updateInfo;
  readonly odxDownloadProgress = this.autoUpdate.downloadProgress;
  readonly odxError = this.autoUpdate.error;

  readonly showODXBanner = computed(() => {
    const state = this.odxUpdateState();
    return state === 'available' || state === 'downloading' || state === 'downloaded' || state === 'error';
  });

  readonly odxIsAvailable = computed(() => this.odxUpdateState() === 'available');
  readonly odxIsDownloading = computed(() => this.odxUpdateState() === 'downloading');
  readonly odxIsDownloaded = computed(() => this.odxUpdateState() === 'downloaded');
  readonly odxHasError = computed(() => this.odxUpdateState() === 'error');

  readonly odxUpdateVersion = computed(() => this.odxUpdateInfo()?.version || '');
  readonly odxErrorMessage = computed(() => this.odxError() || 'Unknown error');

  readonly odxDownloadPercent = computed(() => {
    const progress = this.odxDownloadProgress();
    return progress ? Math.round(progress.percent) : 0;
  });

  readonly odxDownloadSpeed = computed(() => {
    const progress = this.odxDownloadProgress();
    if (!progress) return '';
    return `${this.autoUpdate.formatBytes(progress.bytesPerSecond)}/s`;
  });

  /**
   * Start downloading and installing the Odamex update
   * Downloads the latest version and installs it automatically
   */
  async downloadOdamexUpdate(): Promise<void> {
    try {
      this.odamexDownloading.set(true);
      
      const release = await this.fileManager.getLatestRelease();
      if (!release) {
        console.error('No release found');
        return;
      }

      // Find the appropriate asset for this platform
      let assetName: string;
      let assetObj: any;

      const platform = window.electron.platform;
      const isWindows = platform === 'win32';
      const isLinux = platform === 'linux';

      if (isWindows) {
        // Find the installer EXE
        assetName = await this.fileManager.findInstallerAsset(release) || '';
        if (!assetName) {
          throw new Error('Could not find Windows installer in release assets');
        }
        assetObj = release.assets.find((a: any) => a.name === assetName);
      } else if (isLinux) {
        // For Linux, search for flatpak file
        const pattern = await this.fileManager.getPlatformAssetName();
        const prefix = pattern.replace('-*.flatpak', '');
        assetObj = release.assets.find((a: any) => 
          a.name.startsWith(prefix) && a.name.endsWith('.flatpak')
        );
        if (!assetObj) {
          throw new Error(`Could not find Linux flatpak in release assets`);
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

      console.log('Downloading Odamex:', assetObj.browserDownloadUrl);
      const downloadPath = await this.fileManager.downloadFile(
        assetObj.browserDownloadUrl,
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
      } else if (assetName.endsWith('.flatpak')) {
        console.log('Installing Flatpak...');
        await this.fileManager.installFlatpak(downloadPath);
        console.log('Flatpak installation complete');
      }

      // Save version info
      await this.fileManager.saveVersion(release.tagName);

      // Clear cache and dismiss the banner
      this.fileManager.clearReleaseCache();
      this.dismiss();
      
      // Navigate to home to show the updated installation
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Failed to download/install Odamex:', error);
    } finally {
      this.odamexDownloading.set(false);
    }
  }

  /**
   * Navigate to the settings page
   * Used when user clicks on Odamex update notification
   */
  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Dismiss the Odamex update notification
   * User can check for updates again later in settings
   */
  dismiss() {
    this.updatesService.dismiss();
  }

  /**
   * Start downloading the ODX launcher update
   * Downloads in background, progress is tracked via signals
   */
  downloadODXUpdate(): void {
    this.autoUpdate.downloadUpdate();
  }

  /**
   * Install the downloaded ODX update and restart the application
   * Shows splash screen during installation, then quits and relaunches
   */
  installODXAndRestart(): void {
    this.autoUpdate.installAndRestart();
  }

  /**
   * Dismiss the ODX update notification
   * User can manually check for updates later
   */
  dismissODXUpdate(): void {
    this.autoUpdate.dismissUpdate();
  }
}
