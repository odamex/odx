import { Injectable, signal } from '@angular/core';
import { ControllerSchema } from './controller.service';

interface ControllerSettings {
  enabled: boolean;
  schema: ControllerSchema;
  deadzone: number;
  showButtonPrompts: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private _developerMode = signal(false);
  private _controllerEnabled = signal(true);
  private _controllerSchema = signal<ControllerSchema>('xbox');
  private _controllerDeadzone = signal(0.15);
  private _controllerShowButtonPrompts = signal(false);

  constructor() {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('developerMode');
    if (saved !== null) {
      this._developerMode.set(saved === 'true');
    }
    
    // Load controller settings
    const controllerSettings = this.loadControllerSettings();
    this._controllerEnabled.set(controllerSettings.enabled);
    this._controllerSchema.set(controllerSettings.schema);
    this._controllerDeadzone.set(controllerSettings.deadzone);
    this._controllerShowButtonPrompts.set(controllerSettings.showButtonPrompts);
  }

  get developerMode() {
    return this._developerMode.asReadonly();
  }

  setDeveloperMode(enabled: boolean): void {
    this._developerMode.set(enabled);
    localStorage.setItem('developerMode', enabled.toString());
  }
  
  // Controller settings getters
  get controllerEnabled() {
    return this._controllerEnabled.asReadonly();
  }
  
  get controllerSchema() {
    return this._controllerSchema.asReadonly();
  }
  
  get controllerDeadzone() {
    return this._controllerDeadzone.asReadonly();
  }
  
  get controllerShowButtonPrompts() {
    return this._controllerShowButtonPrompts.asReadonly();
  }
  
  // Controller settings setters
  setControllerEnabled(enabled: boolean): void {
    this._controllerEnabled.set(enabled);
    this.saveControllerSettings();
  }
  
  setControllerSchema(schema: ControllerSchema): void {
    this._controllerSchema.set(schema);
    this.saveControllerSettings();
  }
  
  setControllerDeadzone(deadzone: number): void {
    this._controllerDeadzone.set(deadzone);
    this.saveControllerSettings();
  }
  
  setControllerShowButtonPrompts(show: boolean): void {
    this._controllerShowButtonPrompts.set(show);
    this.saveControllerSettings();
  }
  
  // Load controller settings from localStorage
  private loadControllerSettings(): ControllerSettings {
    const saved = localStorage.getItem('controllerSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse controller settings:', error);
      }
    }
    
    // Return defaults
    return {
      enabled: true,
      schema: 'xbox',
      deadzone: 0.15,
      showButtonPrompts: false
    };
  }
  
  // Save controller settings to localStorage
  private saveControllerSettings(): void {
    const settings: ControllerSettings = {
      enabled: this._controllerEnabled(),
      schema: this._controllerSchema(),
      deadzone: this._controllerDeadzone(),
      showButtonPrompts: this._controllerShowButtonPrompts()
    };
    
    localStorage.setItem('controllerSettings', JSON.stringify(settings));
  }
}
