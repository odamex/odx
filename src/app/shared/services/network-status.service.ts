import { Injectable, signal, computed, effect } from '@angular/core';

/**
 * Current network connectivity status
 */
export interface NetworkStatus {
  /** Whether the device is currently online */
  online: boolean;
  /** Timestamp of the last connectivity check */
  lastChecked: Date;
  /** Whether a connectivity check is currently in progress */
  checkInProgress: boolean;
}

/**
 * Service to monitor network connectivity status
 * 
 * Tracks online/offline state and provides utilities for checking connectivity.
 * Components can subscribe to the isOnline signal to react to connectivity changes.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private readonly _status = signal<NetworkStatus>({
    online: navigator.onLine,
    lastChecked: new Date(),
    checkInProgress: false
  });

  /** Current network status */
  readonly status = this._status.asReadonly();

  /** Computed signal for online state */
  readonly isOnline = computed(() => this._status().online);

  /** Computed signal for offline state */
  readonly isOffline = computed(() => !this._status().online);

  constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Verify actual connectivity on startup (navigator.onLine can be unreliable)
    this.checkConnectivity();

    // Log connectivity changes
    effect(() => {
      const online = this.isOnline();
      console.log(`[NetworkStatus] Connection ${online ? 'restored' : 'lost'}`);
    });
  }

  /**
   * Check actual network connectivity by attempting to reach a reliable endpoint
   * 
   * @returns Promise resolving to true if online, false if offline
   */
  async checkConnectivity(): Promise<boolean> {
    // Don't run multiple checks simultaneously
    if (this._status().checkInProgress) {
      return this._status().online;
    }

    this._status.update(s => ({ ...s, checkInProgress: true }));

    try {
      // Try to fetch from GitHub API (reliable, CORS-friendly, and relevant to our app)
      // Use a HEAD request to minimize data transfer
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://api.github.com', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      const online = response.ok;
      this._status.set({
        online,
        lastChecked: new Date(),
        checkInProgress: false
      });

      return online;
    } catch (error) {
      // Network error or timeout - we're offline
      this._status.set({
        online: false,
        lastChecked: new Date(),
        checkInProgress: false
      });

      return false;
    }
  }

  /**
   * Execute a function with automatic offline handling
   * 
   * @param fn Function to execute (should return a Promise)
   * @param fallback Optional fallback value to return if offline
   * @returns Result of fn if online, fallback if offline
   */
  async withOfflineHandling<T>(
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    if (this.isOffline()) {
      console.warn('[NetworkStatus] Operation skipped - offline mode');
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error('Operation requires network connection');
    }

    try {
      return await fn();
    } catch (error) {
      // Check if error is network-related
      const message = error instanceof Error ? error.message : String(error);
      const isNetworkError = 
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('ENOTFOUND') ||
        message.includes('ECONNREFUSED') ||
        message.includes('timeout');

      if (isNetworkError) {
        // Update status to offline
        this._status.update(s => ({ ...s, online: false, lastChecked: new Date() }));
        
        if (fallback !== undefined) {
          console.warn('[NetworkStatus] Network error, using fallback:', message);
          return fallback;
        }
      }

      throw error;
    }
  }

  /**
   * Force set the online status (useful for testing)
   */
  setOnline(online: boolean): void {
    this._status.set({
      online,
      lastChecked: new Date(),
      checkInProgress: false
    });
  }

  /**
   * Handle browser online event
   * Verifies actual connectivity rather than trusting the browser event alone
   */
  private handleOnline(): void {
    console.log('[NetworkStatus] Browser online event received');
    // Verify actual connectivity
    this.checkConnectivity();
  }

  /**
   * Handle browser offline event
   * Immediately marks the service as offline
   */
  private handleOffline(): void {
    console.log('[NetworkStatus] Browser offline event received');
    this._status.set({
      online: false,
      lastChecked: new Date(),
      checkInProgress: false
    });
  }
}
