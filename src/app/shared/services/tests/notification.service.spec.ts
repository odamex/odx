import { TestBed } from '@angular/core/testing';
import { NotificationService, NotificationSettings } from '../notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockElectron: any;

  const defaultSettings: NotificationSettings = {
    enabled: true,
    systemNotifications: true,
    taskbarFlash: true,
    serverActivity: true,
    updates: true,
    queueLimit: 50,
    idleThresholdMinutes: 0
  };

  beforeEach(() => {
    localStorage.clear();
    
    // Mock window.electron
    mockElectron = {
      showNotification: jasmine.createSpy('showNotification'),
      updateNotificationSettings: jasmine.createSpy('updateNotificationSettings'),
      flashWindow: jasmine.createSpy('flashWindow')
    };
    (window as any).electron = mockElectron;
    
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).electron;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load default settings when localStorage is empty', () => {
      const settings = service.settings();
      expect(settings.enabled).toBe(true);
      expect(settings.systemNotifications).toBe(true);
      expect(settings.taskbarFlash).toBe(true);
      expect(settings.serverActivity).toBe(true);
      expect(settings.updates).toBe(true);
      expect(settings.queueLimit).toBe(50);
      expect(settings.idleThresholdMinutes).toBe(0);
    });

    it('should sync settings to main process on initialization', () => {
      expect(mockElectron.updateNotificationSettings).toHaveBeenCalledWith(
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });

    it('should load saved settings from localStorage', () => {
      // Reset and configure with localStorage already set
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem('notificationsEnabled', 'false');
      localStorage.setItem('notificationsQueueLimit', '20');
      
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(NotificationService);
      
      expect(newService.settings().enabled).toBe(false);
      expect(newService.settings().queueLimit).toBe(20);
    });
  });

  describe('updateSettings', () => {
    it('should update settings', () => {
      const newSettings: NotificationSettings = {
        ...defaultSettings,
        enabled: false,
        queueLimit: 15
      };
      
      service.updateSettings(newSettings);
      
      expect(service.settings().enabled).toBe(false);
      expect(service.settings().queueLimit).toBe(15);
    });

    it('should persist settings to localStorage', () => {
      const newSettings: NotificationSettings = {
        ...defaultSettings,
        systemNotifications: false
      };
      
      service.updateSettings(newSettings);
      
      // Check individual localStorage key
      const storedSystemNotifications = localStorage.getItem('notificationsSystem');
      expect(storedSystemNotifications).toBe('false');
    });

    it('should sync settings to main process', () => {
      mockElectron.updateNotificationSettings.calls.reset();
      
      const newSettings: NotificationSettings = {
        ...defaultSettings,
        queueLimit: 25,
        idleThresholdMinutes: 10
      };
      
      service.updateSettings(newSettings);
      
      expect(mockElectron.updateNotificationSettings).toHaveBeenCalledWith(25, 10);
    });
  });

  describe('show', () => {
    it('should show notification when all settings are enabled', () => {
      service.show('Test Title', 'Test Body', 'server-activity');
      
      expect(mockElectron.showNotification).toHaveBeenCalledWith('Test Title', 'Test Body');
    });

    it('should not show notification when notifications are disabled', () => {
      service.updateSettings({ enabled: false });
      mockElectron.showNotification.calls.reset();
      
      service.show('Test', 'Test', 'server-activity');
      
      expect(mockElectron.showNotification).not.toHaveBeenCalled();
    });

    it('should not show notification when system notifications are disabled', () => {
      service.updateSettings({ systemNotifications: false });
      mockElectron.showNotification.calls.reset();
      
      service.show('Test', 'Test', 'server-activity');
      
      expect(mockElectron.showNotification).not.toHaveBeenCalled();
    });

    it('should not show server-activity notification when serverActivity is disabled', () => {
      service.updateSettings({ serverActivity: false });
      mockElectron.showNotification.calls.reset();
      
      service.show('Test', 'Test', 'server-activity');
      
      expect(mockElectron.showNotification).not.toHaveBeenCalled();
    });

    it('should not show update notification when updates is disabled', () => {
      service.updateSettings({ updates: false });
      mockElectron.showNotification.calls.reset();
      
      service.show('Test', 'Test', 'update');
      
      expect(mockElectron.showNotification).not.toHaveBeenCalled();
    });

    it('should handle missing electron API gracefully', () => {
      delete (window as any).electron;
      
      expect(() => service.show('Test', 'Test', 'server-activity')).not.toThrow();
    });
  });

  describe('settings persistence', () => {
    it('should save to localStorage when updated', () => {
      service.updateSettings({ enabled: false });
      
      const saved = localStorage.getItem('notificationsEnabled');
      expect(saved).toBe('false');
    });

    it('should load from localStorage on initialization', () => {
      // Reset and configure with localStorage already set
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem('notificationsEnabled', 'false');
      localStorage.setItem('notificationsQueueLimit', '100');
      
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(NotificationService);
      
      expect(newService.settings().enabled).toBe(false);
      expect(newService.settings().queueLimit).toBe(100);
    });
  });
});
