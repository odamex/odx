import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { InstallationInfo, DownloadProgress } from './file-manager.service';

interface FileManagerState {
  installationInfo: InstallationInfo | null;
  downloadProgress: DownloadProgress | null;
  loading: boolean;
  error: string | null;
}

const initialState: FileManagerState = {
  installationInfo: null,
  downloadProgress: null,
  loading: false,
  error: null
};

export const FileManagerStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setInstallationInfo(info: InstallationInfo) {
      patchState(store, { installationInfo: info, loading: false, error: null });
    },
    setDownloadProgress(progress: DownloadProgress | null) {
      patchState(store, { downloadProgress: progress });
    },
    clearDownloadProgress() {
      patchState(store, { downloadProgress: null });
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
