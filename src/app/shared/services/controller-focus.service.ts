import { Injectable, signal } from '@angular/core';

export type FocusArea = 'navigation' | 'content';

@Injectable({
  providedIn: 'root'
})
export class ControllerFocusService {
  private _focusArea = signal<FocusArea>('navigation');
  
  readonly focusArea = this._focusArea.asReadonly();
  
  setFocus(area: FocusArea): void {
    this._focusArea.set(area);
  }
  
  hasFocus(area: FocusArea): boolean {
    return this._focusArea() === area;
  }
  
  returnToNavigation(): void {
    this._focusArea.set('navigation');
  }
}
