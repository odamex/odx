import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FileManagerService, InstallationInfo } from '@shared/services/file-manager/file-manager.service';
import { ServersStore } from '@shared/services/odalpapi/servers.store';

@Component({
  selector: 'app-home',
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

  // Server stats from store
  serverCount = computed(() => this.serversStore.servers().length);
  playerCount = computed(() => {
    return this.serversStore.servers().reduce((total, server) => 
      total + (server.players?.length || 0), 0
    );
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
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'apple';
    return 'tux';
  }

  getPlatformText(): string {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'Download for Windows';
    if (platform.includes('mac')) return 'Download for MacOS';
    return 'Download for Linux';
  }
}
