import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface DetectedIWAD {
  entry: {
    name: string;
    filename: string;
    md5: string;
    groupName: string;
    game: string;
    deprecated: boolean;
    weight: number;
    id24?: boolean;
    isLatest?: boolean;
  };
  path: string;
  exists: boolean;
}

export interface WADDirectory {
  path: string;
  recursive: boolean;
}

export interface WADDirectoryConfig {
  directories: WADDirectory[];
  scanSteam: boolean;
  lastScan?: string;
}

export interface GameMetadata {
  type: string;
  displayName: string;
  description: string;
  imageFilename: string;
  commercial: boolean;
}

interface IWADState {
  detectedIWADs: DetectedIWAD[];
  wadDirectories: WADDirectoryConfig;
  gameMetadata: Record<string, GameMetadata>;
  loading: boolean;
  error: string | null;
}

const initialState: IWADState = {
  detectedIWADs: [],
  wadDirectories: { directories: [], scanSteam: true },
  gameMetadata: {},
  loading: false,
  error: null
};

export const IWADStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /**
     * All games to display - detected IWADs plus non-commercial games with 0 count
     */
    displayGames: computed(() => {
      const detected = store.detectedIWADs();
      const metadata = store.gameMetadata();
      const games = new Map<string, DetectedIWAD & { detectedCount?: number }>();
      
      // Add all detected IWADs - group by game type AND id24 status
      detected.forEach(iwad => {
        const gameType = iwad.entry.game;
        // Create a unique key combining game type and ID24 status
        const gameKey = iwad.entry.id24 ? `${gameType}_id24` : gameType;
        
        if (!games.has(gameKey)) {
          games.set(gameKey, { ...iwad, detectedCount: 1 });
        } else {
          const existing = games.get(gameKey)!;
          existing.detectedCount = (existing.detectedCount || 0) + 1;
        }
      });
      
      // Add all non-commercial games even if not detected (only non-ID24 versions)
      Object.entries(metadata).forEach(([gameType, meta]) => {
        if (!meta.commercial && !games.has(gameType)) {
          // Create a synthetic DetectedIWAD entry for non-commercial games
          games.set(gameType, {
            entry: {
              name: meta.displayName,
              filename: '',
              md5: '',
              groupName: meta.displayName,
              game: gameType,
              deprecated: false,
              weight: 0
            },
            path: '',
            exists: false,
            detectedCount: 0
          });
        }
      });
      
      return Array.from(games.values());
    })
  })),
  withMethods((store) => ({
    setDetectedIWADs(iwads: DetectedIWAD[]) {
      patchState(store, { detectedIWADs: iwads, error: null });
    },
    setWADDirectories(config: WADDirectoryConfig) {
      patchState(store, { wadDirectories: config, error: null });
    },
    setGameMetadata(metadata: Record<string, GameMetadata>) {
      patchState(store, { gameMetadata: metadata });
    },
    setLoading(loading: boolean) {
      patchState(store, { loading });
    },
    setError(error: string) {
      patchState(store, { error, loading: false });
    },
    clearError() {
      patchState(store, { error: null });
    },
    reset() {
      patchState(store, initialState);
    }
  }))
);

export type IWADStoreType = InstanceType<typeof IWADStore>;
