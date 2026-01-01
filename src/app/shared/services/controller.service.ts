import { Injectable, signal, computed, NgZone, inject, effect } from '@angular/core';
import { AppSettingsService } from './app-settings.service';

/**
 * Supported controller button schema types
 */
export type ControllerSchema = 'xbox' | 'playstation' | 'nintendo' | 'generic';

/**
 * Normalized button mappings
 */
export enum GamepadButton {
  A = 0,           // Xbox A, PS Cross
  B = 1,           // Xbox B, PS Circle
  X = 2,           // Xbox X, PS Square
  Y = 3,           // Xbox Y, PS Triangle
  LeftBumper = 4,  // LB / L1
  RightBumper = 5, // RB / R1
  LeftTrigger = 6, // LT / L2
  RightTrigger = 7,// RT / R2
  Select = 8,      // View / Share
  Start = 9,       // Menu / Options
  LeftStick = 10,  // L3
  RightStick = 11, // R3
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Home = 16        // Xbox button / PS button
}

/**
 * Normalized axis mappings
 */
export enum GamepadAxis {
  LeftStickX = 0,
  LeftStickY = 1,
  RightStickX = 2,
  RightStickY = 3
}

/**
 * Controller button state
 */
export interface ButtonState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  value: number;
}

/**
 * Controller axis state
 */
export interface AxisState {
  x: number;
  y: number;
}

/**
 * Directional input from D-pad or analog stick
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Controller event types
 */
export interface ControllerEvent {
  type: 'buttonpress' | 'buttonrelease' | 'direction' | 'connected' | 'disconnected';
  button?: GamepadButton;
  direction?: Direction;
  gamepadIndex?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ControllerService {
  private ngZone = inject(NgZone);
  private appSettings = inject(AppSettingsService);
  
  // Signals for reactive state
  public readonly connected = signal<boolean>(false);
  public readonly activeGamepadIndex = signal<number>(-1);
  public readonly controllerName = signal<string>('');
  
  // Settings synced with AppSettingsService
  public readonly enabled = this.appSettings.controllerEnabled;
  public readonly schema = this.appSettings.controllerSchema;
  public readonly deadzone = this.appSettings.controllerDeadzone;
  public readonly showButtonPrompts = this.appSettings.controllerShowButtonPrompts;
  
  // Animation frame ID for polling
  private animationFrameId: number | null = null;
  
  // Previous button states for detecting press/release
  private previousButtonStates = new Map<number, boolean[]>();
  
  // Event listeners
  private eventListeners = new Set<(event: ControllerEvent) => void>();
  
  // Direction repeat timing
  private lastDirectionTime = 0;
  private directionRepeatDelay = 150; // ms between repeated direction events
  
  constructor() {
    // Listen for gamepad connection/disconnection
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
      window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
      
      // Start polling loop
      this.startPolling();
    }
  }
  
  /**
   * Start polling for gamepad input
   */
  private startPolling(): void {
    if (this.animationFrameId !== null) return;
    
    const poll = () => {
      if (this.enabled()) {
        this.pollGamepads();
      }
      this.animationFrameId = requestAnimationFrame(poll);
    };
    
    this.animationFrameId = requestAnimationFrame(poll);
  }
  
