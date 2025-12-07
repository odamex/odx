import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ServersStore } from '@app/store';
import { CustomServersStore } from '@app/store/custom-servers.store';
import { OdalPapi, FileManagerService, IWADService, ServerRefreshService, NetworkStatusService, CustomServersService } from '@shared/services';
import { CustomServersModalComponent } from './custom-servers-modal/custom-servers-modal.component';

@Component({
  selector: 'app-servers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgbDropdownModule, CustomServersModalComponent],
  templateUrl: './servers.component.html',
  styleUrl: './servers.component.scss',
})
export class ServersComponent {
  @ViewChild(CustomServersModalComponent) customServersModal?: CustomServersModalComponent;
  
  private fileManager = inject(FileManagerService);
  private refreshService = inject(ServerRefreshService);
  private customServersService = inject(CustomServersService);
  private networkStatus = inject(NetworkStatusService);
  protected iwadService = inject(IWADService);
  private ngZone = inject(NgZone);
  readonly store = inject(ServersStore);
  readonly customStore = inject(CustomServersStore);
  
  selectedServer = signal<OdalPapi.ServerInfo | null>(null);
  joiningServer = signal(false);
  
  // Panel resize and collapse
  detailsPanelCollapsed = signal(true);
  protected resizing = signal(false);
  private startY = 0;
  private startHeight = 0;
  private savedPanelHeight: string | null = null;
  
  // Network status
  readonly isOnline = this.networkStatus.isOnline;
  
  // IWAD filtering
  activeGameFilters = signal<string[]>([]);
  showAllGames = computed(() => this.activeGameFilters().length === 0);
  
  // Game type filtering
  activeGameTypeFilters = signal<OdalPapi.GameType[]>([]);
  showAllGameTypes = computed(() => this.activeGameTypeFilters().length === 0);
  
  // Additional filters
  hideEmpty = signal(false);
  maxPing = signal<number | null>(null);
  
  // Sorting
  sortColumn = signal<string>('players');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Version filtering
  filterByVersion = signal(true);
  currentMajorVersion = signal<number | null>(null);
  currentMinorVersion = signal<number | null>(null);
  currentPatchVersion = signal<number | null>(null);
  
  // Search filtering
  searchText = signal('');
  
  // Combined servers (local network servers + custom servers + master server servers)
  // Priority: local > custom > master
  // Deduplicate: if a custom server matches local or master, exclude it from custom list
  allServers = computed(() => {
    const localServers = this.store.localServers();
    const customServers = this.customStore.servers();
    const masterServers = this.store.servers();
    
    // Helper to check if two servers are the same
    const isSameServer = (s1: OdalPapi.ServerInfo, s2: OdalPapi.ServerInfo) => 
      s1.address.ip === s2.address.ip && s1.address.port === s2.address.port;
    
    // Filter out custom servers that are already in local or master lists
    const deduplicatedCustom = customServers.filter(customServer => {
      const inLocal = localServers.some(local => isSameServer(local, customServer));
      const inMaster = masterServers.some(master => isSameServer(master, customServer));
      return !inLocal && !inMaster;
    });
    
    // Return in priority order: local, custom (deduplicated), master
    return [...localServers, ...deduplicatedCustom, ...masterServers];
  });
  
