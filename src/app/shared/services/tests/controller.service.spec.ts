import { TestBed } from '@angular/core/testing';
import { ControllerService, GamepadButton, GamepadAxis, ControllerEvent } from '../controller.service';
import { AppSettingsService } from '../app-settings.service';

describe('ControllerService', () => {
  let service: ControllerService;
  let appSettings: AppSettingsService;
  let mockGamepad: Partial<Gamepad>;

  beforeEach(() => {
    localStorage.clear();

    // Mock gamepad
    mockGamepad = {
      index: 0,
      id: 'Xbox Controller (STANDARD GAMEPAD Vendor: 045e Product: 02ea)',
      connected: true,
      timestamp: Date.now(),
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array(17).fill(null).map(() => ({
        pressed: false,
        touched: false,
        value: 0
      }))
    };

    // Mock navigator.getGamepads()
    Object.defineProperty(navigator, 'getGamepads', {
      writable: true,
      value: () => [mockGamepad as Gamepad]
    });

    TestBed.configureTestingModule({
      providers: [ControllerService, AppSettingsService]
    });

    appSettings = TestBed.inject(AppSettingsService);
    service = TestBed.inject(ControllerService);
  });

  afterEach(() => {
    localStorage.clear();
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should start with no controller connected', () => {
      expect(service.connected()).toBe(false);
    });

    it('should have default active gamepad index of -1', () => {
      expect(service.activeGamepadIndex()).toBe(-1);
    });

    it('should sync settings from AppSettingsService', () => {
      expect(service.enabled()).toBe(appSettings.controllerEnabled());
      expect(service.schema()).toBe(appSettings.controllerSchema());
      expect(service.deadzone()).toBe(appSettings.controllerDeadzone());
    });
  });

  describe('gamepad connection', () => {
    it('should detect gamepad connection', () => {
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.connected()).toBe(true);
      expect(service.activeGamepadIndex()).toBe(0);
    });

    it('should auto-detect Xbox controller schema', () => {
      Object.defineProperty(mockGamepad, 'id', {
        value: 'Xbox Controller (STANDARD GAMEPAD Vendor: 045e Product: 02ea)',
        writable: true,
        configurable: true
      });
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.schema()).toBe('xbox');
    });

    it('should auto-detect PlayStation controller schema', () => {
      Object.defineProperty(mockGamepad, 'id', {
        value: 'Sony DualShock 4 (STANDARD GAMEPAD Vendor: 054c Product: 09cc)',
        writable: true,
        configurable: true
      });
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.schema()).toBe('playstation');
    });

    it('should auto-detect PlayStation controller with DualSense name', () => {
      Object.defineProperty(mockGamepad, 'id', {
        value: 'DualSense Wireless Controller',
        writable: true,
        configurable: true
      });
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.schema()).toBe('playstation');
    });

    it('should auto-detect Nintendo controller schema', () => {
      Object.defineProperty(mockGamepad, 'id', {
        value: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)',
        writable: true,
        configurable: true
      });
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.schema()).toBe('nintendo');
    });

    it('should not change schema for unrecognized controllers', () => {
      appSettings.setControllerSchema('xbox');
      Object.defineProperty(mockGamepad, 'id', {
        value: 'Unknown Generic Controller',
        writable: true,
        configurable: true
      });
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      // Should keep existing schema
      expect(service.schema()).toBe('xbox');
    });

    it('should emit connected event', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'connected') {
          expect(event.gamepadIndex).toBe(0);
          unsubscribe();
          done();
        }
      });

      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);
    });

    it('should store controller name', () => {
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.controllerName()).toBe(mockGamepad.id!);
    });
  });

  describe('gamepad disconnection', () => {
    beforeEach(() => {
      // Connect gamepad first
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);
    });

    it('should detect gamepad disconnection', () => {
      const event = new Event('gamepaddisconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);

      expect(service.connected()).toBe(false);
      expect(service.activeGamepadIndex()).toBe(-1);
      expect(service.controllerName()).toBe('');
    });

    it('should emit disconnected event', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'disconnected') {
          expect(event.gamepadIndex).toBe(0);
          unsubscribe();
          done();
        }
      });

      const event = new Event('gamepaddisconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });

      window.dispatchEvent(event);
    });
  });

  describe('button detection', () => {
    beforeEach(() => {
      // Connect gamepad
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);
    });

    it('should detect button press', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'buttonpress') {
          expect(event.button).toBe(GamepadButton.A);
          unsubscribe();
          done();
        }
      });

      // Simulate button press
      (mockGamepad.buttons![GamepadButton.A] as any).pressed = true;
    });

    it('should detect button release', (done) => {
      // First press the button
      (mockGamepad.buttons![GamepadButton.A] as any).pressed = true;
      
      // Wait for next frame
      setTimeout(() => {
        const unsubscribe = service.addEventListener((event: ControllerEvent) => {
          if (event.type === 'buttonrelease') {
            expect(event.button).toBe(GamepadButton.A);
            unsubscribe();
            done();
          }
        });

        // Release the button
        (mockGamepad.buttons![GamepadButton.A] as any).pressed = false;
      }, 20);
    });

    it('should detect D-pad up as direction event', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction') {
          expect(event.direction).toBe('up');
          unsubscribe();
          done();
        }
      });

      (mockGamepad.buttons![GamepadButton.DPadUp] as any).pressed = true;
    });
  });

  describe('analog stick detection', () => {
    beforeEach(() => {
      // Connect gamepad
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);
    });

    it('should detect left stick up movement', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction' && event.direction === 'up') {
          unsubscribe();
          done();
        }
      });

      // Move stick up (negative Y)
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickY] = -0.8;
    });

    it('should detect left stick down movement', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction' && event.direction === 'down') {
          unsubscribe();
          done();
        }
      });

      // Move stick down (positive Y)
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickY] = 0.8;
    });

    it('should detect left stick left movement', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction' && event.direction === 'left') {
          unsubscribe();
          done();
        }
      });

      // Move stick left (negative X)
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickX] = -0.8;
    });

    it('should detect left stick right movement', (done) => {
      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction' && event.direction === 'right') {
          unsubscribe();
          done();
        }
      });

      // Move stick right (positive X)
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickX] = 0.8;
    });

    it('should apply deadzone to small movements', (done) => {
      let eventFired = false;

      const unsubscribe = service.addEventListener((event: ControllerEvent) => {
        if (event.type === 'direction') {
          eventFired = true;
        }
      });

      // Move stick within deadzone (default 0.15)
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickX] = 0.1;

      // Wait and verify no event was fired
      setTimeout(() => {
        expect(eventFired).toBe(false);
        unsubscribe();
        done();
      }, 200);
    });
  });

  describe('button name mapping', () => {
    it('should return Xbox names for xbox schema', () => {
      appSettings.setControllerSchema('xbox');
      expect(service.getButtonName(GamepadButton.A)).toBe('A');
      expect(service.getButtonName(GamepadButton.B)).toBe('B');
      expect(service.getButtonName(GamepadButton.LeftBumper)).toBe('LB');
      expect(service.getButtonName(GamepadButton.Start)).toBe('Menu');
    });

    it('should return PlayStation names for playstation schema', () => {
      appSettings.setControllerSchema('playstation');
      expect(service.getButtonName(GamepadButton.A)).toBe('Cross');
      expect(service.getButtonName(GamepadButton.B)).toBe('Circle');
      expect(service.getButtonName(GamepadButton.LeftBumper)).toBe('L1');
      expect(service.getButtonName(GamepadButton.Start)).toBe('Options');
    });

    it('should return Nintendo names for nintendo schema', () => {
      appSettings.setControllerSchema('nintendo');
      expect(service.getButtonName(GamepadButton.A)).toBe('B');
      expect(service.getButtonName(GamepadButton.B)).toBe('A');
      expect(service.getButtonName(GamepadButton.X)).toBe('Y');
      expect(service.getButtonName(GamepadButton.Y)).toBe('X');
      expect(service.getButtonName(GamepadButton.LeftBumper)).toBe('L');
      expect(service.getButtonName(GamepadButton.LeftTrigger)).toBe('ZL');
      expect(service.getButtonName(GamepadButton.Select)).toBe('-');
      expect(service.getButtonName(GamepadButton.Start)).toBe('+');
    });

    it('should return generic names for generic schema', () => {
      appSettings.setControllerSchema('generic');
      expect(service.getButtonName(GamepadButton.Select)).toBe('Select');
      expect(service.getButtonName(GamepadButton.Start)).toBe('Start');
    });
  });

  describe('button state queries', () => {
    beforeEach(() => {
      // Connect gamepad
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);
    });

    it('should return false for unpressed button', () => {
      expect(service.isButtonPressed(GamepadButton.A)).toBe(false);
    });

    it('should return true for pressed button', () => {
      (mockGamepad.buttons![GamepadButton.A] as any).pressed = true;
      expect(service.isButtonPressed(GamepadButton.A)).toBe(true);
    });

    it('should return false when no controller connected', () => {
      service.ngOnDestroy();
      expect(service.isButtonPressed(GamepadButton.A)).toBe(false);
    });
  });

  describe('axis value queries', () => {
    beforeEach(() => {
      // Connect gamepad
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);
    });

    it('should return axis value above deadzone', () => {
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickX] = 0.5;
      expect(service.getAxisValue(GamepadAxis.LeftStickX)).toBe(0.5);
    });

    it('should return 0 for axis value within deadzone', () => {
      (mockGamepad.axes as number[])[GamepadAxis.LeftStickX] = 0.1;
      expect(service.getAxisValue(GamepadAxis.LeftStickX)).toBe(0);
    });

    it('should return 0 when no controller connected', () => {
      service.ngOnDestroy();
      expect(service.getAxisValue(GamepadAxis.LeftStickX)).toBe(0);
    });
  });

  describe('event listeners', () => {
    it('should allow subscribing to events', () => {
      const listener = () => {};
      const unsubscribe = service.addEventListener(listener);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from events', () => {
      const listener = () => {};
      const unsubscribe = service.addEventListener(listener);
      
      unsubscribe();

      // Trigger an event
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear event listeners on destroy', () => {
      let callCount = 0;
      const listener = () => callCount++;
      service.addEventListener(listener);
      
      service.ngOnDestroy();

      // Trigger an event
      const event = new Event('gamepadconnected') as GamepadEvent;
      Object.defineProperty(event, 'gamepad', {
        value: mockGamepad
      });
      window.dispatchEvent(event);

      // Listener should not be called after ngOnDestroy
      expect(callCount).toBe(0);
    });
  });
});
