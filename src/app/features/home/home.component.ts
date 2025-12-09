import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FileManagerService, type InstallationInfo } from '@shared/services';
import { ServersStore } from '@app/store';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private fileManager = inject(FileManagerService);
  private serversStore = inject(ServersStore);

  installInfo = signal<InstallationInfo | null>(null);
  latestRelease = signal<any>(null);
  loading = signal(true);

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
