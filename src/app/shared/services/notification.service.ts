import { Injectable, signal } from '@angular/core';

/**
 * User preferences for system notifications
 */
export interface NotificationSettings {
  /** Master switch for all notifications */
  enabled: boolean;
  
  // Notification Methods (how notifications are delivered)
  /** Show system/desktop notifications */
  systemNotifications: boolean;
  /** Flash taskbar and play sound */
  taskbarFlash: boolean;
  
  // Notification Types (what triggers notifications)
  /** Enable notifications for server activity (player joins/leaves) */
  serverActivity: boolean;
  /** Enable notifications for software updates */
  updates: boolean;
  
  // Advanced Settings
  /** Maximum number of notifications to queue while away (0 = unlimited) */
  queueLimit: number;
  /** Minutes of inactivity before suppressing notifications (0 = only on lock/sleep) */
  idleThresholdMinutes: number;
}

/**
 * Shared service for managing system notifications
 * 
 * Handles both server activity notifications and update notifications.
 * Respects user preferences stored in localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly _settings = signal<NotificationSettings>(this.loadSettings());
  
  /** Current notification settings */
  readonly settings = this._settings.asReadonly();

  constructor() {
    // Log initial settings
    const settings = this._settings();
    console.log('[NotificationService] Initialized with settings:', settings);
    
    // Send initial settings to main process
    this.syncSettingsToMainProcess(settings);
  }

  /**
   * Show a system notification
   * 
   * @param title Notification title
   * @param body Notification body text
   * @param type Type of notification (affects filtering by user settings)
   * @param serverId Optional server identifier for server-related notifications
   */
  show(title: string, body: string, type: 'server-activity' | 'update' = 'server-activity', serverId?: string): void {
    const settings = this._settings();
    
    // Check if notifications are enabled globally
    if (!settings.enabled) {
      console.log('[NotificationService] Notifications disabled globally');
      return;
    }
    
    // Check type-specific settings
    if (type === 'server-activity' && !settings.serverActivity) {
      console.log('[NotificationService] Server activity notifications disabled');
      return;
    }
    
    if (type === 'update' && !settings.updates) {
      console.log('[NotificationService] Update notifications disabled');
      return;
    }
    
    try {
      // Show system notification if enabled
      if (settings.systemNotifications) {
        window.electron.showNotification(title, body, serverId);
        console.log(`[NotificationService] Showed ${type} notification:`, title, serverId ? `(server: ${serverId})` : '');
      }
      
      // Flash taskbar and play sound if enabled
      if (settings.taskbarFlash) {
        window.electron.flashWindow();
        console.log('[NotificationService] Flashed taskbar');
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to show notification:', err);
    }
  }

  /**
   * Update notification settings
   * 
   * @param settings New settings (partial update supported)
   */
  updateSettings(settings: Partial<NotificationSettings>): void {
    const current = this._settings();
    const updated = { ...current, ...settings };
    
    this._settings.set(updated);
    this.saveSettings(updated);
    
    console.log('[NotificationService] Settings updated:', updated);
    
    // Sync to main process
    this.syncSettingsToMainProcess(updated);
  }

  /**
   * Sync settings to the main Electron process
   */
  private syncSettingsToMainProcess(settings: NotificationSettings): void {
    try {
      window.electron.updateNotificationSettings(
        settings.queueLimit,
        settings.idleThresholdMinutes
      );
    } catch (err) {
      console.warn('[NotificationService] Failed to sync settings to main process:', err);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): NotificationSettings {
    try {
      // Load individual settings with fallback to defaults
      const enabled = localStorage.getItem('notificationsEnabled');
      const systemNotifications = localStorage.getItem('notificationsSystem');
      const serverActivity = localStorage.getItem('notificationsServerActivity');
      const updates = localStorage.getItem('notificationsUpdates');
      const taskbarFlash = localStorage.getItem('notificationsTaskbarFlash');
      const queueLimit = localStorage.getItem('notificationsQueueLimit');
      const idleThreshold = localStorage.getItem('notificationsIdleThreshold');
      
      return {
        enabled: enabled !== null ? enabled === 'true' : true,
        systemNotifications: systemNotifications !== null ? systemNotifications === 'true' : true,
        serverActivity: serverActivity !== null ? serverActivity === 'true' : true,
        updates: updates !== null ? updates === 'true' : true,
        taskbarFlash: taskbarFlash !== null ? taskbarFlash === 'true' : true,
        queueLimit: queueLimit !== null ? parseInt(queueLimit, 10) : 50,
        idleThresholdMinutes: idleThreshold !== null ? parseInt(idleThreshold, 10) : 0
      };
    } catch (err) {
      console.warn('[NotificationService] Failed to load settings from localStorage:', err);
      // Return defaults if localStorage fails
      return {
        enabled: true,
        systemNotifications: true,
        serverActivity: true,
        updates: true,
        taskbarFlash: true,
        queueLimit: 50,
        idleThresholdMinutes: 0
      };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem('notificationsEnabled', String(settings.enabled));
      localStorage.setItem('notificationsSystem', String(settings.systemNotifications));
      localStorage.setItem('notificationsServerActivity', String(settings.serverActivity));
      localStorage.setItem('notificationsUpdates', String(settings.updates));
      localStorage.setItem('notificationsTaskbarFlash', String(settings.taskbarFlash));
      localStorage.setItem('notificationsQueueLimit', String(settings.queueLimit));
      localStorage.setItem('notificationsIdleThreshold', String(settings.idleThresholdMinutes));
    } catch (err) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', err);
    }
  }
}
