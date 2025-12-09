import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsCardComponent } from '@shared/components';
import { 
  NotificationService,
  PeriodicUpdateService,
  AutoUpdateService,
  UpdatesService,
  ServerRefreshService,
  FileManagerService
} from '@shared/services';

@Component({
  selector: 'app-application-settings',
  imports: [FormsModule, SettingsCardComponent],
  templateUrl: './application-settings.component.html',
  styleUrls: ['./application-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApplicationSettingsComponent implements OnInit {
  protected notificationService = inject(NotificationService);
  protected periodicUpdateService = inject(PeriodicUpdateService);
  protected autoUpdateService = inject(AutoUpdateService);
  protected updatesService = inject(UpdatesService);
  protected refreshService = inject(ServerRefreshService);
  private fileManager = inject(FileManagerService);

  // Application settings
  filterByVersion = signal(true);
  quitOnClose = signal(false);
  
  // Notification settings (computed from services)
  notificationsEnabled = computed(() => this.notificationService.settings().enabled);
  notificationsSystem = computed(() => this.notificationService.settings().systemNotifications);
  notificationsTaskbarFlash = computed(() => this.notificationService.settings().taskbarFlash);
  notificationsServerActivity = computed(() => this.notificationService.settings().serverActivity);
  notificationsUpdates = computed(() => this.notificationService.settings().updates);
  notificationsQueueLimit = computed(() => this.notificationService.settings().queueLimit);
  notificationsIdleThreshold = computed(() => this.notificationService.settings().idleThresholdMinutes);
  
  // Periodic update settings (computed from service)
  periodicUpdateEnabled = computed(() => this.periodicUpdateService.settings().enabled);
  periodicUpdateInterval = computed(() => this.periodicUpdateService.settings().intervalMinutes);
  
  // Auto-update settings (computed from service)
  autoUpdateEnabled = computed(() => this.autoUpdateService.isAutoUpdateEnabled());

  ngOnInit() {
    // Load from localStorage
    const savedFilterByVersion = localStorage.getItem('filterByVersion');
    if (savedFilterByVersion !== null) {
      this.filterByVersion.set(savedFilterByVersion === 'true');
    }

    const savedQuitOnClose = localStorage.getItem('quitOnClose');
    if (savedQuitOnClose !== null) {
      this.quitOnClose.set(savedQuitOnClose === 'true');
    }
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

  togglePeriodicUpdateCheck() {
    const current = this.periodicUpdateService.settings();
    this.periodicUpdateService.updateSettings({ enabled: !current.enabled });
  }

  toggleAutoUpdate() {
    const newValue = !this.autoUpdateService.isAutoUpdateEnabled();
    this.autoUpdateService.setAutoUpdateEnabled(newValue);
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
        alert('Failed to reset configuration');
      }
    }
  }
}

