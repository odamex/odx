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
    console.log('[NotificationService] Initialized with settings:', this._settings());
  }

  /**
   * Show a system notification
   * 
   * @param title Notification title
   * @param body Notification body text
   * @param type Type of notification (affects filtering by user settings)
   */
  show(title: string, body: string, type: 'server-activity' | 'update' = 'server-activity'): void {
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
        window.electron.showNotification(title, body);
        console.log(`[NotificationService] Showed ${type} notification:`, title);
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
      
      return {
        enabled: enabled !== null ? enabled === 'true' : true,
        systemNotifications: systemNotifications !== null ? systemNotifications === 'true' : true,
        serverActivity: serverActivity !== null ? serverActivity === 'true' : true,
        updates: updates !== null ? updates === 'true' : true,
        taskbarFlash: taskbarFlash !== null ? taskbarFlash === 'true' : true
      };
    } catch (err) {
      console.warn('[NotificationService] Failed to load settings from localStorage:', err);
      // Return defaults if localStorage fails
      return {
        enabled: true,
        systemNotifications: true,
        serverActivity: true,
        updates: true,
        taskbarFlash: true
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
    } catch (err) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', err);
    }
  }
}
