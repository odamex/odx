import { Component, ChangeDetectionStrategy, signal, computed, OnInit, AfterViewInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { 
  FileManagerService, 
  UpdatesService, 
  IWADService, 
  ServerRefreshService, 
  NotificationService, 
  PeriodicUpdateService, 
  AutoUpdateService, 
  QuickMatchService,
  LocalNetworkDiscoveryService,
  OdalPapi,
  DialogService,
  DialogPresets,
  type DirectoryInfo,
  type GameMetadata,
  type QuickMatchCriteria
} from '@shared/services';
import { NgbNavModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { GameSelectionDialogComponent } from '@core/game-selection-dialog/game-selection-dialog.component';
import { LocalDiscoveryDialogComponent } from '@core/local-discovery-dialog/local-discovery-dialog.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import versions from '../../../_versions';

@Component({
  selector: 'app-settings',
  imports: [NgbNavModule, LoadingSpinnerComponent, FormsModule, DatePipe],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private fileManager = inject(FileManagerService);
  protected updatesService = inject(UpdatesService);
  protected iwadService = inject(IWADService);
  protected refreshService = inject(ServerRefreshService);
  protected notificationService = inject(NotificationService);
  protected periodicUpdateService = inject(PeriodicUpdateService);
  protected autoUpdateService = inject(AutoUpdateService);
  private quickMatchService = inject(QuickMatchService);
  protected localNetworkDiscoveryService = inject(LocalNetworkDiscoveryService);
  private dialogService = inject(DialogService);

  // Use store signals
  readonly installationInfo = this.fileManager.installationInfo;
  readonly downloadProgress = this.fileManager.downloadProgress;
  readonly storeLoading = this.fileManager.loading;
  readonly storeError = this.fileManager.error;
  readonly directories = this.fileManager.directories;
  readonly wadFiles = this.fileManager.wadFiles;
  readonly latestRelease = this.fileManager.latestRelease;
  readonly platformAsset = this.fileManager.platformAsset;
  readonly customPath = this.fileManager.customPath;
  readonly useCustomPath = this.fileManager.useCustomPath;

  // Local component state
  activeTab = 1; // ng-bootstrap nav uses number IDs
  detectedIWADs = this.iwadService.detectedIWADs;
  wadDirectories = this.iwadService.wadDirectories;
  
  // Debounce timer for custom path updates
  private customPathDebounceTimer?: number;
  
  // Group IWADs by game type to avoid long lists - includes non-commercial games with 0 detected
  readonly groupedIWADs = computed(() => {
    const displayGames = this.iwadService.displayGames();
    const groups = new Map<string, { metadata: GameMetadata | undefined, iwads: typeof displayGames, count: number, hasID24: boolean, versions: Set<string>, hasLatest: boolean }>();
    
    for (const game of displayGames) {
      const gameType = game.entry.game;
      // Create separate groups for ID24 and non-ID24 versions
      const groupKey = game.entry.id24 ? `${gameType}_id24` : gameType;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          metadata: this.getGameMetadata(gameType),
          iwads: [],
          count: 0,
          hasID24: game.entry.id24 || false,
          versions: new Set<string>(),
          hasLatest: false
        });
      }
      const group = groups.get(groupKey)!;
      
      // Extract version from IWAD name (e.g., "v1.9", "Oct 2024", "v0.12.1")
      const versionMatch = game.entry.name.match(/v?\d+\.\d+(?:\.\d+)?|(?:Oct|October|Nov|November|Dec|December)\s+\d{4}|BFG Edition|Unity|Classic/i);
      if (versionMatch) {
        group.versions.add(versionMatch[0]);
      }
      
      // Check if this group has the latest version
      if (game.entry.isLatest) {
        group.hasLatest = true;
      }
      
      // Only add to iwads array if it's an actual detected file (has a path)
      if (game.path) {
        group.iwads.push(game);
        if (game.entry.id24) {
          group.hasID24 = true;
        }
      }
      group.count = game.detectedCount || 0;
    }
    
    const result = Array.from(groups.values()).filter(g => g.metadata).map(g => ({
      ...g,
      versionsArray: Array.from(g.versions)
    }));
    return result;
  });
  
  // Split games into commercial (only show if found) and free (always show) categories
  readonly commercialGames = computed(() => {
    return this.groupedIWADs()
      .filter(g => g.metadata?.commercial && g.count > 0)
      .sort((a, b) => (a.metadata?.displayName || '').localeCompare(b.metadata?.displayName || ''));
  });
  
  readonly freeGames = computed(() => {
    return this.groupedIWADs()
      .filter(g => !g.metadata?.commercial)
      .sort((a, b) => (a.metadata?.displayName || '').localeCompare(b.metadata?.displayName || ''));
  });
  
  showGameSelection = signal(false);
  
  downloading = signal(false);
  error = signal<string | null>(null);
  initializing = signal(false); // Don't show loading spinner by default - only if we need to fetch data
  
  // Application settings
  filterByVersion = signal(true);
  quitOnClose = signal(false);
  
  // Notification settings (computed from services)
  notificationsEnabled = computed(() => this.notificationService.settings().enabled);
  
  // Notification methods
  notificationsSystem = computed(() => this.notificationService.settings().systemNotifications);
  notificationsTaskbarFlash = computed(() => this.notificationService.settings().taskbarFlash);
  
  // Notification types
  notificationsServerActivity = computed(() => this.notificationService.settings().serverActivity);
  notificationsUpdates = computed(() => this.notificationService.settings().updates);
  
  // Notification advanced settings
  notificationsQueueLimit = computed(() => this.notificationService.settings().queueLimit);
  notificationsIdleThreshold = computed(() => this.notificationService.settings().idleThresholdMinutes);
  
  // Periodic update settings (computed from service)
  periodicUpdateEnabled = computed(() => this.periodicUpdateService.settings().enabled);
  periodicUpdateInterval = computed(() => this.periodicUpdateService.settings().intervalMinutes);
  
  // Auto-update settings (computed from service)
  autoUpdateEnabled = computed(() => this.autoUpdateService.autoUpdateEnabled());
  
  // Local Network Discovery settings (computed from service)
  localDiscoveryEnabled = computed(() => this.localNetworkDiscoveryService.settings().enabled);
  localDiscoveryPortStart = computed(() => this.localNetworkDiscoveryService.settings().portRangeStart);
  localDiscoveryPortEnd = computed(() => this.localNetworkDiscoveryService.settings().portRangeEnd);
  localDiscoveryScanTimeout = computed(() => this.localNetworkDiscoveryService.settings().scanTimeout);
  localDiscoveryRefreshInterval = computed(() => this.localNetworkDiscoveryService.settings().refreshInterval);
  localDiscoveryMaxConcurrent = computed(() => this.localNetworkDiscoveryService.settings().maxConcurrent);
  localDiscoveryScanning = computed(() => this.localNetworkDiscoveryService.scanning());
  localDiscoveryLastScan = computed(() => this.localNetworkDiscoveryService.lastScanTime());
  localDiscoveryNetworks = computed(() => this.localNetworkDiscoveryService.detectedNetworks());
  
  // UI state for advanced settings
  showAdvancedDiscovery = signal(false);
  private localDiscoveryModalRef: NgbModalRef | null = null;
  
  // Quick Match settings
  quickMatchCriteria: QuickMatchCriteria = {
    maxPing: 100,
    minPlayers: 1,
    maxPlayers: 32,
    avoidEmpty: true,
    avoidFull: true,
    monitoringTimeoutMinutes: 60,
    autoStartMonitoring: true,
    preferredGameTypes: [
      OdalPapi.GameType.GT_Deathmatch,
      OdalPapi.GameType.GT_TeamDeathmatch,
      OdalPapi.GameType.GT_CaptureTheFlag,
      OdalPapi.GameType.GT_Cooperative,
      OdalPapi.GameType.GT_Survival,
      OdalPapi.GameType.GT_Horde
    ]
  };
  
  // Version information
  readonly appVersion = versions.version;
  readonly appVersionDate = new Date(versions.versionDate).toLocaleDateString();
  readonly appCommitHash = versions.gitCommitHash;
  readonly appPath = signal<string>('');
  
  // Make Math available in template
  protected readonly Math = Math;

  ngOnInit() {
    // Check for tab query parameter and navigate to it
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tabNumber = parseInt(params['tab'], 10);
        if (!isNaN(tabNumber)) {
          this.activeTab = tabNumber;
        }
      }
    });

    // Load application settings from localStorage (synchronous - no blocking)
    const savedFilterByVersion = localStorage.getItem('filterByVersion');
    if (savedFilterByVersion !== null) {
      this.filterByVersion.set(savedFilterByVersion === 'true');
    }

    const savedQuitOnClose = localStorage.getItem('quitOnClose');
    if (savedQuitOnClose !== null) {
      this.quitOnClose.set(savedQuitOnClose === 'true');
    }

    // Load Quick Match settings from localStorage
    const savedQuickMatchCriteria = localStorage.getItem('quickMatchCriteria');
    if (savedQuickMatchCriteria) {
      try {
        const criteria = JSON.parse(savedQuickMatchCriteria);
        this.quickMatchCriteria = criteria;
        this.quickMatchService.criteria.set(criteria);
      } catch (err) {
        console.error('Failed to load Quick Match settings:', err);
      }
    } else {
      // Initialize service with default criteria
      this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
    }
  }
  
  ngAfterViewInit() {
    // Only load data if not already loaded (first visit to settings)
    // This prevents unnecessary reloading every time user navigates to settings
    if (!this.directories()) {
      this.initializing.set(true); // Show loading spinner
      this.loadDataAsync();
    } else {
      // Data already loaded, ready immediately
      this.initializing.set(false);
    }
  }
  
  private async loadDataAsync() {
    try {
      // Load data in parallel to minimize loading time
      // Most of this data is cached, so subsequent visits are instant
      await Promise.all([
        this.loadData(),
        this.iwadService.getGameMetadata(),
        this.iwadService.getWADDirectories()
      ]);
      
      // Detect IWADs after directories are loaded
      await this.iwadService.detectIWADs();
    } finally {
      // Mark initialization complete - UI is now fully interactive
      this.initializing.set(false);
    }
  }

  async loadData() {
    try {
      this.error.set(null);

      const customPathValue = this.useCustomPath() ? this.customPath() : undefined;

      const [info, release, dirs, wads, asset] = await Promise.all([
        this.fileManager.getInstallationInfo(customPathValue),
        this.fileManager.getLatestRelease(),
        this.fileManager.getDirectories(),
        this.fileManager.listWadFiles(),
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
      
      // Data is now in the store via service methods
    } catch (err) {
      console.error('Failed to load settings:', err);
      this.error.set('Failed to load installation information');
    }
  }

  toggleCustomPath() {
    this.fileManager.setUseCustomPath(!this.useCustomPath());
    this.loadData();
  }

  updateCustomPath(path: string) {
    // Update the path immediately so the input doesn't lose focus
    this.fileManager.setCustomPath(path);
    
    // Debounce the data reload to avoid triggering on every keystroke
    if (this.customPathDebounceTimer) {
      clearTimeout(this.customPathDebounceTimer);
    }
    
    this.customPathDebounceTimer = window.setTimeout(() => {
      if (this.useCustomPath()) {
        this.loadData();
      }
    }, 500); // Wait 500ms after user stops typing
  }

  async downloadLatest() {
    try {
      this.downloading.set(true);
      this.error.set(null);

      const release = this.latestRelease();
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
        const pattern = this.platformAsset();
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
        assetName = this.platformAsset();
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

  async openDir(path: string) {
    try {
      await this.fileManager.openDirectory(path);
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }

  async refreshWads() {
    try {
      const wads = await this.fileManager.listWadFiles();
      this.fileManager.setWadFiles(wads);
    } catch (err) {
      console.error('Failed to refresh WAD list:', err);
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  getPlatformIcon(): string {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'apple';
    return 'tux';
  }

  getPlatformDownloadText(): string {
    const version = this.latestRelease()?.tag_name || 'Latest';
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return `${version} Windows Installer`;
    if (platform.includes('mac')) return `${version} MacOS Installer`;
    return `${version} Linux Package`;
  }

  toggleAutoUpdateCheck() {
    const newValue = !this.updatesService.isCheckEnabled();
    this.updatesService.setCheckEnabled(newValue);
  }
  
  toggleFilterByVersion() {
    const newValue = !this.filterByVersion();
    this.filterByVersion.set(newValue);
    localStorage.setItem('filterByVersion', newValue.toString());
  }

  async toggleQuitOnClose() {
    const newValue = !this.quitOnClose();
    this.quitOnClose.set(newValue);
    localStorage.setItem('quitOnClose', newValue.toString());
    // Update Electron preference
    if (window.electron) {
      await window.electron.setQuitOnClose(newValue);
    }
  }
  
  toggleAutoRefresh() {
    const newValue = !this.refreshService.isEnabled();
    this.refreshService.setEnabled(newValue);
    localStorage.setItem('autoRefreshEnabled', newValue.toString());
  }
  
  updateAutoRefreshMinutes(minutes: number) {
    if (minutes > 0) {
      this.refreshService.setMinutes(minutes);
      localStorage.setItem('autoRefreshMinutes', minutes.toString());
    }
  }
  
  autoRefreshEnabled(): boolean {
    return this.refreshService.isEnabled();
  }
  
  autoRefreshMinutes(): number {
    return this.refreshService.getMinutes();
  }

  toggleNotifications(): void {
    const current = this.notificationService.settings();
    this.notificationService.updateSettings({ enabled: !current.enabled });
  }

  toggleSystemNotifications(): void {
    const current = this.notificationService.settings();
    this.notificationService.updateSettings({ systemNotifications: !current.systemNotifications });
  }
  
  toggleServerActivityNotifications() {
    const current = this.notificationService.settings();
    this.notificationService.updateSettings({ serverActivity: !current.serverActivity });
  }
  
  toggleUpdateNotifications(): void {
    const current = this.notificationService.settings();
    this.notificationService.updateSettings({ updates: !current.updates });
  }

  toggleTaskbarFlash(): void {
    const current = this.notificationService.settings();
    this.notificationService.updateSettings({ taskbarFlash: !current.taskbarFlash });
  }

  onQueueLimitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const queueLimit = parseInt(select.value, 10);
    this.notificationService.updateSettings({ queueLimit });
  }

  onIdleThresholdChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const idleThresholdMinutes = parseInt(select.value, 10);
    this.notificationService.updateSettings({ idleThresholdMinutes });
  }

  // Local Network Discovery methods
  toggleLocalDiscovery(): void {
    const current = this.localNetworkDiscoveryService.settings();
    const newEnabled = !current.enabled;
    
    // Check if this is the first time enabling
    const hasSeenDialog = localStorage.getItem('localDiscoveryDialogShown') === 'true';
    
    if (newEnabled && !hasSeenDialog) {
      // Show confirmation dialog on first enable
      this.localDiscoveryModalRef = this.dialogService.open(LocalDiscoveryDialogComponent, {
        ...DialogPresets.standard(),
        size: 'lg',
        modalDialogClass: 'odx-modal'
      });
      
      // Wait for user to confirm or cancel
      this.localDiscoveryModalRef.result.then(
        () => this.confirmLocalDiscovery(),
        () => this.cancelLocalDiscovery()
      );
    } else {
      // Just toggle normally
      this.localNetworkDiscoveryService.updateSettings({ enabled: newEnabled });
      
      if (newEnabled) {
        this.localNetworkDiscoveryService.start();
      } else {
        this.localNetworkDiscoveryService.stop();
      }
    }
  }
  
  confirmLocalDiscovery(): void {
    // Mark that user has seen the dialog
    localStorage.setItem('localDiscoveryDialogShown', 'true');
    
    // Enable and start scanning
    this.localNetworkDiscoveryService.updateSettings({ enabled: true });
    this.localNetworkDiscoveryService.start();
  }
  
  cancelLocalDiscovery(): void {
    // Dialog already closed via dismiss, nothing to do
  }

  toggleAdvancedDiscovery(): void {
    this.showAdvancedDiscovery.set(!this.showAdvancedDiscovery());
  }

  updatePortRangeStart(port: number): void {
    if (port >= 1024 && port <= 65535) {
      this.localNetworkDiscoveryService.updateSettings({ portRangeStart: port });
      this.localNetworkDiscoveryService.restart();
    }
  }

  updatePortRangeEnd(port: number): void {
    if (port >= 1024 && port <= 65535) {
      this.localNetworkDiscoveryService.updateSettings({ portRangeEnd: port });
      this.localNetworkDiscoveryService.restart();
    }
  }

  updateScanTimeout(timeout: number): void {
    if (timeout >= 50 && timeout <= 5000) {
      this.localNetworkDiscoveryService.updateSettings({ scanTimeout: timeout });
      this.localNetworkDiscoveryService.restart();
    }
  }

  updateRefreshInterval(seconds: number): void {
    if (seconds >= 10 && seconds <= 600) {
      this.localNetworkDiscoveryService.updateSettings({ refreshInterval: seconds });
      this.localNetworkDiscoveryService.restart();
    }
  }

  updateMaxConcurrent(max: number): void {
    if (max >= 1 && max <= 200) {
      this.localNetworkDiscoveryService.updateSettings({ maxConcurrent: max });
      this.localNetworkDiscoveryService.restart();
    }
  }

  triggerLocalScan(): void {
    this.localNetworkDiscoveryService.scan(true); // Force scan even if disabled
  }

  
  togglePeriodicUpdateCheck() {
    const current = this.periodicUpdateService.settings();
    this.periodicUpdateService.updateSettings({ enabled: !current.enabled });
  }
  
  toggleAutoUpdate() {
    const newValue = !this.autoUpdateService.isAutoUpdateEnabled();
    this.autoUpdateService.setAutoUpdateEnabled(newValue);
  }
  
  checkForODXUpdate() {
    this.autoUpdateService.checkForUpdates();
  }
  
  async checkForOdamexUpdate() {
    await this.updatesService.checkForUpdates();
  }
  
  updatePeriodicUpdateInterval(minutes: number) {
    if (minutes > 0) {
      this.periodicUpdateService.updateSettings({ intervalMinutes: minutes });
    }
  }

  async resetFirstRunConfig() {
    if (confirm('This will reset your installation configuration. The app will restart and show the first run dialog. Continue?')) {
      try {
        await this.fileManager.resetFirstRunConfig();
        // Restart the app
        window.location.reload();
      } catch (err) {
        console.error('Failed to reset config:', err);
        this.error.set('Failed to reset configuration');
      }
    }
  }

  // Game management methods
  getGameMetadata(gameType: string): GameMetadata | undefined {
    return this.iwadService.gameMetadata()[gameType];
  }

  openGameSelection() {
    this.showGameSelection.set(true);
  }

  async addDirectory() {
    try {
      const directory = await window.electron.fileManager.pickDirectory();
      if (directory) {
        await this.iwadService.addWADDirectory(directory);
        await this.iwadService.detectIWADs(); // Rescan after adding
      }
    } catch (err: any) {
      console.error('Failed to add directory:', err);
      alert(`Failed to add directory: ${err.message || err}`);
    }
  }

  async onGameSelectionComplete() {
    this.showGameSelection.set(false);
    // Rescan for IWADs
    await this.iwadService.detectIWADs();
    await this.iwadService.getWADDirectories();
  }

  onGameSelectionCancel() {
    this.showGameSelection.set(false);
  }

  async removeWADDirectory(directory: string) {
    if (confirm(`Remove directory "${directory}" from WAD search paths?`)) {
      try {
        await this.iwadService.removeWADDirectory(directory);
        await this.iwadService.detectIWADs(); // Rescan after removal
      } catch (err) {
        console.error('Failed to remove directory:', err);
        alert('Failed to remove directory. Please try again.');
      }
    }
  }

  async toggleRecursiveScan(directory: string, recursive: boolean) {
    try {
      await this.iwadService.toggleRecursiveScan(directory, recursive);
      await this.iwadService.detectIWADs(); // Rescan after changing recursive setting
    } catch (err) {
      console.error('Failed to toggle recursive scan:', err);
      alert('Failed to update recursive scan setting. Please try again.');
    }
  }

  async rescanIWADs() {
    try {
      await this.iwadService.rescanIWADs();
    } catch (err) {
      console.error('Failed to rescan IWADs:', err);
      alert('Failed to rescan IWADs. Please try again.');
    }
  }

  async toggleSteamScan(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    try {
      await this.iwadService.setSteamScan(enabled);
      await this.iwadService.detectIWADs(); // Rescan after toggling
    } catch (err) {
      console.error('Failed to toggle Steam scan:', err);
      alert('Failed to update Steam scan setting. Please try again.');
    }
  }

  // Quick Match Settings Methods
  
  /**
   * Check if a game type is selected in Quick Match preferences
   */
  isGameTypeSelected(gameType: OdalPapi.GameType): boolean {
    return this.quickMatchCriteria.preferredGameTypes?.includes(gameType) ?? false;
  }

  /**
   * Toggle a game type in Quick Match preferences
   */
  toggleGameType(gameType: OdalPapi.GameType): void {
    if (!this.quickMatchCriteria.preferredGameTypes) {
      this.quickMatchCriteria.preferredGameTypes = [];
    }

    const index = this.quickMatchCriteria.preferredGameTypes.indexOf(gameType);
    if (index > -1) {
      this.quickMatchCriteria.preferredGameTypes.splice(index, 1);
    } else {
      this.quickMatchCriteria.preferredGameTypes.push(gameType);
    }
  }

  /**
   * Save Quick Match settings (auto-save on change)
   */
  saveQuickMatchSettings(): void {
    try {
      // Update the service with new criteria
      this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
      
      // Persist to localStorage
      localStorage.setItem('quickMatchCriteria', JSON.stringify(this.quickMatchCriteria));
    } catch (err) {
      console.error('Failed to save Quick Match settings:', err);
    }
  }

  /**
   * Reset Quick Match settings to defaults
   */
  resetQuickMatchSettings(): void {
    this.quickMatchCriteria = {
      maxPing: 100,
      minPlayers: 1,
      maxPlayers: 32,
      avoidEmpty: true,
      avoidFull: true,
      monitoringTimeoutMinutes: 60,
      autoStartMonitoring: true,
      preferredGameTypes: [
        OdalPapi.GameType.GT_Deathmatch,
        OdalPapi.GameType.GT_TeamDeathmatch,
        OdalPapi.GameType.GT_CaptureTheFlag,
        OdalPapi.GameType.GT_Cooperative,
        OdalPapi.GameType.GT_Survival,
        OdalPapi.GameType.GT_Horde
      ]
    };
    
    // Also reset in service and localStorage
    this.quickMatchService.criteria.set({ ...this.quickMatchCriteria });
    localStorage.removeItem('quickMatchCriteria');
    
    // Save the defaults
    this.saveQuickMatchSettings();
  }
}

