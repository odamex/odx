import { Injectable, signal } from '@angular/core';

export interface SplashState {
  visible: boolean;
  message: string;
  subMessage: string;
  progress: number | null;
  fadeOut: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SplashService {
  private state = signal<SplashState>({
    visible: true,
    message: 'Initializing...',
    subMessage: '',
    progress: null,
    fadeOut: false
  });

  readonly visible = () => this.state().visible;
  readonly message = () => this.state().message;
  readonly subMessage = () => this.state().subMessage;
  readonly progress = () => this.state().progress;
  readonly fadeOut = () => this.state().fadeOut;

  /**
   * Show the splash screen
   */
  show() {
    this.state.update(s => ({ ...s, visible: true, fadeOut: false }));
  }

  /**
   * Hide the splash screen with fade animation
   */
  hide() {
    this.state.update(s => ({ ...s, fadeOut: true }));
    // Remove from DOM after animation completes
    setTimeout(() => {
      this.state.update(s => ({ ...s, visible: false }));
    }, 500);
  }

  /**
   * Update the main status message
   */
  setMessage(message: string) {
    this.state.update(s => ({ ...s, message }));
  }

  /**
   * Update the sub-message (smaller text below main message)
   */
  setSubMessage(subMessage: string) {
    this.state.update(s => ({ ...s, subMessage }));
  }

  /**
   * Update both messages at once
   */
  setMessages(message: string, subMessage: string = '') {
    this.state.update(s => ({ ...s, message, subMessage }));
  }

  /**
   * Set progress percentage (0-100) or null to hide progress bar
   */
  setProgress(progress: number | null) {
    this.state.update(s => ({ ...s, progress }));
  }

  /**
   * Update all splash state at once
   */
  setState(updates: Partial<SplashState>) {
    this.state.update(s => ({ ...s, ...updates }));
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.state.set({
      visible: true,
      message: 'Initializing...',
      subMessage: '',
      progress: null,
      fadeOut: false
    });
  }
}
