import { TestBed } from '@angular/core/testing';
import { AppSettingsService } from '../app-settings.service';
import { ControllerSchema } from '../controller.service';

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

  describe('controller settings', () => {
    describe('default values', () => {
      it('should default controller enabled to true', () => {
        expect(service.controllerEnabled()).toBe(true);
      });

      it('should default controller schema to xbox', () => {
        expect(service.controllerSchema()).toBe('xbox');
      });

      it('should default controller deadzone to 0.15', () => {
        expect(service.controllerDeadzone()).toBe(0.15);
      });

      it('should default show button prompts to false', () => {
        expect(service.controllerShowButtonPrompts()).toBe(false);
      });
    });

    describe('setControllerEnabled', () => {
      it('should update controller enabled state', () => {
        service.setControllerEnabled(false);
        expect(service.controllerEnabled()).toBe(false);
      });

      it('should persist to localStorage', () => {
        service.setControllerEnabled(false);
        const saved = JSON.parse(localStorage.getItem('controllerSettings')!);
        expect(saved.enabled).toBe(false);
      });
    });

    describe('setControllerSchema', () => {
      it('should update controller schema', () => {
        service.setControllerSchema('playstation');
        expect(service.controllerSchema()).toBe('playstation');
      });

      it('should persist to localStorage', () => {
        service.setControllerSchema('playstation');
        const saved = JSON.parse(localStorage.getItem('controllerSettings')!);
        expect(saved.schema).toBe('playstation');
      });

      it('should accept all valid schemas', () => {
        const schemas: ControllerSchema[] = ['xbox', 'playstation', 'generic'];
        schemas.forEach(schema => {
          service.setControllerSchema(schema);
          expect(service.controllerSchema()).toBe(schema);
        });
      });
    });

    describe('setControllerDeadzone', () => {
      it('should update controller deadzone', () => {
        service.setControllerDeadzone(0.25);
        expect(service.controllerDeadzone()).toBe(0.25);
      });

      it('should persist to localStorage', () => {
        service.setControllerDeadzone(0.25);
        const saved = JSON.parse(localStorage.getItem('controllerSettings')!);
        expect(saved.deadzone).toBe(0.25);
      });
    });

    describe('setControllerShowButtonPrompts', () => {
      it('should update show button prompts', () => {
        service.setControllerShowButtonPrompts(true);
        expect(service.controllerShowButtonPrompts()).toBe(true);
      });

      it('should persist to localStorage', () => {
        service.setControllerShowButtonPrompts(true);
        const saved = JSON.parse(localStorage.getItem('controllerSettings')!);
        expect(saved.showButtonPrompts).toBe(true);
      });
    });

    describe('persistence', () => {
      it('should load controller settings from localStorage', () => {
        const settings = {
          enabled: false,
          schema: 'playstation' as ControllerSchema,
          deadzone: 0.3,
          showButtonPrompts: true
        };
        localStorage.setItem('controllerSettings', JSON.stringify(settings));

        const newService = new AppSettingsService();

        expect(newService.controllerEnabled()).toBe(false);
        expect(newService.controllerSchema()).toBe('playstation');
        expect(newService.controllerDeadzone()).toBe(0.3);
        expect(newService.controllerShowButtonPrompts()).toBe(true);
      });

      it('should handle corrupted localStorage data gracefully', () => {
        localStorage.setItem('controllerSettings', 'invalid json');

        const newService = new AppSettingsService();

        // Should use defaults
        expect(newService.controllerEnabled()).toBe(true);
        expect(newService.controllerSchema()).toBe('xbox');
        expect(newService.controllerDeadzone()).toBe(0.15);
        expect(newService.controllerShowButtonPrompts()).toBe(false);
      });

      it('should save all controller settings together', () => {
        service.setControllerEnabled(false);
        service.setControllerSchema('generic');
        service.setControllerDeadzone(0.2);
        service.setControllerShowButtonPrompts(true);

        const saved = JSON.parse(localStorage.getItem('controllerSettings')!);
        expect(saved).toEqual({
          enabled: false,
          schema: 'generic',
          deadzone: 0.2,
          showButtonPrompts: true
        });
      });
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
