import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy, ElementRef, AfterViewInit, input, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SettingsCardComponent } from '@shared/components';
import { 
  NotificationService,
  PeriodicUpdateService,
  AutoUpdateService,
  UpdatesService,
  ServerRefreshService,
  FileManagerService,
  AppSettingsService,
  ControllerService,
  ControllerFocusService,
  SettingsFormControllerService,
  GamepadButton
} from '@shared/services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-application-settings',
  imports: [CommonModule, FormsModule, SettingsCardComponent],
  templateUrl: './application-settings.component.html',
  styleUrls: ['./application-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SettingsFormControllerService]
})
export class ApplicationSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  protected notificationService = inject(NotificationService);
  protected periodicUpdateService = inject(PeriodicUpdateService);
  protected autoUpdateService = inject(AutoUpdateService);
  protected updatesService = inject(UpdatesService);
  protected refreshService = inject(ServerRefreshService);
  private fileManager = inject(FileManagerService);
  private appSettings = inject(AppSettingsService);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  private formController = inject(SettingsFormControllerService);
  private elementRef = inject(ElementRef);
  private controllerSubscription?: Subscription;
  
  // Track when we just entered content mode to avoid processing the same A button press
  private justEnteredContent = false;
  
  // Only process button presses after explicitly entering content mode
  private canProcessButtons = false;
  
  // Input from parent to know when parent is in content mode
  parentNavigationState = input.required<Signal<'tabs' | 'content'>>();

  // Application settings
  filterByVersion = signal(true);
  quitOnClose = signal(false);
  
  // Developer mode (computed from service)
  developerMode = computed(() => this.appSettings.developerMode());
  
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

    // Subscribe to controller events
    const removeListener = this.controllerService.addEventListener((event) => {
      // Only handle events when we have content focus
      if (!this.focusService.hasFocus('content')) return;

      if (event.type === 'direction') {
        this.formController.handleDirection(event);
      } else if (event.type === 'buttonpress') {
        // Only process button presses after we've explicitly entered content mode
        if (!this.canProcessButtons) {
          return;
        }
        this.formController.handleButtonPress(event);
      }
    });
    
    // Store cleanup function
    this.controllerSubscription = { unsubscribe: removeListener } as any;
    
    // Listen for parent telling us to enter content mode
    window.addEventListener('settingsEnterContent', this.onEnterContent);
    window.addEventListener('settingsExitContent', this.onExitContent);
  }
  
  private onEnterContent = () => {
    // Set flag to ignore the A button that triggered this entry
    this.justEnteredContent = true;
    
    // Enable button processing now that we're in content mode
    this.canProcessButtons = true;
    
    // Focus first control when entering this tab's content
    this.formController.focusFirst();
    
    // Clear the flag after a short delay
    setTimeout(() => {
      this.justEnteredContent = false;
    }, 200);
  };
  
  private onExitContent = () => {
    // Disable button processing when exiting content mode
    this.canProcessButtons = false;
    this.formController.cleanup();
  };

  ngAfterViewInit(): void {
    // Find and setup focusable elements
    setTimeout(() => {
      this.formController.findFocusableElements(this.elementRef);
    }, 150);
  }

  ngOnDestroy(): void {
    this.controllerSubscription?.unsubscribe();
    this.formController.cleanup();
    window.removeEventListener('settingsEnterContent', this.onEnterContent);
    window.removeEventListener('settingsExitContent', this.onExitContent);
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

  toggleDeveloperMode() {
    this.appSettings.setDeveloperMode(!this.developerMode());
  }

  async openLogDirectory() {
    try {
      const logDir = await window.electron.openLogDirectory();
      console.log('[Settings] Opened log directory:', logDir);
    } catch (error) {
      console.error('[Settings] Failed to open log directory:', error);
    }
  }

  async copyLogPath() {
    try {
      const logPath = await window.electron.getLogPath();
      await navigator.clipboard.writeText(logPath);
      console.log('[Settings] Copied log path to clipboard:', logPath);
    } catch (error) {
      console.error('[Settings] Failed to copy log path:', error);
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

