import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TitleBarComponent } from '@core/title-bar/title-bar.component';
import { NavigationComponent } from '@core/navigation/navigation';
import { SplashComponent } from '@core/splash/splash.component';
import { UpdateBannerComponent } from '@core/update-banner/update-banner.component';
import { FirstRunDialogComponent, FirstRunChoice } from '@core/first-run-dialog/first-run-dialog.component';
import { GameSelectionDialogComponent } from '@core/game-selection-dialog/game-selection-dialog.component';
import { SplashService } from '@core/splash/splash.service';
import { 
  FileManagerService,
  OdalPapiService,
  UpdatesService,
  IWADService,
  ServerRefreshService,
  NetworkStatusService,
  OdamexServiceStatusService,
  PeriodicUpdateService,
  AutoUpdateService,
  LocalNetworkDiscoveryService,
  CustomServersService
} from '@shared/services';
import type { DetectedIWAD } from '@shared/services/iwad/iwad.service';
import { ServersStore } from '@store/servers.store';
import versions from '../_versions';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TitleBarComponent, NavigationComponent, SplashComponent, UpdateBannerComponent, FirstRunDialogComponent, GameSelectionDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class App implements OnInit {
  private splashService = inject(SplashService);
  private fileManager = inject(FileManagerService);
  private odalPapi = inject(OdalPapiService);
  private serversStore = inject(ServersStore);
  private updatesService = inject(UpdatesService);
  private iwadService = inject(IWADService);
  private networkStatus = inject(NetworkStatusService);
  private serviceStatus = inject(OdamexServiceStatusService); // Initialize service status monitoring
  private autoUpdateService = inject(AutoUpdateService); // Initialize ODX auto-updater
  private localNetworkDiscovery = inject(LocalNetworkDiscoveryService); // Initialize local network discovery
  private customServers = inject(CustomServersService); // Initialize custom servers
  private router = inject(Router);

  readonly splashVisible = this.splashService.visible;
  readonly splashMessage = this.splashService.message;
  readonly splashSubMessage = this.splashService.subMessage;
  readonly splashProgress = this.splashService.progress;
  readonly splashFadeOut = this.splashService.fadeOut;
  readonly version = versions.version;
  readonly platform = signal<string>(window.electron?.platform || 'unknown');

  showFirstRunDialog = signal(false);
  showGameSelectionDialog = signal(false);
  firstRunDialog = viewChild<FirstRunDialogComponent>('firstRunDialog');

  async ngOnInit() {
    // Always start at home
    this.router.navigate(['/']);
    
    // Load quit on close preference from localStorage and send to Electron
    if (window.electron) {
      const savedQuitOnClose = localStorage.getItem('quitOnClose');
      const quitOnClose = savedQuitOnClose === 'true';
      await window.electron.setQuitOnClose(quitOnClose);
    }
    
    // Expose service status for debugging
    if (typeof window !== 'undefined') {
      (window as any).testOverlay = () => this.serviceStatus.testOverlayIcons();
      console.log('Debug: Run testOverlay() in console to test overlay icons');
    }
    
    await this.initializeApp();
  }

  private async initializeApp() {
    try {
      // Step 1: Initialize file system
      this.splashService.setMessages('Initializing...', 'Setting up file system');
      await this.delay(500);

      // Step 2: Check for existing installation
      this.splashService.setMessages('Checking installation...', 'Looking for Odamex');
      const installInfo = await this.fileManager.getInstallationInfo();
      await this.delay(300);

      // Check if this is first run (no installation configured)
      const isFirstRun = await this.checkIfFirstRun();
      console.log('First run check:', isFirstRun);
      
      if (isFirstRun) {
        console.log('Showing first run dialog');
        this.splashService.hide();
        this.showFirstRunDialog.set(true);
        
        // Set detected path in dialog if found
        setTimeout(() => {
          const dialog = this.firstRunDialog();
          console.log('First run dialog component:', dialog);
          if (dialog && installInfo.systemInstallPath) {
            console.log('Setting detected path:', installInfo.systemInstallPath);
            dialog.setDetectedPath(installInfo.systemInstallPath);
          }
        }, 100);
        
        // Wait for user choice before continuing
        return;
      }

      // Step 3: Check for ODX launcher updates (if online)
      if (this.networkStatus.isOnline()) {
        this.splashService.setMessages('Checking for ODX updates...', 'Looking for launcher updates');
        this.autoUpdateService.checkForUpdates();
        
        // Wait for update check to complete (with timeout)
        const maxWaitTime = 5000; // 5 seconds max
        const startTime = Date.now();
        
        while (this.autoUpdateService.state() === 'checking' && (Date.now() - startTime) < maxWaitTime) {
          await this.delay(100);
        }
        
        const odxState = this.autoUpdateService.state();
        const odxInfo = this.autoUpdateService.updateInfo();
        
        if (odxState === 'available' && odxInfo) {
          // Check if auto-updates are enabled
          if (this.autoUpdateService.isAutoUpdateEnabled()) {
            // Auto-update enabled: download and install automatically
            this.splashService.setMessages('ODX Update Available', `Downloading version ${odxInfo.version}...`);
            this.autoUpdateService.downloadUpdate();
            
            // Wait for download to complete
            while (this.autoUpdateService.state() === 'downloading') {
              const progress = this.autoUpdateService.downloadProgress();
              if (progress) {
                this.splashService.setProgress(progress.percent);
                this.splashService.setSubMessage(`${Math.round(progress.percent)}% - ${this.autoUpdateService.formatBytes(progress.bytesPerSecond)}/s`);
              }
              await this.delay(100);
            }
            
            if (this.autoUpdateService.state() === 'downloaded') {
              // Download complete, install and restart
              this.splashService.setMessages('Installing ODX Update...', 'Application will restart');
              this.splashService.setProgress(null);
              await this.delay(500);
              await this.autoUpdateService.installAndRestart();
              // App will quit and restart - no code after this will run
              return;
            }
          } else {
            // Auto-update disabled: ask user
            this.splashService.setMessages('ODX Update Available', `Version ${odxInfo.version} is available`);
            this.splashService.setSubMessage('Install now?');
            await this.delay(1000);
            
            // Show a simple confirm via Electron dialog
            const shouldUpdate = await this.showUpdatePrompt(odxInfo.version);
            
            if (shouldUpdate) {
              // User chose to update
              this.splashService.setMessages('Downloading ODX Update...', `Version ${odxInfo.version}`);
              this.autoUpdateService.downloadUpdate();
              
              // Wait for download to complete
              while (this.autoUpdateService.state() === 'downloading') {
                const progress = this.autoUpdateService.downloadProgress();
                if (progress) {
                  this.splashService.setProgress(progress.percent);
                  this.splashService.setSubMessage(`${Math.round(progress.percent)}% - ${this.autoUpdateService.formatBytes(progress.bytesPerSecond)}/s`);
                }
                await this.delay(100);
              }
              
              if (this.autoUpdateService.state() === 'downloaded') {
                // Download complete, install and restart
                this.splashService.setMessages('Installing ODX Update...', 'Application will restart');
                this.splashService.setProgress(null);
                await this.delay(500);
                await this.autoUpdateService.installAndRestart();
                // App will quit and restart - no code after this will run
                return;
              }
            } else {
              // User chose to skip
              this.splashService.setMessages('Update skipped', 'You can update later from the banner');
              await this.delay(800);
            }
          }
        } else if (odxState === 'idle') {
          this.splashService.setSubMessage('ODX is up to date');
          await this.delay(500);
        }
      }

      // Step 4: Check for Odamex updates if installed
      if (installInfo.installed && installInfo.version) {
        // Only check for updates if online
        if (this.networkStatus.isOnline()) {
          this.splashService.setMessages('Checking for Odamex updates...', `Current version: ${installInfo.version}`);
          this.splashService.setProgress(null);
          await this.updatesService.checkForUpdates();
          
          const updateInfo = this.updatesService.updateDetails();
          if (updateInfo.available && updateInfo.latestVersion) {
            this.splashService.setSubMessage(`Update available: ${updateInfo.latestVersion}`);
          } else {
            this.splashService.setSubMessage('You have the latest version');
          }
          await this.delay(800);
        } else {
          this.splashService.setMessages('Offline mode', `Version: ${installInfo.version}`);
          this.splashService.setSubMessage('Update check skipped - offline mode');
          await this.delay(500);
        }
      }

      // Step 5: Check for configured WAD directories
      const hasDirectories = await this.iwadService.hasWADDirectories();
      if (!hasDirectories) {
        // Show game selection dialog
        this.splashService.hide();
        this.showGameSelectionDialog.set(true);
        return; // Wait for game selection before continuing
      }

      // Step 6: Detect IWADs
      this.splashService.setMessages('Scanning for IWADs...', 'Detecting installed games');
      await this.iwadService.getWADDirectories();
      await this.iwadService.getGameMetadata(); // Load game metadata
      const detected = await this.iwadService.detectIWADs();
      this.splashService.setSubMessage(`${detected.length} IWAD${detected.length !== 1 ? 's' : ''} detected`);
      await this.delay(500);

      // Step 7: Query master server (only if online)
      if (this.networkStatus.isOnline()) {
        this.splashService.setMessages('Connecting to master server...', 'Finding servers');
        this.serversStore.setLoading(true);
        try {
          const masterList = await this.odalPapi.queryMasterServer('master.odamex.net');
          this.splashService.setSubMessage('Servers found');
          
          // Query game servers in background (don't wait)
          this.queryServersInBackground(masterList);
          
          await this.delay(500);
        } catch (err) {
          console.warn('Failed to query master server:', err);
          this.serversStore.setError('Unable to reach master server');
          this.splashService.setSubMessage('Unable to reach master server');
          await this.delay(500);
        }
      } else {
        this.splashService.setMessages('Offline mode', 'Server browser disabled');
        this.splashService.setSubMessage('Single player and local servers available');
        this.serversStore.setServers([]);
        await this.delay(500);
      }

      // Step 8: Initialize services
      this.splashService.setMessages('Starting services...', 'Almost ready');
      await this.delay(400);

      // Step 9: Ready!
      this.splashService.setMessages('Ready!', 'Welcome to ODX');
      await this.delay(600);

      // Hide splash screen
      this.splashService.hide();
    } catch (err) {
      console.error('Initialization error:', err);
      this.splashService.setMessages('Initialization error', 'Please check the console');
      await this.delay(2000);
      this.splashService.hide();
    }
  }

  /**
   * Query game servers in the background without blocking startup
   */
  private async queryServersInBackground(masterList: any[]): Promise<void> {
    try {
      // Query game servers in parallel with concurrency limit
      const CONCURRENT_QUERIES = 10;
      const results: any[] = new Array(masterList.length);
      const inProgress = new Set<Promise<void>>();
      let completedCount = 0;

      for (let i = 0; i < masterList.length; i++) {
        // Wait if we've hit the concurrency limit
        while (inProgress.size >= CONCURRENT_QUERIES) {
          await Promise.race(inProgress);
        }

        const index = i;
        const serverAddr = masterList[i];
        
        const promise = (async () => {
          try {
            const { server, pong } = await this.odalPapi.queryGameServer(serverAddr);
            server.ping = pong;
            results[index] = server;
            
            // Update with valid servers as they come in (every 5 servers)
            completedCount++;
            if (completedCount % 5 === 0 || completedCount === masterList.length) {
              const validServers = results.filter((s): s is any => s !== null && s.responded);
              if (validServers.length > 0) {
                this.serversStore.setServers(validServers);
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
      const validServers = results.filter((s): s is any => s !== null && s.responded);
      this.serversStore.setServers(validServers);
    } catch (err) {
      console.warn('Background server query failed:', err);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkIfFirstRun(): Promise<boolean> {
    // Check if user has completed first run setup
    const hasConfigured = await this.fileManager.hasConfiguredInstallation();
    return !hasConfigured;
  }

  /**
   * Show a dialog asking user if they want to install ODX update
   * 
   * @param version - The version to update to
   * @returns Promise resolving to true if user wants to update, false otherwise
   */
  private async showUpdatePrompt(version: string): Promise<boolean> {
    if (!window.electron) {
      return false;
    }

    try {
      // Use Electron dialog to show message box
      const response = await window.electron.showMessageBox({
        type: 'question',
        title: 'ODX Update Available',
        message: `A new version of ODX (${version}) is available.`,
        detail: 'Would you like to download and install it now? The application will restart after installation.',
        buttons: ['Install Now', 'Skip'],
        defaultId: 0,
        cancelId: 1
      });

      return response.response === 0; // 'Install Now' button
    } catch (err) {
      console.error('[App] Failed to show update prompt:', err);
      return false;
    }
  }

  async handleFirstRunChoice(choice: FirstRunChoice) {
    this.showFirstRunDialog.set(false);
    this.splashService.show();

    switch (choice.action) {
      case 'detected':
        this.splashService.setMessages('Configuring...', 'Using detected installation');
        await this.fileManager.saveFirstRunChoice('system');
        break;

      case 'download':
        this.splashService.setMessages('Configuring...', 'Preparing to download');
        await this.fileManager.saveFirstRunChoice('odx');
        
        // Download and install during startup
        try {
          this.splashService.setMessages('Downloading Odamex...', 'Fetching latest release');
          const release = await this.fileManager.getLatestRelease();
          
          if (!release) {
            throw new Error('Could not fetch latest release');
          }

          // Find the appropriate installer/package
          const isWindows = navigator.platform.toLowerCase().includes('win');
          let assetName: string;
          let assetObj: any;

          if (isWindows) {
            assetName = await this.fileManager.findInstallerAsset(release) || '';
            if (!assetName) {
              throw new Error('Could not find Windows installer in release assets');
            }
          } else {
            assetName = await this.fileManager.getPlatformAssetName();
          }

          assetObj = release.assets.find((a: any) => a.name === assetName);
          
          if (!assetObj) {
            throw new Error(`Could not find asset ${assetName} in release`);
          }

          this.splashService.setMessages('Downloading Odamex...', `Downloading ${assetName}`);
          
          // Subscribe to download progress
          const progressSubscription = this.fileManager.downloadProgress();
          const checkProgress = setInterval(() => {
            const progress = this.fileManager.downloadProgress();
            if (progress) {
              this.splashService.setProgress(progress.percent);
              this.splashService.setSubMessage(`${progress.percent.toFixed(1)}% - ${this.formatBytes(progress.bytesPerSecond)}/s`);
            }
          }, 100);

          const downloadPath = await this.fileManager.downloadFile(
            assetObj.browser_download_url,
            assetName
          );

          clearInterval(checkProgress);
          this.splashService.setProgress(null);
          this.fileManager.clearDownloadProgress();

          // Install
          if (isWindows && assetName.endsWith('.exe')) {
            this.splashService.setMessages('Installing Odamex...', 'Running installer (this may take a moment)');
            await this.fileManager.runInstaller(downloadPath);
          } else if (assetName.endsWith('.zip')) {
            this.splashService.setMessages('Installing Odamex...', 'Extracting files');
            await this.fileManager.extractZip(downloadPath);
          }

          // Save version info
          await this.fileManager.saveVersion(release.tag_name);

          this.splashService.setMessages('Installation complete!', 'Odamex has been installed successfully');
          this.splashService.setProgress(null);
          this.fileManager.clearDownloadProgress();
          await this.delay(1000);
        } catch (err: any) {
          console.error('Download/Install failed:', err);
          this.splashService.setMessages('Installation failed', err.message || 'Please try again from Settings');
          this.splashService.setProgress(null);
          this.fileManager.clearDownloadProgress();
          await this.delay(3000);
        }
        break;

      case 'custom':
        if (choice.customPath) {
          this.splashService.setMessages('Configuring...', 'Using custom path');
          await this.fileManager.saveFirstRunChoice('custom', choice.customPath);
        }
        break;
    }

    await this.delay(500);
    
    // Continue with normal initialization
    await this.continueInitialization();
  }

  private async continueInitialization() {
    try {
      // Re-check installation after first run choice
      const installInfo = await this.fileManager.getInstallationInfo();

      // Continue with update check if installed
      if (installInfo.installed && installInfo.version) {
        this.splashService.setMessages('Checking for updates...', `Current version: ${installInfo.version}`);
        await this.updatesService.checkForUpdates();
        
        const updateInfo = this.updatesService.updateDetails();
        if (updateInfo.available && updateInfo.latestVersion) {
          this.splashService.setSubMessage(`Update available: ${updateInfo.latestVersion}`);
        } else {
          this.splashService.setSubMessage('You have the latest version');
        }
        await this.delay(800);
      }

      // Check for configured WAD directories
      const hasDirectories = await this.iwadService.hasWADDirectories();
      if (!hasDirectories) {
        // Show game selection dialog
        this.splashService.hide();
        this.showGameSelectionDialog.set(true);
        return; // Wait for game selection before continuing
      }

      // Query master server
      await this.queryServers();

      // Initialize services
      this.splashService.setMessages('Starting services...', 'Almost ready');
      await this.delay(400);

      // Ready!
      this.splashService.setMessages('Ready!', 'Welcome to ODX');
      await this.delay(600);

      // Hide splash screen and navigate to home
      this.splashService.hide();
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Initialization error:', err);
      this.splashService.setMessages('Initialization error', 'Please check the console');
      await this.delay(2000);
      this.splashService.hide();
    }
  }

  async handleGameSelection() {
    this.showGameSelectionDialog.set(false);
    this.splashService.show();

    try {
      this.splashService.setMessages('Scanning for IWADs...', 'Detecting installed games');

      // Scan all configured directories for IWADs
      const detected = await this.iwadService.detectIWADs();

      this.splashService.setSubMessage(`${detected.length} IWAD${detected.length !== 1 ? 's' : ''} detected`);
      await this.delay(800);

      // Continue with initialization
      await this.finishInitialization();
    } catch (err: any) {
      console.error('Failed to scan for IWADs:', err);
      this.splashService.setMessages('Scan error', err.message || 'Please try again');
      await this.delay(2000);
      this.splashService.hide();
    }
  }

  handleGameSelectionCancelled() {
    // User cancelled game selection - just continue without games
    this.showGameSelectionDialog.set(false);
    this.splashService.show();
    this.finishInitialization();
  }

  private async finishInitialization() {
    // Query master server
    await this.queryServers();

    // Initialize services
    this.splashService.setMessages('Starting services...', 'Almost ready');
    await this.delay(400);

    // Ready!
    this.splashService.setMessages('Ready!', 'Welcome to ODX');
    await this.delay(600);

    // Hide splash screen and navigate to home
    this.splashService.hide();
    this.router.navigate(['/']);
  }

  private async queryServers() {
    this.splashService.setMessages('Connecting to master server...', 'Finding servers');
    this.serversStore.setLoading(true);
    try {
      const masterList = await this.odalPapi.queryMasterServer('master.odamex.net');
      this.splashService.setSubMessage('Servers found');
      
      // Query servers in background
      this.queryServersInBackground(masterList);
      
      await this.delay(500);
    } catch (err) {
      console.warn('Failed to query master server:', err);
      this.serversStore.setError('Unable to reach master server');
      this.splashService.setSubMessage('Unable to reach master server');
      await this.delay(500);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
