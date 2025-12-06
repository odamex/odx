import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ServersStore } from '@app/store';
import { OdalPapi, IWADService, type DetectedIWAD } from '@shared/services';

/**
 * Criteria for filtering and ranking servers in Quick Match
 */
export interface QuickMatchCriteria {
  /** Maximum acceptable ping in milliseconds */
  maxPing: number;
  /** Minimum number of players required */
  minPlayers: number;
  /** Maximum number of players allowed */
  maxPlayers: number;
  /** If true, exclude servers with zero players */
  avoidEmpty: boolean;
  /** If true, exclude servers at max capacity */
  avoidFull: boolean;
  /** Optional list of preferred game types to filter by */
  preferredGameTypes?: OdalPapi.GameType[];
  /** Maximum time in minutes to monitor for matches (default: 15) */
  monitoringTimeoutMinutes?: number;
}

/**
 * Result from attempting to find a quick match
 */
export interface QuickMatchResult {
  /** The matched server, or null if no match found */
  server: OdalPapi.ServerInfo | null;
  /** Human-readable reason if no match was found */
  reason?: string;
}

const DEFAULT_CRITERIA: QuickMatchCriteria = {
  maxPing: 100,
  minPlayers: 1,
  maxPlayers: 32,
  avoidEmpty: true,
  avoidFull: true,
  monitoringTimeoutMinutes: 15,
  preferredGameTypes: [
    OdalPapi.GameType.GT_Deathmatch,
    OdalPapi.GameType.GT_TeamDeathmatch,
    OdalPapi.GameType.GT_CaptureTheFlag,
    OdalPapi.GameType.GT_Cooperative,
    OdalPapi.GameType.GT_Survival,
    OdalPapi.GameType.GT_Horde
  ]
};

