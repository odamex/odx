import { Injectable, ElementRef, inject } from '@angular/core';
import { ControllerEvent, GamepadButton } from './controller.service';
import { ControllerFocusService, FocusedElementType } from './controller-focus.service';

/**
 * Service to manage controller navigation within settings forms.
 * Handles D-pad navigation through form controls and A button activation.
 */
@Injectable()
export class SettingsFormControllerService {
  private focusService = inject(ControllerFocusService);
  private focusableElements: HTMLElement[] = [];
  private currentIndex = 0;

  /**
   * Finds all focusable elements within the given container.
   * Includes: input[type=checkbox], input[type=range], select, button (not disabled)
   */
  findFocusableElements(container: ElementRef<HTMLElement> | HTMLElement): void {
    const element = container instanceof ElementRef ? container.nativeElement : container;
    
    const selectors = [
      'input[type="checkbox"]:not(:disabled)',
      'input[type="range"]:not(:disabled)',
      'input[type="number"]:not(:disabled)',
      'select:not(:disabled)',
      'button:not(:disabled)'
    ].join(', ');

    this.focusableElements = Array.from(element.querySelectorAll(selectors));
    this.currentIndex = 0;
  }

  /**
   * Focuses the first focusable element.
   */
  focusFirst(): void {
    if (this.focusableElements.length > 0) {
      this.currentIndex = 0;
      this.focusCurrent();
    }
  }

  /**
   * Handles controller direction events (D-pad up/down).
   */
  handleDirection(event: ControllerEvent): void {
    if (this.focusableElements.length === 0) return;

    if (event.type === 'direction' && (event.direction === 'up' || event.direction === 'down')) {
      if (event.direction === 'up') {
        this.currentIndex--;
        if (this.currentIndex < 0) {
          this.currentIndex = this.focusableElements.length - 1;
        }
      } else {
        this.currentIndex++;
        if (this.currentIndex >= this.focusableElements.length) {
          this.currentIndex = 0;
        }
      }
      this.focusCurrent();
    }
  }

  /**
   * Handles controller button press events (A button to activate, X/Y for numeric adjustments).
   */
  handleButtonPress(event: ControllerEvent): void {
    if (this.focusableElements.length === 0) return;

    const element = this.focusableElements[this.currentIndex];
    
    // Handle X and Y buttons for numeric inputs (increment/decrement)
    if (event.button === GamepadButton.X || event.button === GamepadButton.Y) {
      if (element instanceof HTMLInputElement && (element.type === 'number' || element.type === 'range')) {
        this.adjustNumericInput(element, event.button === GamepadButton.Y);
        return;
      }
    }
    
    // Handle A button activation
    if (event.button !== GamepadButton.A) return;

    // Handle different element types
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        element.click();
      } else if (element.type === 'range' || element.type === 'number') {
        // For range/number inputs, just focus them (user can adjust with X/Y buttons)
        element.focus();
      }
    } else if (element instanceof HTMLSelectElement) {
      // Open the select dropdown
      element.focus();
      // Trigger click to open dropdown on some browsers
      element.click();
    } else if (element instanceof HTMLButtonElement) {
      element.click();
    }
  }

  /**
   * Adjusts a numeric input value up or down.
   * @param input The input element
   * @param increase True to increase, false to decrease
   */
  private adjustNumericInput(input: HTMLInputElement, increase: boolean): void {
    const step = parseFloat(input.step) || 1;
    const min = input.min ? parseFloat(input.min) : -Infinity;
    const max = input.max ? parseFloat(input.max) : Infinity;
    let currentValue = parseFloat(input.value) || 0;

    // Adjust value
    if (increase) {
      currentValue += step;
    } else {
      currentValue -= step;
    }

    // Clamp to min/max
    currentValue = Math.max(min, Math.min(max, currentValue));

    // Update the input
    input.value = currentValue.toString();

    // Trigger input and change events so Angular detects the change
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Focuses the current element and updates the focus context.
   */
  private focusCurrent(): void {
    if (this.currentIndex >= 0 && this.currentIndex < this.focusableElements.length) {
      const element = this.focusableElements[this.currentIndex];
      element.focus();
      
      // Update focus context for button prompts
      this.updateFocusContext(element);
    }
  }
  
  /**
   * Determines and updates the focused element type for contextual prompts.
   */
  private updateFocusContext(element: HTMLElement): void {
    let elementType: FocusedElementType = 'none';
    
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        elementType = 'checkbox';
      } else if (element.type === 'number') {
        elementType = 'numeric';
      } else if (element.type === 'range') {
        elementType = 'range';
      }
    } else if (element instanceof HTMLSelectElement) {
      elementType = 'select';
    } else if (element instanceof HTMLButtonElement) {
      elementType = 'button';
    }
    
    this.focusService.setFocusedElementType(elementType);
  }

  /**
   * Clears focus state.
   */
  cleanup(): void {
    this.focusableElements = [];
    this.currentIndex = 0;
    this.focusService.setFocusedElementType('none');
  }
}
