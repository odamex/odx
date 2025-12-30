import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy, input, Signal, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsCardComponent, ExternalLinkConfirmComponent } from '@shared/components';
import { 
  FileManagerService, 
  AutoUpdateService,
  DialogService,
  DialogPresets,
  ControllerService,
  SettingsFormControllerService,
  ControllerEvent
} from '@shared/services';
import versions from '../../../../_versions';

@Component({
  selector: 'app-installation-settings',
  imports: [FormsModule, SettingsCardComponent],
  providers: [SettingsFormControllerService],
  templateUrl: './installation-settings.component.html',
  styleUrls: ['./installation-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstallationSettingsComponent implements OnInit, OnDestroy {
  private controllerService = inject(ControllerService);
  private formControllerService = inject(SettingsFormControllerService);
  private destroyRef = inject(ElementRef);
  
  // Parent navigation state input
  parentNavigationState = input.required<Signal<'tabs' | 'content'>>();
  
  // Container reference for form controls
  contentSection = viewChild<ElementRef>('contentSection');
  
  // Controller navigation state
  private canProcessButtons = false;
  private controllerSubscription: { unsubscribe: () => void } | null = null;
  protected fileManager = inject(FileManagerService);
  protected autoUpdateService = inject(AutoUpdateService);
  private dialogService = inject(DialogService);

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
  
  // Get GitHub commit URL
  get commitUrl(): string {
    return `https://github.com/odamex/odx/commit/${this.appCommitHash}`;
  }
  
  // Platform-specific placeholder
  get customPathPlaceholder(): string {
    const platform = window.electron.platform;
    if (platform === 'win32') {
      return 'C:\\Path\\To\\Odamex';
    } else if (platform === 'darwin') {
      return '/Applications/Odamex';
    } else {
      return '/usr/local/share/odamex';
    }
  }

  ngOnInit() {
    // Load data if not already loaded
    if (!this.directories()) {
      this.initializing.set(true);
      this.loadData().finally(() => this.initializing.set(false));
    }
    
    // Subscribe to controller events
    const removeListener = this.controllerService.addEventListener((event: ControllerEvent) => {
      if (!this.canProcessButtons) return;
      
      if (event.type === 'buttonpress') {
        this.formControllerService.handleButtonPress(event);
      } else if (event.type === 'direction') {
        this.formControllerService.handleDirection(event);
      }
    });
    
    // Store cleanup function
    this.controllerSubscription = { unsubscribe: removeListener } as any;
    
    // Listen for enter/exit content events
    window.addEventListener('settingsEnterContent', this.onEnterContent);
    window.addEventListener('settingsExitContent', this.onExitContent);
  }
  
  private onEnterContent = (): void => {
    this.canProcessButtons = true;
    const container = this.contentSection();
    if (container) {
      this.formControllerService.findFocusableElements(container);
      this.formControllerService.focusFirst();
    }
  };
  
  private onExitContent = (): void => {
    this.canProcessButtons = false;
    this.formControllerService.cleanup();
  };
  
  ngOnDestroy(): void {
    if (this.controllerSubscription) {
      this.controllerSubscription.unsubscribe();
    }
    window.removeEventListener('settingsEnterContent', this.onEnterContent);
    window.removeEventListener('settingsExitContent', this.onExitContent);
    this.formControllerService.cleanup();
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

      console.log('Downloading:', assetObj.browserDownloadUrl);
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
      await this.fileManager.saveVersion(release.tagName);

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
    // Use silent mode to prevent loading spinner flash
    this.customPathDebounceTimer = window.setTimeout(async () => {
      try {
        const customPathValue = this.useCustomPath() ? this.customPath() : undefined;
        await this.fileManager.getInstallationInfo(customPathValue, true, true);
      } catch (err) {
        console.error('Failed to update installation info:', err);
      }
    }, 500);
  }

  async openDir(path: string) {
    try {
      await this.fileManager.openDirectory(path);
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }

  async openExternalLink(url: string) {
    const STORAGE_KEY = 'odx.skipExternalLinkWarning';
    const skipWarning = localStorage.getItem(STORAGE_KEY) === 'true';
    
    if (skipWarning) {
      window.electron.openExternal(url);
      return;
    }
    
    const modalRef = this.dialogService.open(ExternalLinkConfirmComponent, { 
      size: 'lg', 
      centered: true,
      modalDialogClass: 'odx-modal'
    });
    modalRef.componentInstance.url = url;
    
    try {
      const result = await modalRef.result;
      if (result?.confirmed) {
        if (result.dontShowAgain) {
          localStorage.setItem(STORAGE_KEY, 'true');
        }
        window.electron.openExternal(url);
      }
    } catch (err) {
      // Modal was dismissed
    }
  }
}
