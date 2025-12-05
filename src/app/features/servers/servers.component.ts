import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServersStore } from '@app/store';
import { OdalPapi, FileManagerService, IWADService, ServerRefreshService, NetworkStatusService } from '@shared/services';

@Component({
  selector: 'app-servers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './servers.component.html',
  styleUrl: './servers.component.scss',
})
export class ServersComponent {
  private fileManager = inject(FileManagerService);
  private refreshService = inject(ServerRefreshService);
  private networkStatus = inject(NetworkStatusService);
  protected iwadService = inject(IWADService);
  readonly store = inject(ServersStore);
  
  selectedServer = signal<OdalPapi.ServerInfo | null>(null);
  joiningServer = signal(false);
  
  // Panel resize and collapse
  detailsPanelCollapsed = signal(true);
  protected resizing = false;
  private startY = 0;
  private startHeight = 0;
  private savedPanelHeight: string | null = null;
  
  // Network status
  readonly isOnline = this.networkStatus.isOnline;
  
  // IWAD filtering
  activeGameFilters = signal<string[]>([]);
  showAllGames = computed(() => this.activeGameFilters().length === 0);
  
  // Sorting
  sortColumn = signal<string>('players');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Version filtering
  filterByVersion = signal(true);
  currentMajorVersion = signal<number | null>(null);
  
  filteredServers = computed(() => {
    const filters = this.activeGameFilters();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const versionFilter = this.filterByVersion();
    const currentMajor = this.currentMajorVersion();
    
    let servers = this.store.servers();
    
    // Apply version filtering
    if (versionFilter && currentMajor !== null) {
      servers = servers.filter(server => server.versionMajor === currentMajor);
    }
    
    // Apply game filters
    // Always filter by owned games - only show servers for IWADs we have
    const ownedGames = this.getUniqueGames().map(g => g.game);
    if (ownedGames.length > 0) {
      servers = servers.filter(server => {
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
  getUniqueGames = computed(() => {
    const iwads = this.iwadService.detectedIWADs();
    const uniqueGames = new Map<string, {game: string; displayName: string}>();
    
    iwads.forEach(iwad => {
      let gameKey = iwad.entry.game;
      let displayName = this.getGameDisplayName(iwad.entry.game);
      
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
          displayName: displayName
        });
      }
    });
    
    return Array.from(uniqueGames.values());
  });

  constructor() {
    // Load version filter setting
    const savedFilterByVersion = localStorage.getItem('filterByVersion');
    if (savedFilterByVersion !== null) {
      this.filterByVersion.set(savedFilterByVersion === 'true');
    }
    
    // Detect current Odamex version
    this.detectCurrentVersion();
  }

  private async detectCurrentVersion() {
    try {
      const info = await this.fileManager.getInstallationInfo();
      if (info.installed && info.version) {
        // Parse version string like "12.0.1" to get major version
        const match = info.version.match(/^(\d+)\.(\d+)/);
        if (match) {
          this.currentMajorVersion.set(parseInt(match[1], 10));
        }
      }
    } catch (err) {
      console.warn('Failed to detect current version:', err);
    }
  }

  async refreshServers() {
    await this.refreshService.refreshServers();
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

      // Build connection arguments
      const args = [
        '+connect',
        `${server.address.ip}:${server.address.port}`
      ];

      // Add WAD directories so client knows where to find IWADs
      const wadDirs = this.iwadService.wadDirectories();
      if (wadDirs.directories && wadDirs.directories.length > 0) {
        // Join directories with platform-specific separator (semicolon on Windows, colon elsewhere)
        const separator = window.electron.platform === 'win32' ? ';' : ':';
        const wadDirPath = wadDirs.directories.join(separator);
        args.push('-waddir', wadDirPath);
      }

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

  getServerGame(server: OdalPapi.ServerInfo): string {
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
    this.resizing = true;
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
      if (!this.resizing) return;
      
      const delta = this.startY - e.clientY; // Reversed because panel is at bottom
      const newHeight = Math.max(minHeight, Math.min(maxHeight, this.startHeight + delta));
      
      // Use pixel height during drag for better performance
      detailsPanel.style.height = `${newHeight}px`;
    };
    
    const mouseUpHandler = () => {
      this.resizing = false;
      
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
