import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuickMatchService, OdalPapi, ControllerService, ControllerFocusService, GamepadButton, type ControllerEvent } from '@shared/services';
import { ServersStore, QuickMatchStore } from '@app/store';

/** Current state of the Quick Match flow */
type QuickMatchState = 'idle' | 'searching' | 'found' | 'no-match' | 'monitoring';

/**
 * Quick Match Component
 * 
 * Provides an instant matchmaking experience by automatically finding and
 * connecting to the best available server based on player preferences.
 * 
 * Features:
 * - Automatic server selection based on ping, player count, and game availability
 * - Lightweight monitoring queue that checks for matches every 30 seconds
 * - Real-time server statistics display
 * - Clear state-based UI showing search progress and results
 * - Tray menu integration for Quick Match and Leave Queue actions
 * 
 * States:
 * - idle: Ready to search for a match
 * - searching: Currently analyzing available servers
 * - found: Match found and connecting
 * - no-match: No suitable server found, offering alternatives
 * - monitoring: Background monitoring for server availability
 */
@Component({
  selector: 'app-multiplayer',
  imports: [RouterLink],
  templateUrl: './multiplayer.component.html',
  styleUrl: './multiplayer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiplayerComponent implements OnInit, OnDestroy {
  @ViewChildren('actionButton') actionButtons!: QueryList<ElementRef<HTMLButtonElement | HTMLAnchorElement>>;
  
  /** Quick Match service - public for template access */
  quickMatchService = inject(QuickMatchService);
  private quickMatchStore = inject(QuickMatchStore);
  private serversStore = inject(ServersStore);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  
  private controllerUnsubscribe?: () => void;
  private currentFocusIndex = 0;
  private justEnteredContent = false;
  private previousState: QuickMatchState = 'idle';
  
  constructor() {
    // Watch for content focus and auto-focus first button/link
    effect(() => {
      if (this.focusService.focusArea() === 'content') {
        // Set flag to prevent immediate activation
        this.justEnteredContent = true;
        setTimeout(() => {
          this.focusCurrentItem();
          // Clear flag after button press would have been processed
          setTimeout(() => this.justEnteredContent = false, 100);
        }, 50);
      }
    });
    
    // Reset focus index only when state actually changes
    effect(() => {
      const currentState = this.state();
      if (currentState !== this.previousState) {
        this.previousState = currentState;
        this.currentFocusIndex = 0;
        if (this.focusService.focusArea() === 'content') {
          setTimeout(() => this.focusCurrentItem(), 50);
        }
      }
    });
  }

  /** Current state of the Quick Match UI */
  state = signal<QuickMatchState>('idle');
  
  /** Server that was matched during the search */
  matchedServer = signal<OdalPapi.ServerInfo | null>(null);
  
  /** Reason why no match was found, if applicable */
  noMatchReason = signal<string>('');

  /** Whether the service is actively monitoring for matches */
  isMonitoring = this.quickMatchStore.isMonitoring;
  
  /** Server found during monitoring, if any */
  monitorMatchFound = this.quickMatchStore.matchFound;

  /** Total number of servers available */
  serverCount = computed(() => this.serversStore.servers().length);
  
  /** Number of servers with active players */
  activeServerCount = computed(() => 
    this.serversStore.servers().filter(s => (s.players?.length || 0) > 0).length
  );

  ngOnInit() {
    // Check if monitoring is already active and restore state
    if (this.isMonitoring()) {
      this.state.set('monitoring');
    }
    
    // Listen for tray menu Quick Match action
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.onTrayQuickMatch(() => {
        this.startQuickMatch();
      });

      // Listen for tray menu Leave Queue action
      window.electron.onTrayLeaveQueue(() => {
        this.stopMonitoring();
      });
    }
    
    // Setup controller event listener
    this.controllerUnsubscribe = this.controllerService.addEventListener(
      (event: ControllerEvent) => this.handleControllerEvent(event)
    );
  }

  ngOnDestroy() {
    // Don't stop monitoring - it should continue in the background
    this.controllerUnsubscribe?.();
  }

  private handleControllerEvent(event: ControllerEvent) {
    // Only handle events when content area has focus
    if (!this.focusService.hasFocus('content')) return;
    
    // Ignore events immediately after entering content to prevent the navigation A press from activating items
    if (this.justEnteredContent) return;

    // Handle direction events (D-pad and analog stick)
    if (event.type === 'direction') {
      switch (event.direction) {
        case 'up':
        case 'left':
          this.navigateUp();
          break;
        case 'down':
        case 'right':
          this.navigateDown();
          break;
      }
      return;
    }

    // Handle button press events
    if (event.type === 'buttonpress') {
      switch (event.button) {
        case GamepadButton.A:
          this.activateCurrentItem();
          break;
        case GamepadButton.B:
          this.focusService.returnToNavigation();
          break;
      }
    }
  }

  private navigateUp() {
    if (this.actionButtons.length === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex - 1 + this.actionButtons.length) % this.actionButtons.length;
    this.focusCurrentItem();
  }

  private navigateDown() {
    if (this.actionButtons.length === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.actionButtons.length;
    this.focusCurrentItem();
  }

  private focusCurrentItem() {
    const buttons = this.actionButtons.toArray();
    if (buttons.length > 0 && buttons[this.currentFocusIndex]) {
      buttons[this.currentFocusIndex].nativeElement.focus();
    }
  }

  private activateCurrentItem() {
    const buttons = this.actionButtons.toArray();
    if (buttons.length > 0 && buttons[this.currentFocusIndex]) {
      buttons[this.currentFocusIndex].nativeElement.click();
    }
  }

  /**
   * Start a Quick Match search
   * 
   * Attempts to find and connect to the best available server.
   * If no match is found, transitions to no-match state and provides
   * a reason along with alternative actions.
   */
  async startQuickMatch() {
    this.state.set('searching');
    this.matchedServer.set(null);
    this.noMatchReason.set('');

    const result = await this.quickMatchService.quickMatch();

    if (result === 'connected') {
      this.state.set('found');
      this.matchedServer.set(this.quickMatchService.matchFound());
    } else {
      // Get the reason why no match was found
      const matchResult = this.quickMatchService.findBestMatch();
      this.noMatchReason.set(matchResult.reason || 'No suitable servers found');
      
      // Auto-start monitoring if enabled
      if (this.quickMatchService.criteria().autoStartMonitoring) {
        this.startMonitoring();
      } else {
        this.state.set('no-match');
      }
    }
  }

  /**
   * Start monitoring for matches
   * 
   * Begins the lightweight background monitoring that checks for suitable
   * servers every 30 seconds. User can continue using the app while monitoring.
   */
  startMonitoring() {
    this.quickMatchService.startMonitoring();
    this.state.set('monitoring');
  }

  /**
   * Stop the monitoring process
   * 
   * Cancels background monitoring and returns to idle state.
   */
  stopMonitoring() {
    this.quickMatchService.stopMonitoring();
    this.state.set('idle');
  }

  /**
   * Connect to a server that was found during monitoring
   * 
   * Initiates connection to the server that appeared while monitoring
   * was active. Navigates to the servers page for connection.
   */
  async connectToMonitoredServer() {
    const server = this.monitorMatchFound();
    if (server) {
      await this.quickMatchService.connectToServer(server);
    }
  }

  /**
   * Reset the Quick Match UI to idle state
   * 
   * Clears all state, stops monitoring, and returns to the initial ready state.
   */
  reset() {
    this.state.set('idle');
    this.matchedServer.set(null);
    this.noMatchReason.set('');
    this.quickMatchService.stopMonitoring();
  }

  /**
   * Get readable names for game types
   * Converts game type enum array to comma-separated string of names
   */
  getGameTypeNames(): string {
    const gameTypes = this.quickMatchService.criteria().preferredGameTypes || [];
    const names = gameTypes.map(gt => {
      switch (gt) {
        case OdalPapi.GameType.GT_Deathmatch: return 'DM';
        case OdalPapi.GameType.GT_TeamDeathmatch: return 'TDM';
        case OdalPapi.GameType.GT_CaptureTheFlag: return 'CTF';
        case OdalPapi.GameType.GT_Cooperative: return 'Coop';
        case OdalPapi.GameType.GT_Survival: return 'Survival';
        case OdalPapi.GameType.GT_Horde: return 'Horde';
        default: return 'Unknown';
      }
    });
    return names.join(', ');
  }
}