/**
 * Quick Match Service - Version 1
 * 
 * Provides automatic server matching based on player preferences, ping, and availability.
 * Includes a lightweight monitoring system that checks for matches periodically when
 * no immediate match is found.
 * 
 * Version 1 Features:
 * - Smart server filtering by ping, player count, game types, and available IWADs
 * - Score-based ranking algorithm that prioritizes active servers with low ping
 * - Lightweight local monitoring queue (30-second intervals, 10-minute timeout)
 * - No central server dependency - all matching happens client-side
 * - Desktop notifications via Electron IPC integration
 * 
 * Future Considerations (v2):
 * - Centralized queue system with player pool matching
 * - Advanced matchmaking algorithms (skill-based, party support)
 * - Server reservation and auto-launch capabilities
 * - Regional preference and dedicated server support
 * 
 * @version 1.0.0
 * @example
 * ```typescript
 * const result = await quickMatchService.quickMatch();
 * if (result === 'connected') {
 *   // User was connected to a server
 * } else if (result === 'failed') {
 *   // No match found, offer monitoring
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class QuickMatchService {
  private serversStore = inject(ServersStore);
  private iwadService = inject(IWADService);
  private router = inject(Router);

  /** Whether the service is currently monitoring for matches */
  isMonitoring = signal(false);
  
  private monitoringTimer: any = null;
  private monitoringStartTime: number = 0;

  /** The server that was found during monitoring, null if none */
  matchFound = signal<OdalPapi.ServerInfo | null>(null);
  
  /** Match criteria - can be customized in settings */
  criteria = signal<QuickMatchCriteria>(DEFAULT_CRITERIA);

  /**
   * Find the best server match based on criteria
   * 
   * Filters available servers by ping, player count, game type, available IWADs,
   * and password protection. Ranks remaining candidates by a score formula that
   * prioritizes player count while penalizing high ping.
   * 
   * @param customCriteria - Optional criteria overrides to merge with default criteria
   * @returns QuickMatchResult containing the best server or null with a reason
   */
  findBestMatch(customCriteria?: Partial<QuickMatchCriteria>): QuickMatchResult {
    const servers = this.serversStore.servers();
    const criteria = customCriteria 
      ? { ...this.criteria(), ...customCriteria }
      : this.criteria();

    // Get available IWADs
    const availableIwads = new Set(
      this.iwadService.detectedIWADs()
        .filter((iwad: DetectedIWAD) => iwad.path)
        .map((iwad: DetectedIWAD) => iwad.entry.game.toLowerCase())
    );

    // Filter servers
    const candidates = servers.filter(server => {
      // Must have valid address
      if (!server.address) return false;

      // Check ping (if available)
      if (server.ping !== undefined && server.ping > criteria.maxPing) return false;

      // Check player and client counts
      const allPlayers = server.players || [];
      const totalClients = allPlayers.length; // All players including spectators
      const activePlayers = allPlayers.filter(p => !p.spectator).length; // Only non-spectators
      const maxClients = server.maxClients || 0;
      const maxPlayers = server.maxPlayers || 0;

      // ALWAYS avoid servers at max clients (no slots for anyone, including spectators)
      if (totalClients >= maxClients) return false;

      if (criteria.avoidEmpty && totalClients === 0) return false;
      
      // If avoidFull is enabled, also check if active player slots are full
      if (criteria.avoidFull && activePlayers >= maxPlayers) return false;
      
      // Check against user's min/max player preferences (active players only)
      if (activePlayers < criteria.minPlayers) return false;
      if (activePlayers > criteria.maxPlayers) return false;

      // Check game type
      if (criteria.preferredGameTypes && criteria.preferredGameTypes.length > 0) {
        if (!criteria.preferredGameTypes.includes(server.gameType)) return false;
      }

      // Check if user has the required IWAD
      if (server.wads && server.wads.length > 0) {
        const iwad = server.wads.find(w => !w.name.toLowerCase().includes('odamex'));
        if (iwad) {
          const iwadName = iwad.name.toLowerCase().replace('.wad', '');
          if (!availableIwads.has(iwadName)) return false;
        }
      }

      // Skip password-protected servers
      if (server.passwordHash) return false;

      return true;
    });

    if (candidates.length === 0) {
      return {
        server: null,
        reason: this.getNoMatchReason(servers, criteria, availableIwads)
      };
    }

    // Rank servers by score
    const ranked = candidates.map(server => {
      const activePlayers = server.players?.filter(p => !p.spectator).length || 0;
      const ping = server.ping || 999;
      
      // Score formula: prioritize active player count, penalize high ping
      // More players = better (up to a point), lower ping = better
      const playerScore = Math.min(activePlayers, 8) * 10; // Cap benefit at 8 players
      const pingPenalty = ping / 10;
      const score = playerScore - pingPenalty;

      return { server, score };
    });

    // Sort by score (highest first)
    ranked.sort((a, b) => b.score - a.score);

    return {
      server: ranked[0].server
    };
  }

  /**
   * Attempt to quick match - either join immediately or indicate failure
   * 
   * Searches for the best available server and attempts to connect.
   * Does not automatically start monitoring - caller should check the result
   * and offer monitoring as an option to the user.
   * 
   * @returns 'connected' if a match was found and connection initiated,
   *          'failed' if no suitable server was found
   */
  async quickMatch(): Promise<'connected' | 'monitoring' | 'failed'> {
    const result = this.findBestMatch();

    if (result.server) {
      // Found a match - connect immediately
      this.matchFound.set(result.server);
      await this.connectToServer(result.server);
      return 'connected';
    }

    // No match found - offer to monitor
    return 'failed';
  }

  /**
   * Start monitoring for a match
   * 
   * Begins a lightweight background monitoring loop that checks for suitable
   * servers every 30 seconds. Automatically stops after 10 minutes if no match
   * is found. Sets the matchFound signal when a server becomes available.
   * 
   * This is a "lightweight queue" - it doesn't prevent navigation or block the UI.
   */
  startMonitoring() {
    if (this.isMonitoring()) return;

    this.isMonitoring.set(true);
    this.monitoringStartTime = Date.now();
    this.matchFound.set(null);

    // Notify Electron about queue state
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.updateQueueState(true);
      window.electron.updateTrayTooltip('ODX - Searching for match...');
    }

    // Check every 30 seconds
    this.monitoringTimer = setInterval(() => {
      this.checkForMatch();
    }, 30000);

    // Initial check
    this.checkForMatch();
  }

  /**
   * Stop monitoring for matches
   * 
   * Clears the monitoring timer and resets monitoring state.
   * Safe to call even if not currently monitoring.
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring.set(false);
    this.matchFound.set(null);

    // Notify Electron about queue state
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.updateQueueState(false);
      window.electron.updateTrayTooltip('ODX');
    }
  }

  /**
   * Check for a match and handle monitoring timeout
   * 
   * Called periodically during monitoring to search for suitable servers.
   * Stops monitoring if the maximum time is exceeded or if
   * a match is found. Does not auto-connect - sets matchFound signal for
   * user to handle.
   * 
   * @private
   */
  private checkForMatch() {
    // Get timeout from criteria (default to 15 minutes if not set)
    const timeoutMinutes = this.criteria().monitoringTimeoutMinutes ?? 15;
    const maxMonitoringTime = timeoutMinutes * 60 * 1000;
    
    // Check if we've exceeded max monitoring time
    const elapsed = Date.now() - this.monitoringStartTime;
    if (elapsed > maxMonitoringTime) {
      this.stopMonitoring();
      return;
    }

    const result = this.findBestMatch();
    if (result.server) {
      this.matchFound.set(result.server);
      this.stopMonitoring();
      // Don't auto-connect - let user choose via notification
    }
  }

  /**
   * Connect to a server
   * 
   * Navigates to the servers page and passes the server info for auto-connection.
   * The servers component will handle the actual connection process.
   * 
   * @param server - The server to connect to
   */
  async connectToServer(server: OdalPapi.ServerInfo) {
    // Navigate to servers page with auto-connect
    await this.router.navigate(['/servers'], {
      state: { autoConnect: server }
    });
  }

  /**
   * Get a helpful reason why no match was found
   * 
   * Analyzes the available servers and criteria to determine the most likely
   * reason why a match couldn't be made. Provides specific, actionable feedback
   * to the user.
   * 
   * @param allServers - All available servers from the master list
   * @param criteria - The criteria that was used for matching
   * @param availableIwads - Set of IWAD names the user has installed
   * @returns Human-readable reason string
   * @private
   */
  private getNoMatchReason(
    allServers: OdalPapi.ServerInfo[],
    criteria: QuickMatchCriteria,
    availableIwads: Set<string>
  ): string {
    if (allServers.length === 0) {
      return 'No servers are currently available.';
    }

    // Check specific reasons
    const serversWithPlayers = allServers.filter(s => (s.players?.length || 0) > 0);
    if (serversWithPlayers.length === 0) {
      return 'No servers have active players right now.';
    }

    const serversWithMatchingIwad = allServers.filter(s => {
      if (!s.wads || s.wads.length === 0) return false;
      const iwad = s.wads.find(w => !w.name.toLowerCase().includes('odamex'));
      if (!iwad) return false;
      const iwadName = iwad.name.toLowerCase().replace('.wad', '');
      return availableIwads.has(iwadName);
    });
    if (serversWithMatchingIwad.length === 0) {
      return 'No servers match your installed IWADs.';
    }

    const serversNotPassworded = allServers.filter(s => !s.passwordHash);
    if (serversNotPassworded.length === 0) {
      return 'All active servers are password-protected.';
    }

    const serversGoodPing = allServers.filter(s => 
      !s.ping || s.ping <= criteria.maxPing
    );
    if (serversGoodPing.length === 0) {
      return `No servers with ping under ${criteria.maxPing}ms.`;
    }

    return 'No servers match your criteria. Try browsing all servers.';
  }
}
