import { TestBed } from '@angular/core/testing';
import { IWADStore, DetectedIWAD, WADDirectoryConfig, GameMetadata } from '../iwad.store';

describe('IWADStore', () => {
  let store: InstanceType<typeof IWADStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IWADStore]
    });
    
    store = TestBed.inject(IWADStore);
  });

  describe('Initial State', () => {
    it('should initialize with empty arrays and default values', () => {
      expect(store.detectedIWADs()).toEqual([]);
      expect(store.wadDirectories()).toEqual({ directories: [], scanSteam: true });
      expect(store.gameMetadata()).toEqual({});
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('setDetectedIWADs', () => {
    it('should update detected IWADs and clear error', () => {
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        }
      ];

      store.setError('test error');
      store.setDetectedIWADs(mockIWADs);
      
      expect(store.detectedIWADs()).toEqual(mockIWADs);
      expect(store.error()).toBeNull();
    });

    it('should replace existing detected IWADs', () => {
      const firstBatch: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        }
      ];

      const secondBatch: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM 2',
            filename: 'doom2.wad',
            md5: 'def456',
            groupName: 'DOOM 2',
            game: 'doom2',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom2.wad',
          exists: true
        }
      ];

      store.setDetectedIWADs(firstBatch);
      store.setDetectedIWADs(secondBatch);
      
      expect(store.detectedIWADs()).toEqual(secondBatch);
    });
  });

  describe('setWADDirectories', () => {
    it('should update WAD directories and clear error', () => {
      const mockConfig: WADDirectoryConfig = {
        directories: [
          { path: '/path/to/wads', recursive: true },
          { path: '/another/path', recursive: false }
        ],
        scanSteam: false,
        lastScan: '2025-12-12T00:00:00.000Z'
      };

      store.setError('test error');
      store.setWADDirectories(mockConfig);
      
      expect(store.wadDirectories()).toEqual(mockConfig);
      expect(store.error()).toBeNull();
    });
  });

  describe('setGameMetadata', () => {
    it('should update game metadata', () => {
      const mockMetadata: Record<string, GameMetadata> = {
        doom: {
          type: 'doom',
          displayName: 'DOOM',
          description: 'The original DOOM',
          imageFilename: 'doom.png',
          commercial: true
        },
        freedoom: {
          type: 'freedoom',
          displayName: 'Freedoom',
          description: 'Free DOOM replacement',
          imageFilename: 'freedoom.png',
          commercial: false
        }
      };

      store.setGameMetadata(mockMetadata);
      
      expect(store.gameMetadata()).toEqual(mockMetadata);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      
      store.setLoading(false);
      expect(store.loading()).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      store.setLoading(true);
      store.setError('Test error message');
      
      expect(store.error()).toBe('Test error message');
      expect(store.loading()).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      store.setError('Test error');
      store.clearError();
      
      expect(store.error()).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various values
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        }
      ];
      const mockConfig: WADDirectoryConfig = {
        directories: [{ path: '/path/to/wads', recursive: true }],
        scanSteam: false
      };
      const mockMetadata: Record<string, GameMetadata> = {
        doom: {
          type: 'doom',
          displayName: 'DOOM',
          description: 'The original DOOM',
          imageFilename: 'doom.png',
          commercial: true
        }
      };

      store.setDetectedIWADs(mockIWADs);
      store.setWADDirectories(mockConfig);
      store.setGameMetadata(mockMetadata);
      store.setLoading(true);
      store.setError('test error');
      
      // Reset
      store.reset();
      
      // Verify all values are reset
      expect(store.detectedIWADs()).toEqual([]);
      expect(store.wadDirectories()).toEqual({ directories: [], scanSteam: true });
      expect(store.gameMetadata()).toEqual({});
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('displayGames computed signal', () => {
    it('should return detected IWADs with count', () => {
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        }
      ];

      store.setDetectedIWADs(mockIWADs);
      
      const displayGames = store.displayGames();
      expect(displayGames.length).toBe(1);
      expect(displayGames[0].entry.game).toBe('doom');
      expect((displayGames[0] as any).detectedCount).toBe(1);
    });

    it('should group multiple IWADs of same game type', () => {
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        },
        {
          entry: {
            name: 'DOOM (Ultimate)',
            filename: 'doomu.wad',
            md5: 'def456',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 110
          },
          path: '/path/to/doomu.wad',
          exists: true
        }
      ];

      store.setDetectedIWADs(mockIWADs);
      
      const displayGames = store.displayGames();
      expect(displayGames.length).toBe(1);
      expect((displayGames[0] as any).detectedCount).toBe(2);
    });

    it('should separate ID24 games from regular games', () => {
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100,
            id24: false
          },
          path: '/path/to/doom.wad',
          exists: true
        },
        {
          entry: {
            name: 'DOOM (ID24)',
            filename: 'doom_id24.wad',
            md5: 'ghi789',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100,
            id24: true
          },
          path: '/path/to/doom_id24.wad',
          exists: true
        }
      ];

      store.setDetectedIWADs(mockIWADs);
      
      const displayGames = store.displayGames();
      expect(displayGames.length).toBe(2);
      expect(displayGames.some(g => g.entry.id24 === true)).toBe(true);
      expect(displayGames.some(g => !g.entry.id24)).toBe(true);
    });

    it('should include non-commercial games with 0 count if not detected', () => {
      const mockMetadata: Record<string, GameMetadata> = {
        doom: {
          type: 'doom',
          displayName: 'DOOM',
          description: 'The original DOOM',
          imageFilename: 'doom.png',
          commercial: true
        },
        freedoom: {
          type: 'freedoom',
          displayName: 'Freedoom',
          description: 'Free DOOM replacement',
          imageFilename: 'freedoom.png',
          commercial: false
        }
      };

      store.setGameMetadata(mockMetadata);
      store.setDetectedIWADs([]);
      
      const displayGames = store.displayGames();
      
      // Should include freedoom (non-commercial) even though not detected
      const freedoom = displayGames.find(g => g.entry.game === 'freedoom');
      expect(freedoom).toBeDefined();
      expect((freedoom as any).detectedCount).toBe(0);
      expect(freedoom?.exists).toBe(false);
      
      // Should not include doom (commercial) if not detected
      const doom = displayGames.find(g => g.entry.game === 'doom');
      expect(doom).toBeUndefined();
    });

    it('should combine detected IWADs and non-commercial games', () => {
      const mockIWADs: DetectedIWAD[] = [
        {
          entry: {
            name: 'DOOM',
            filename: 'doom.wad',
            md5: 'abc123',
            groupName: 'DOOM',
            game: 'doom',
            deprecated: false,
            weight: 100
          },
          path: '/path/to/doom.wad',
          exists: true
        }
      ];

      const mockMetadata: Record<string, GameMetadata> = {
        doom: {
          type: 'doom',
          displayName: 'DOOM',
          description: 'The original DOOM',
          imageFilename: 'doom.png',
          commercial: true
        },
        freedoom: {
          type: 'freedoom',
          displayName: 'Freedoom',
          description: 'Free DOOM replacement',
          imageFilename: 'freedoom.png',
          commercial: false
        },
        chex: {
          type: 'chex',
          displayName: 'Chex Quest',
          description: 'Chex Quest',
          imageFilename: 'chex.png',
          commercial: false
        }
      };

      store.setDetectedIWADs(mockIWADs);
      store.setGameMetadata(mockMetadata);
      
      const displayGames = store.displayGames();
      
      // Should have doom (detected), freedoom (non-commercial), and chex (non-commercial)
      expect(displayGames.length).toBe(3);
      expect(displayGames.some(g => g.entry.game === 'doom')).toBe(true);
      expect(displayGames.some(g => g.entry.game === 'freedoom')).toBe(true);
      expect(displayGames.some(g => g.entry.game === 'chex')).toBe(true);
    });
  });
});
