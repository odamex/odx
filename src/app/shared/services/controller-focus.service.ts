import { Injectable, signal } from '@angular/core';

export type FocusArea = 'navigation' | 'content';
export type FocusedElementType = 'none' | 'checkbox' | 'numeric' | 'select' | 'button' | 'range';

@Injectable({
  providedIn: 'root'
})
export class ControllerFocusService {
  private _focusArea = signal<FocusArea>('navigation');
  private _focusedElementType = signal<FocusedElementType>('none');
  
  readonly focusArea = this._focusArea.asReadonly();
  readonly focusedElementType = this._focusedElementType.asReadonly();
  
  setFocus(area: FocusArea): void {
    this._focusArea.set(area);
  }
  
  setFocusedElementType(type: FocusedElementType): void {
    this._focusedElementType.set(type);
  }
  
  hasFocus(area: FocusArea): boolean {
    return this._focusArea() === area;
  }
  
  returnToNavigation(): void {
    this._focusArea.set('navigation');
    this._focusedElementType.set('none');
  }
}