  /**
   * Stop polling for gamepad input
   */
  private stopPolling(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Handle gamepad connected event
   */
  private handleGamepadConnected(event: GamepadEvent): void {
    console.log('[Controller] Gamepad connected:', event.gamepad.id);
    
    this.ngZone.run(() => {
      this.connected.set(true);
      this.activeGamepadIndex.set(event.gamepad.index);
      this.controllerName.set(event.gamepad.id);
      
      // Auto-detect controller schema based on gamepad ID
      const detectedSchema = this.detectControllerSchema(event.gamepad.id);
      if (detectedSchema) {
        this.appSettings.setControllerSchema(detectedSchema);
        console.log('[Controller] Auto-detected schema:', detectedSchema);
      }
      
      // Initialize previous button state for this gamepad
      this.previousButtonStates.set(
        event.gamepad.index,
        Array(event.gamepad.buttons.length).fill(false)
      );
      
      this.emitEvent({ type: 'connected', gamepadIndex: event.gamepad.index });
    });
  }
  
  /**
   * Detect controller schema from gamepad ID string
   */
  private detectControllerSchema(gamepadId: string): ControllerSchema | null {
    const id = gamepadId.toLowerCase();
    
    // Xbox controllers
    if (id.includes('xbox') || 
        id.includes('045e') ||  // Microsoft vendor ID
        id.includes('xinput') ||
        id.includes('microsoft')) {
      return 'xbox';
    }
    
    // PlayStation controllers
    if (id.includes('playstation') || 
        id.includes('dualshock') ||
        id.includes('dualsense') ||
        id.includes('054c') ||  // Sony vendor ID
        id.includes('sony')) {
      return 'playstation';
    }
    
    // Nintendo controllers
    if (id.includes('nintendo') ||
        id.includes('switch') ||
        id.includes('joy-con') ||
        id.includes('pro controller') ||
        id.includes('057e')) {  // Nintendo vendor ID
      return 'nintendo';
    }
    
    // If we can't detect, keep current setting
    return null;
  }
  
  /**
   * Handle gamepad disconnected event
   */
  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log('[Controller] Gamepad disconnected:', event.gamepad.id);
    
    this.ngZone.run(() => {
      if (this.activeGamepadIndex() === event.gamepad.index) {
        this.connected.set(false);
        this.activeGamepadIndex.set(-1);
        this.controllerName.set('');
      }
      
      this.previousButtonStates.delete(event.gamepad.index);
      
      this.emitEvent({ type: 'disconnected', gamepadIndex: event.gamepad.index });
    });
  }
  
  /**
   * Poll connected gamepads for input
   */
  private pollGamepads(): void {
    const gamepads = navigator.getGamepads();
    const activeIndex = this.activeGamepadIndex();
    
    if (activeIndex === -1 || !gamepads[activeIndex]) {
      return;
    }
    
    const gamepad = gamepads[activeIndex];
    if (!gamepad) return;
    
    // Check buttons
    this.checkButtons(gamepad);
    
    // Check analog stick for directional input
    this.checkAnalogStick(gamepad);
  }
  
  /**
   * Check button states and emit events
   */
  private checkButtons(gamepad: Gamepad): void {
    const previousStates = this.previousButtonStates.get(gamepad.index) || [];
    const currentStates = gamepad.buttons.map(b => b.pressed);
    
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const wasPressed = previousStates[i] || false;
      const isPressed = currentStates[i];
      
      if (isPressed && !wasPressed) {
        // Button just pressed
        this.ngZone.run(() => {
          this.emitEvent({ type: 'buttonpress', button: i });
        });
        
        // Check if it's a D-pad button and emit direction event
        if (i >= GamepadButton.DPadUp && i <= GamepadButton.DPadRight) {
          const direction = this.getDirectionFromButton(i);
          if (direction) {
            this.ngZone.run(() => {
              this.emitEvent({ type: 'direction', direction });
            });
          }
        }
      } else if (!isPressed && wasPressed) {
        // Button just released
        this.ngZone.run(() => {
          this.emitEvent({ type: 'buttonrelease', button: i });
        });
      }
    }
    
