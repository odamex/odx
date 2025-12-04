import { Injectable, signal } from '@angular/core';

/**
 * User preferences for system notifications
 */
export interface NotificationSettings {
  /** Master switch for all notifications */
  enabled: boolean;
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
      window.electron.showNotification(title, body);
      console.log(`[NotificationService] Showed ${type} notification:`, title);
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
      const serverActivity = localStorage.getItem('notificationsServerActivity');
      const updates = localStorage.getItem('notificationsUpdates');
      
      return {
        enabled: enabled !== null ? enabled === 'true' : true,
        serverActivity: serverActivity !== null ? serverActivity === 'true' : true,
        updates: updates !== null ? updates === 'true' : true
      };
    } catch (err) {
      console.warn('[NotificationService] Failed to load settings from localStorage:', err);
      // Return defaults if localStorage fails
      return {
        enabled: true,
        serverActivity: true,
        updates: true
      };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem('notificationsEnabled', String(settings.enabled));
      localStorage.setItem('notificationsServerActivity', String(settings.serverActivity));
      localStorage.setItem('notificationsUpdates', String(settings.updates));
    } catch (err) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', err);
    }
  }
}
