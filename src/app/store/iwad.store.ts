import { signalStore, withState, withMethods } from '@ngrx/signals';
import { patchState, type } from '@ngrx/signals';

export interface DetectedIWAD {
  entry: {
    name: string;
    filename: string;
    md5: string;
    groupName: string;
    game: string;
    deprecated: boolean;
    weight: number;
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
