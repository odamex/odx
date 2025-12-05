import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { InstallationInfo, DownloadProgress, DirectoryInfo } from '@shared/services';

interface FileManagerState {
  installationInfo: InstallationInfo | null;
  downloadProgress: DownloadProgress | null;
  directories: DirectoryInfo | null;
  wadFiles: string[];
  latestRelease: any | null;
  platformAsset: string;
  customPath: string;
  useCustomPath: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: FileManagerState = {
  installationInfo: null,
  downloadProgress: null,
  directories: null,
  wadFiles: [],
  latestRelease: null,
  platformAsset: '',
  customPath: '',
  useCustomPath: false,
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
    setDirectories(directories: DirectoryInfo) {
      patchState(store, { directories });
    },
    setWadFiles(wadFiles: string[]) {
      patchState(store, { wadFiles });
    },
    setLatestRelease(latestRelease: any) {
      patchState(store, { latestRelease });
    },
    setPlatformAsset(platformAsset: string) {
      patchState(store, { platformAsset });
    },
    setCustomPath(customPath: string) {
      patchState(store, { customPath });
    },
    setUseCustomPath(useCustomPath: boolean) {
      patchState(store, { useCustomPath });
    },
    reset() {
      patchState(store, initialState);
    }
  }))
);
