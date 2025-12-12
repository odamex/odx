import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private _developerMode = signal(false);

  constructor() {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('developerMode');
    if (saved !== null) {
      this._developerMode.set(saved === 'true');
    }
  }

  get developerMode() {
    return this._developerMode.asReadonly();
  }

  setDeveloperMode(enabled: boolean): void {
    this._developerMode.set(enabled);
    localStorage.setItem('developerMode', enabled.toString());
  }
}