    // Update previous states
    this.previousButtonStates.set(gamepad.index, currentStates);
  }
  
  /**
   * Check analog stick for directional input
   */
  private checkAnalogStick(gamepad: Gamepad): void {
    const leftStickX = gamepad.axes[GamepadAxis.LeftStickX] || 0;
    const leftStickY = gamepad.axes[GamepadAxis.LeftStickY] || 0;
    const deadzone = this.deadzone();
    
    // Apply deadzone
    const x = Math.abs(leftStickX) > deadzone ? leftStickX : 0;
    const y = Math.abs(leftStickY) > deadzone ? leftStickY : 0;
    
    // Check for directional input
    const now = Date.now();
    if (now - this.lastDirectionTime < this.directionRepeatDelay) {
      return; // Throttle direction events
    }
    
    let direction: Direction | null = null;
    
    // Prioritize stronger axis
    if (Math.abs(x) > Math.abs(y)) {
      if (x < -deadzone) direction = 'left';
      else if (x > deadzone) direction = 'right';
    } else {
      if (y < -deadzone) direction = 'up';
      else if (y > deadzone) direction = 'down';
    }
    
    if (direction) {
      this.lastDirectionTime = now;
      this.ngZone.run(() => {
        this.emitEvent({ type: 'direction', direction: direction! });
      });
    }
  }
  
  /**
   * Convert D-pad button to direction
   */
  private getDirectionFromButton(button: GamepadButton): Direction | null {
    switch (button) {
      case GamepadButton.DPadUp: return 'up';
      case GamepadButton.DPadDown: return 'down';
      case GamepadButton.DPadLeft: return 'left';
      case GamepadButton.DPadRight: return 'right';
      default: return null;
    }
  }
  
  /**
   * Get button name based on current schema
   */
  public getButtonName(button: GamepadButton): string {
    const schema = this.schema();
    
    switch (button) {
      case GamepadButton.A:
        return schema === 'playstation' ? 'Cross' : schema === 'nintendo' ? 'B' : 'A';
      case GamepadButton.B:
        return schema === 'playstation' ? 'Circle' : schema === 'nintendo' ? 'A' : 'B';
      case GamepadButton.X:
        return schema === 'playstation' ? 'Square' : schema === 'nintendo' ? 'Y' : 'X';
      case GamepadButton.Y:
        return schema === 'playstation' ? 'Triangle' : schema === 'nintendo' ? 'X' : 'Y';
      case GamepadButton.LeftBumper:
        return schema === 'playstation' ? 'L1' : schema === 'nintendo' ? 'L' : 'LB';
      case GamepadButton.RightBumper:
        return schema === 'playstation' ? 'R1' : schema === 'nintendo' ? 'R' : 'RB';
      case GamepadButton.LeftTrigger:
        return schema === 'playstation' ? 'L2' : schema === 'nintendo' ? 'ZL' : 'LT';
      case GamepadButton.RightTrigger:
        return schema === 'playstation' ? 'R2' : schema === 'nintendo' ? 'ZR' : 'RT';
      case GamepadButton.Select:
        return schema === 'playstation' ? 'Share' : schema === 'xbox' ? '⧉' : schema === 'nintendo' ? '-' : '⧉';
      case GamepadButton.Start:
        return schema === 'playstation' ? 'Options' : schema === 'xbox' ? '☰' : schema === 'nintendo' ? '+' : '☰';
      case GamepadButton.LeftStick:
        return 'L3';
      case GamepadButton.RightStick:
        return 'R3';
      case GamepadButton.Home:
        return schema === 'playstation' ? 'PS Button' : schema === 'xbox' ? 'Xbox Button' : schema === 'nintendo' ? 'Home' : 'Home';
      default:
        return `Button ${button}`;
    }
  }
  
  /**
   * Subscribe to controller events
   */
  public addEventListener(listener: (event: ControllerEvent) => void): () => void {
    this.eventListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.delete(listener);
    };
  }
  
  /**
   * Emit controller event to all listeners
   */
  private emitEvent(event: ControllerEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[Controller] Error in event listener:', error);
      }
    });
  }
  
  /**
   * Check if a specific button is currently pressed
   */
  public isButtonPressed(button: GamepadButton): boolean {
    const activeIndex = this.activeGamepadIndex();
    if (activeIndex === -1) return false;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[activeIndex];
    
    if (!gamepad || button >= gamepad.buttons.length) return false;
    
    return gamepad.buttons[button].pressed;
  }
  
  /**
   * Get current axis value
   */
  public getAxisValue(axis: GamepadAxis): number {
    const activeIndex = this.activeGamepadIndex();
    if (activeIndex === -1) return 0;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[activeIndex];
    
    if (!gamepad || axis >= gamepad.axes.length) return 0;
    
    const value = gamepad.axes[axis];
    const deadzone = this.deadzone();
    
    // Apply deadzone
    return Math.abs(value) > deadzone ? value : 0;
  }
  
  /**
   * Clean up resources
   */
  public ngOnDestroy(): void {
    this.stopPolling();
    this.eventListeners.clear();
  }
}
