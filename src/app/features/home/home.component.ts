import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, ViewChildren, QueryList, ElementRef, OnDestroy, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FileManagerService, GitHubService, ControllerService, ControllerFocusService, GamepadButton, type InstallationInfo, type GitHubDiscussion, type ControllerEvent } from '@shared/services';
import { ServersStore } from '@app/store';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChildren('actionLink') actionLinks!: QueryList<ElementRef>;
  @ViewChildren('actionButton') actionButtons!: QueryList<ElementRef>;
  
  private router = inject(Router);
  private fileManager = inject(FileManagerService);
  private serversStore = inject(ServersStore);
  protected githubService = inject(GitHubService);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  
  private controllerUnsubscribe?: () => void;
  private currentFocusIndex = 0;
  private justEnteredContent = false;

  constructor() {
    // Watch for content focus and auto-focus first action link
    effect(() => {
      if (this.focusService.focusArea() === 'content') {
        // Set flag to prevent immediate activation
        this.justEnteredContent = true;
        setTimeout(() => {
          this.focusCurrentItem();
          // Clear flag after button press would have been processed
          setTimeout(() => this.justEnteredContent = false, 100);
        }, 50);
      }
    });
  }

  installInfo = signal<InstallationInfo | null>(null);
  latestRelease = signal<any>(null);
  loading = signal(true);
  latestNews = signal<GitHubDiscussion | null>(null);
  loadingNews = signal(true);

  // Current version for compatibility checking
  currentMajorVersion = signal<number | null>(null);
  currentMinorVersion = signal<number | null>(null);

  // Server stats from store - filtered by version compatibility
  serverCount = computed(() => {
    const servers = this.serversStore.servers();
    const major = this.currentMajorVersion();
    const minor = this.currentMinorVersion();
    
    // If no version info, show all servers
    if (major === null || minor === null) return servers.length;
    
    // Filter to compatible servers only
    return servers.filter(server => {
      if (server.versionMajor === null || server.versionMinor === null) return true;
      if (server.versionMajor !== major) return false;
      return server.versionMinor <= minor;
    }).length;
  });

  playerCount = computed(() => {
    const servers = this.serversStore.servers();
    const major = this.currentMajorVersion();
    const minor = this.currentMinorVersion();
    
    // If no version info, count all players
    if (major === null || minor === null) {
      return servers.reduce((total, server) => 
        total + (server.players?.length || 0), 0
      );
    }
    
    // Count players only from compatible servers
    return servers
      .filter(server => {
        if (server.versionMajor === null || server.versionMinor === null) return true;
        if (server.versionMajor !== major) return false;
        return server.versionMinor <= minor;
      })
      .reduce((total, server) => total + (server.players?.length || 0), 0);
  });

  async ngOnInit() {
    try {
      // Use cached data - this will return immediately if data is already loaded
      const [info, release] = await Promise.all([
        this.fileManager.getInstallationInfo(), // Returns cached data
        this.fileManager.getLatestRelease()      // Returns cached data
      ]);

      // Check for updates if installed (only needs to happen once per session)
      if (info.installed && info.version && !info.latestVersion) {
        const updateCheck = await this.fileManager.checkForUpdates(info.version);
        info.needsUpdate = updateCheck.needsUpdate;
        info.latestVersion = updateCheck.latestVersion;
      }

      this.installInfo.set(info);
      this.latestRelease.set(release);

      // Extract version for server filtering
      if (info.installed && info.version) {
        const parts = info.version.split('.');
        if (parts.length >= 2) {
          this.currentMajorVersion.set(parseInt(parts[0], 10));
          this.currentMinorVersion.set(parseInt(parts[1], 10));
        }
      }
    } catch (err) {
      console.error('Failed to check installation status:', err);
    } finally {
      this.loading.set(false);
    }

    // Load latest news (non-blocking)
    this.loadLatestNews();
    
    // Setup controller event listener
    this.controllerUnsubscribe = this.controllerService.addEventListener(
      (event: ControllerEvent) => this.handleControllerEvent(event)
    );
  }

  ngOnDestroy() {
    this.controllerUnsubscribe?.();
  }

  private handleControllerEvent(event: ControllerEvent) {
    // Only handle events when content area has focus
    if (!this.focusService.hasFocus('content')) return;
    
    // Ignore events immediately after entering content to prevent the navigation A press from activating items
    if (this.justEnteredContent) return;

    // Handle direction events (D-pad and analog stick)
    if (event.type === 'direction') {
      switch (event.direction) {
        case 'left':
          this.navigateUp();
          break;
        case 'right':
          this.navigateDown();
          break;
      }
      return;
    }

    // Handle button press events
    if (event.type === 'buttonpress') {
      switch (event.button) {
        case GamepadButton.A:
          this.activateCurrentItem();
          break;
        case GamepadButton.B:
          this.focusService.returnToNavigation();
          break;
      }
    }
  }

  private navigateUp() {
    const totalItems = this.getTotalItems();
    if (totalItems === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex - 1 + totalItems) % totalItems;
    this.focusCurrentItem();
  }

  private navigateDown() {
    const totalItems = this.getTotalItems();
    if (totalItems === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex + 1) % totalItems;
    this.focusCurrentItem();
  }

  private getTotalItems(): number {
    return this.actionLinks.length + this.actionButtons.length;
  }

  private focusCurrentItem() {
    const allItems = [...this.actionLinks.toArray(), ...this.actionButtons.toArray()];
    if (allItems.length > 0 && allItems[this.currentFocusIndex]) {
      allItems[this.currentFocusIndex].nativeElement.focus();
    }
  }

  private activateCurrentItem() {
    const allItems = [...this.actionLinks.toArray(), ...this.actionButtons.toArray()];
    if (allItems.length > 0 && allItems[this.currentFocusIndex]) {
      allItems[this.currentFocusIndex].nativeElement.click();
    }
  }

  async loadLatestNews() {
    try {
      const discussions = await this.githubService.getLatestNews(1);
      if (discussions.length > 0) {
        this.latestNews.set(discussions[0]);
      }
    } catch (err) {
      console.error('Failed to load latest news:', err);
    } finally {
      this.loadingNews.set(false);
    }
  }

  openNewsLink(url: string) {
    if (window.electron) {
      window.electron.openExternal(url);
    }
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  getPlatformIcon(): string {
    const platform = window.electron.platform;
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'apple';
    return 'tux';
  }

  getPlatformText(): string {
    const platform = window.electron.platform;
    if (platform === 'win32') return 'Download for Windows';
    if (platform === 'darwin') return 'Download for MacOS';
    return 'Download for Linux';
  }
}