  filteredServers = computed(() => {
    const filters = this.activeGameFilters();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const versionFilter = this.filterByVersion();
    const currentMajor = this.currentMajorVersion();
    const search = this.searchText().toLowerCase().trim();
    const hideEmptyServers = this.hideEmpty();
    const pingThreshold = this.maxPing();
    
    let servers = this.allServers();
    
    // Apply version filtering
    if (versionFilter) {
      servers = servers.filter(server => this.isServerVersionCompatible(server));
    }
    
    // Apply search text filtering
    if (search) {
      servers = servers.filter(server => {
        // Search in server name
        if (server.name?.toLowerCase().includes(search)) return true;
        // Search in address
        if (server.address.ip.includes(search)) return true;
        if (server.address.port.toString().includes(search)) return true;
        // Search in map name
        if (server.currentMap?.toLowerCase().includes(search)) return true;
        // Search in game type
        if (this.getGameTypeName(server.gameType).toLowerCase().includes(search)) return true;
        // Search in WAD names
        if (server.wads?.some(wad => wad.name.toLowerCase().includes(search))) return true;
        return false;
      });
    }
    
    // Apply game type filters
    const gameTypeFilters = this.activeGameTypeFilters();
    if (gameTypeFilters.length > 0) {
      servers = servers.filter(server => {
        return gameTypeFilters.includes(server.gameType);
      });
    }
    
    // Apply hide empty filter
    if (hideEmptyServers) {
      servers = servers.filter(server => server.players.length > 0);
    }
    
    // Apply ping filter
    if (pingThreshold !== null && pingThreshold > 0) {
      servers = servers.filter(server => {
        // Always show servers without ping data
        if (server.ping === undefined || server.ping === null) return true;
        return server.ping <= pingThreshold;
      });
    }
    
    // Apply game filters
    // Always filter by owned games - only show servers for IWADs we have
    // Exception: Local servers are always shown regardless of filters
    const ownedGames = this.getUniqueGames().map(g => g.game);
    if (ownedGames.length > 0) {
      servers = servers.filter(server => {
        // Always show local servers
        if (this.isLocalServer(server)) {
          return true;
        }
        
        if (!server.wads || server.wads.length === 0) {
          return false;
        }
        
        const iwad = server.wads.find(w => !w.name.toLowerCase().includes('odamex'));
        if (!iwad) {
          return false;
        }
        
        const iwadName = iwad.name.toLowerCase().replace('.wad', '');
        
        // If specific filters are active, use them; otherwise show all owned games
        const gamesToCheck = filters.length > 0 ? filters : ownedGames;
        
        return gamesToCheck.some(gameType => {
          return this.matchesIWAD(iwadName, gameType);
        });
      });
    }
    
    // Apply sorting
    return [...servers].sort((a, b) => {
      // Local servers always appear first, regardless of sort
      const aIsLocal = this.isLocalServer(a);
      const bIsLocal = this.isLocalServer(b);
      
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      
      let aVal: any, bVal: any;
      
      switch (column) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'game':
          aVal = this.getServerGame(a).toLowerCase();
          bVal = this.getServerGame(b).toLowerCase();
          break;
        case 'map':
          aVal = (a.currentMap || '').toLowerCase();
          bVal = (b.currentMap || '').toLowerCase();
          break;
        case 'players':
          aVal = a.players.length;
          bVal = b.players.length;
          break;
        case 'gameType':
          aVal = this.getGameTypeName(a.gameType).toLowerCase();
          bVal = this.getGameTypeName(b.gameType).toLowerCase();
          break;
        case 'ping':
          aVal = a.ping || 9999;
          bVal = b.ping || 9999;
          break;
        case 'version':
          aVal = `${a.versionMajor}.${a.versionMinor}.${a.versionPatch}`;
          bVal = `${b.versionMajor}.${b.versionMinor}.${b.versionPatch}`;
          break;
        case 'address':
          aVal = `${a.address.ip}:${a.address.port}`;
          bVal = `${b.address.ip}:${b.address.port}`;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  // Get unique games from detected IWADs for filtering
  getUniqueGameTypes = computed(() => {
    const servers = this.allServers();
    const gameTypeCounts = new Map<OdalPapi.GameType, number>();
    
    servers.forEach(server => {
      const current = gameTypeCounts.get(server.gameType) || 0;
      gameTypeCounts.set(server.gameType, current + 1);
    });
    
    return Array.from(gameTypeCounts.entries())
      .map(([gameType, count]) => ({
        gameType,
        displayName: this.getGameTypeName(gameType),
        count
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });
  
  getUniqueGames = computed(() => {
    const displayGames = this.iwadService.displayGames();
    const gameMetadata = this.iwadService.gameMetadata();
    const uniqueGames = new Map<string, {game: string; displayName: string; commercial: boolean; detectedCount: number}>();
    
    displayGames.forEach(game => {
      let gameKey = game.entry.game;
      let displayName = game.entry.name || game.entry.groupName;
      const detectedCount = game.detectedCount || 0;
      
      // Get metadata for this game
      const metadata = gameMetadata[gameKey];
      const commercial = metadata?.commercial ?? true;
      
      // Capitalize and format display names
      if (gameKey === 'doom') displayName = 'DOOM';
      if (gameKey === 'doom_shareware') displayName = 'DOOM Shareware';
      if (gameKey === 'doom_registered') displayName = 'DOOM Registered';
      if (gameKey === 'doom2') displayName = 'DOOM II';
      if (gameKey === 'chex') displayName = 'Chex Quest';
      if (gameKey === 'freedoom1') displayName = 'Freedoom: Phase 1';
      if (gameKey === 'freedoom2') displayName = 'Freedoom: Phase 2';
      if (gameKey === 'freedm') displayName = 'FreeDM';
      if (gameKey === 'hacx') displayName = 'HACX';
      if (gameKey === 'rekkr') displayName = 'REKKR';
      
      // Group Plutonia and TNT under Final Doom
      if (gameKey === 'plutonia' || gameKey === 'tnt') {
        gameKey = 'final_doom';
        displayName = 'Final Doom';
      }
      
      if (!uniqueGames.has(gameKey)) {
        uniqueGames.set(gameKey, {
          game: gameKey,
          displayName: displayName,
          commercial: commercial,
          detectedCount: detectedCount
        });
      } else {
        const existing = uniqueGames.get(gameKey)!;
        existing.detectedCount += detectedCount;
      }
    });
    
    return Array.from(uniqueGames.values()).sort((a, b) => {
      // Sort by display name
      return a.displayName.localeCompare(b.displayName);
    });
  });

  constructor() {
    // Load version filter setting
    const savedFilterByVersion = localStorage.getItem('filterByVersion');
    if (savedFilterByVersion !== null) {
      this.filterByVersion.set(savedFilterByVersion === 'true');
    }
    
    // Load hideEmpty filter setting
    const savedHideEmpty = localStorage.getItem('hideEmpty');
    if (savedHideEmpty !== null) {
      this.hideEmpty.set(savedHideEmpty === 'true');
    }
    
    // Load maxPing filter setting
    const savedMaxPing = localStorage.getItem('maxPing');
    if (savedMaxPing !== null) {
      const pingValue = parseInt(savedMaxPing, 10);
      if (!isNaN(pingValue)) {
        this.maxPing.set(pingValue);
      }
    }
    
    // Save filter settings to localStorage when they change
    effect(() => {
      localStorage.setItem('hideEmpty', String(this.hideEmpty()));
    });
    
    effect(() => {
      const ping = this.maxPing();
      if (ping !== null) {
        localStorage.setItem('maxPing', String(ping));
      } else {
        localStorage.removeItem('maxPing');
      }
    });
    
    // Save current version to localStorage when detected
    effect(() => {
      const major = this.currentMajorVersion();
      const minor = this.currentMinorVersion();
      if (major !== null && minor !== null) {
        localStorage.setItem('currentVersion', `${major}.${minor}`);
      }
    });
    
    // Detect current Odamex version
    this.detectCurrentVersion();
  }

  private async detectCurrentVersion() {
    try {
      const info = await this.fileManager.getInstallationInfo();
      if (info.installed && info.version) {
        // Parse version string like "12.0.1" to get major, minor, patch
        const match = info.version.match(/^(\d+)\.(\d+)\.(\d+)/);
        if (match) {
          this.currentMajorVersion.set(parseInt(match[1], 10));
          this.currentMinorVersion.set(parseInt(match[2], 10));
          this.currentPatchVersion.set(parseInt(match[3], 10));
        }
      }
    } catch (err) {
      console.warn('Failed to detect current version:', err);
    }
  }

  /**
   * Check if a server version is compatible with the current client version
   * Compatible if: same major version AND server minor version <= client minor version
   * Example: Client 11.2.0 can connect to 11.0.x, 11.1.x, 11.2.x but NOT 11.3.x
   */
  private isServerVersionCompatible(server: OdalPapi.ServerInfo): boolean {
    const clientMajor = this.currentMajorVersion();
    const clientMinor = this.currentMinorVersion();
    
    // If we don't have version info, allow connection (no filtering)
    if (clientMajor === null || clientMinor === null) return true;
    if (server.versionMajor === null || server.versionMinor === null) return true;
    
    // Major version must match
    if (server.versionMajor !== clientMajor) return false;
    
    // Server minor version must be <= client minor version
    return server.versionMinor <= clientMinor;
  }

  async refreshServers() {
    // Refresh both master servers and custom servers
    await Promise.all([
      this.refreshService.refreshServers(),
      this.customServersService.queryCustomServers()
    ]);
  }
  
  autoRefreshEnabled(): boolean {
    return this.refreshService.isEnabled();
  }
  
  autoRefreshMinutes(): number {
    return this.refreshService.getMinutes();
  }

  getGameTypeName(gameType: OdalPapi.GameType): string {
    switch (gameType) {
      case OdalPapi.GameType.GT_Cooperative: return 'Cooperative';
      case OdalPapi.GameType.GT_Deathmatch: return 'Deathmatch';
      case OdalPapi.GameType.GT_TeamDeathmatch: return 'Team DM';
      case OdalPapi.GameType.GT_CaptureTheFlag: return 'CTF';
      case OdalPapi.GameType.GT_Survival: return 'Survival';
      case OdalPapi.GameType.GT_Horde: return 'Horde';
      default: return 'Unknown';
    }
  }

  getPingClass(ping: number): string {
    if (ping < 50) return 'ping-excellent';
    if (ping < 100) return 'ping-good';
    return 'ping-poor';
  }

  selectServer(server: OdalPapi.ServerInfo) {
    this.selectedServer.set(server);
    // Auto-expand the details panel when a server is selected
    if (this.detailsPanelCollapsed()) {
      this.detailsPanelCollapsed.set(false);
    }
  }

  handleServerClick(server: OdalPapi.ServerInfo) {
    this.selectServer(server);
  }

  handleServerDoubleClick(server: OdalPapi.ServerInfo) {
    this.joinServer(server);
  }

  async joinServer(server: OdalPapi.ServerInfo) {
    try {
      this.joiningServer.set(true);

      // Check if Odamex is installed
      const installInfo = await this.fileManager.getInstallationInfo();
      if (!installInfo.installed) {
        alert('Odamex is not installed. Please install it from Settings first.');
        return;
      }

      // Check version compatibility
      if (!this.isServerVersionCompatible(server)) {
        const serverVer = `${server.versionMajor}.${server.versionMinor}.${server.versionPatch}`;
        const clientVer = `${this.currentMajorVersion()}.${this.currentMinorVersion()}.${this.currentPatchVersion()}`;
        const proceed = confirm(
          `Version mismatch!\n\n` +
          `Server version: ${serverVer}\n` +
          `Your version: ${clientVer}\n\n` +
          `You may experience compatibility issues or connection failures.\n` +
          `Continue anyway?`
        );
        if (!proceed) {
          return;
        }
      }

      // Build connection arguments
      const args = [
        '+connect',
        `${server.address.ip}:${server.address.port}`
      ];

      // Add WAD directories so client knows where to find IWADs
      const wadDirs = this.iwadService.wadDirectories();
      console.log('[JOIN SERVER] WAD directories config:', wadDirs);
      
      if (wadDirs.directories && wadDirs.directories.length > 0) {
        // Extract path strings from WADDirectory objects
        const dirPaths = wadDirs.directories.map(dir => dir.path);
        console.log('[JOIN SERVER] Directory paths:', dirPaths);
        
        // Join directories with platform-specific separator (semicolon on Windows, colon elsewhere)
        const separator = window.electron.platform === 'win32' ? ';' : ':';
        const wadDirPath = dirPaths.join(separator);
        console.log('[JOIN SERVER] Combined waddir path:', wadDirPath);
        
        args.push('-waddir', wadDirPath);
      } else {
        console.warn('[JOIN SERVER] No WAD directories configured!');
      }
      
      console.log('[JOIN SERVER] Launch arguments:', args);

      // Launch Odamex
      await this.fileManager.launchOdamex(args);

    } catch (err: any) {
      console.error('Failed to join server:', err);
      alert(`Failed to join server: ${err.message || 'Unknown error'}`);
    } finally {
      this.joiningServer.set(false);
    }
  }
  
  // IWAD filtering methods
  toggleGameFilter(gameType: string) {
    const current = this.activeGameFilters();
    if (current.includes(gameType)) {
      this.activeGameFilters.set(current.filter(g => g !== gameType));
    } else {
      this.activeGameFilters.set([...current, gameType]);
    }
  }
  
  toggleAllGames() {
    this.activeGameFilters.set([]);
  }
  
  // Game type filtering methods
  toggleGameTypeFilter(gameType: OdalPapi.GameType) {
    const current = this.activeGameTypeFilters();
    if (current.includes(gameType)) {
      this.activeGameTypeFilters.set(current.filter(gt => gt !== gameType));
    } else {
      this.activeGameTypeFilters.set([...current, gameType]);
    }
  }
  
  toggleAllGameTypes() {
    this.activeGameTypeFilters.set([]);
  }
  
  isGameTypeFilterEnabled(gameType: OdalPapi.GameType): boolean {
    return this.activeGameTypeFilters().includes(gameType);
  }

  sortBy(column: string) {
    if (this.sortColumn() === column) {
      // Toggle direction if same column
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
  
  isGameFilterEnabled(gameType: string): boolean {
    return this.activeGameFilters().includes(gameType);
  }
  
  getGameDisplayName(gameType: string): string {
    const metadata = this.iwadService.gameMetadata()[gameType];
    return metadata?.displayName || gameType;
  }

  isLocalServer(server: OdalPapi.ServerInfo): boolean {
    const localServers = this.store.localServers();
    return localServers.some(s => 
      s.address.ip === server.address.ip && s.address.port === server.address.port
    );
  }
  
  isCustomServer(server: OdalPapi.ServerInfo): boolean {
    const customServers = this.customStore.servers();
    const localServers = this.store.localServers();
    const masterServers = this.store.servers();
    
    // Check if it's in custom servers
    const inCustom = customServers.some(s => 
      s.address.ip === server.address.ip && s.address.port === server.address.port
    );
    
    // Not a custom server if it's also in local or master (deduplication)
    const inLocal = localServers.some(s => 
      s.address.ip === server.address.ip && s.address.port === server.address.port
    );
    const inMaster = masterServers.some(s => 
      s.address.ip === server.address.ip && s.address.port === server.address.port
    );
    
    return inCustom && !inLocal && !inMaster;
  }
  
  openCustomServers() {
    this.customServersModal?.open();
  }
  
  getServerGame(server: OdalPapi.ServerInfo): string {
    // Local servers may not have full WAD info yet
    if (this.isLocalServer(server) && (!server.wads || server.wads.length === 0)) {
      return 'Local Server';
    }
    
    if (!server.wads || server.wads.length === 0) {
      return 'Unknown';
    }

    // Look through wads to find the IWAD (usually first, but skip odamex.wad)
    const iwad = server.wads.find(w => !w.name.toLowerCase().includes('odamex'));
    if (!iwad) {
      return 'Unknown';
    }

    const iwadName = iwad.name.toLowerCase().replace('.wad', '');
    
    // Map IWAD names to display names
    if (iwadName === 'doom1') return 'DOOM Shareware';
    if (iwadName.includes('doom2')) return 'DOOM II';
    if (iwadName.includes('plutonia')) return 'Plutonia';
    if (iwadName.includes('tnt')) return 'TNT';
    if (iwadName.includes('doom')) return 'DOOM';
    if (iwadName.includes('heretic')) return 'Heretic';
    if (iwadName.includes('hexen')) return 'Hexen';
    if (iwadName.includes('strife')) return 'Strife';
    if (iwadName.includes('chex')) return 'Chex Quest';
    if (iwadName.includes('freedoom1')) return 'Freedoom: Phase 1';
    if (iwadName.includes('freedoom2')) return 'Freedoom: Phase 2';
    if (iwadName.includes('freedm')) return 'FreeDM';
    if (iwadName.includes('hacx')) return 'HACX';
    if (iwadName.includes('rekkr')) return 'REKKR';
    
    return this.getGameDisplayName(iwadName);
  }

  getServerPWADs(server: OdalPapi.ServerInfo): string[] {
    if (!server.wads || server.wads.length === 0) {
      return [];
    }

    // Filter out odamex.wad and the IWAD (first non-odamex wad)
    const iwad = server.wads.find(w => !w.name.toLowerCase().includes('odamex'));
    return server.wads
      .filter(w => {
        const name = w.name.toLowerCase();
        // Skip odamex.wad
        if (name.includes('odamex')) return false;
        // Skip the IWAD
        if (iwad && w.name === iwad.name) return false;
        return true;
      })
      .map(w => w.name);
  }
  
  private matchesIWAD(iwadName: string, gameType: string): boolean {
    // Map game types to IWAD names (exact matches)
    const iwadMap: Record<string, string[]> = {
      'doom': ['doom', 'doomu'],
      'doom_shareware': ['doom1'],
      'doom_registered': ['doom'],
      'doom2': ['doom2', 'doom2f'],
      'tnt': ['tnt'],
      'plutonia': ['plutonia'],
      'final_doom': ['tnt', 'plutonia'], // Group both Final Doom IWADs
      'freedoom1': ['freedoom1'],
      'freedoom2': ['freedoom2'],
      'freedm': ['freedm'],
      'chex': ['chex', 'chex1', 'chex3'],
      'hacx': ['hacx'],
      'rekkr': ['rekkr', 'rekkrsa']
    };
    
    const validNames = iwadMap[gameType] || [gameType];
    // Use exact match instead of includes to avoid doom1 matching doom
    return validNames.some(name => iwadName === name);
  }
  
  // Panel resize functionality
  startResize(event: MouseEvent) {
    event.preventDefault();
    
    this.resizing.set(true);
    
    this.startY = event.clientY;
    
    const detailsPanel = document.querySelector('.server-details-panel') as HTMLElement;
    const container = document.querySelector('.server-browser-container') as HTMLElement;
    
    if (!detailsPanel || !container) return;
    
    this.startHeight = detailsPanel.offsetHeight;
    const containerHeight = container.offsetHeight;
    const minHeight = 72; // Collapsed height
    const maxHeight = containerHeight - 200; // Leave at least 200px for server list
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    
    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.resizing()) return;
      
      const delta = this.startY - e.clientY; // Reversed because panel is at bottom
      const newHeight = Math.max(minHeight, Math.min(maxHeight, this.startHeight + delta));
      
      // Use pixel height during drag for better performance
      detailsPanel.style.height = `${newHeight}px`;
    };
    
    const mouseUpHandler = () => {
      this.resizing.set(false);
      
      // Restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // Convert final pixel height to percentage for responsiveness
      if (detailsPanel) {
        const finalHeight = detailsPanel.offsetHeight;
        const containerHeight = container.offsetHeight;
        const percentage = (finalHeight / containerHeight) * 100;
        detailsPanel.style.height = `${percentage}%`;
      }
      
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }
  
  toggleDetailsPanel() {
    const detailsPanel = document.querySelector('.server-details-panel') as HTMLElement;
    if (detailsPanel) {
      if (!this.detailsPanelCollapsed()) {
        // Collapsing: save current height
        this.savedPanelHeight = detailsPanel.style.height || '30%';
        detailsPanel.style.height = '';
      } else {
        // Expanding: restore saved height
        if (this.savedPanelHeight) {
          detailsPanel.style.height = this.savedPanelHeight;
        } else {
          detailsPanel.style.height = '30%';
        }
      }
    }
    this.detailsPanelCollapsed.update(val => !val);
  }
}
