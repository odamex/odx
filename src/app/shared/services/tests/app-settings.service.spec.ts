import { TestBed } from '@angular/core/testing';
import { AppSettingsService } from '../app-settings.service';

describe('AppSettingsService', () => {
  let service: AppSettingsService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppSettingsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('developerMode', () => {
    it('should default to false when no saved value exists', () => {
      expect(service.developerMode()).toBe(false);
    });

    it('should load saved value from localStorage on initialization', () => {
      // Clear current service
      localStorage.clear();
      
      // Set value in localStorage before creating service
      localStorage.setItem('developerMode', 'true');
      
      // Create a new service instance using TestBed
      const newService = new AppSettingsService();
      
      expect(newService.developerMode()).toBe(true);
    });

    it('should return readonly signal', () => {
      const mode = service.developerMode();
      expect(typeof mode).toBe('boolean');
    });
  });

  describe('setDeveloperMode', () => {
    it('should update developer mode to true', () => {
      service.setDeveloperMode(true);
      expect(service.developerMode()).toBe(true);
    });

    it('should update developer mode to false', () => {
      service.setDeveloperMode(true);
      service.setDeveloperMode(false);
      expect(service.developerMode()).toBe(false);
    });

    it('should persist true value to localStorage', () => {
      service.setDeveloperMode(true);
      expect(localStorage.getItem('developerMode')).toBe('true');
    });

    it('should persist false value to localStorage', () => {
      service.setDeveloperMode(false);
      expect(localStorage.getItem('developerMode')).toBe('false');
    });

    it('should update signal reactively', () => {
      const initialValue = service.developerMode();
      service.setDeveloperMode(!initialValue);
      expect(service.developerMode()).toBe(!initialValue);
    });
  });

  describe('persistence', () => {
    it('should maintain state across service instances', () => {
      service.setDeveloperMode(true);
      
      // Create new service instance
      const newService = new AppSettingsService();
      
      expect(newService.developerMode()).toBe(true);
    });

    it('should handle invalid localStorage values gracefully', () => {
      localStorage.setItem('developerMode', 'invalid');
      
      const newService = new AppSettingsService();
      
      // Should default to false for invalid values
      expect(newService.developerMode()).toBe(false);
    });
  });
});
