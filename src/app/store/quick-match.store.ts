import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { OdalPapi } from '@shared/services';

interface QuickMatchState {
  isMonitoring: boolean;
  matchFound: OdalPapi.ServerInfo | null;
  monitoringStartTime: number;
}

const initialState: QuickMatchState = {
  isMonitoring: false,
  matchFound: null,
  monitoringStartTime: 0
};

export const QuickMatchStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    startMonitoring() {
      patchState(store, {
        isMonitoring: true,
        matchFound: null,
        monitoringStartTime: Date.now()
      });
    },
    stopMonitoring() {
      patchState(store, {
        isMonitoring: false,
        matchFound: null,
        monitoringStartTime: 0
      });
    },
    setMatchFound(server: OdalPapi.ServerInfo | null) {
      patchState(store, { matchFound: server });
    }
  }))
);
