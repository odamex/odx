import { Injectable, signal, inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { OdalPapi } from '@shared/services';

interface ServersState {
  servers: OdalPapi.ServerInfo[];
  localServers: OdalPapi.ServerInfo[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const initialState: ServersState = {
  servers: [],
  localServers: [],
  loading: false,
  error: null,
  lastUpdated: null
};

export const ServersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setServers(servers: OdalPapi.ServerInfo[]) {
      patchState(store, { 
        servers, 
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    },
    setLocalServers(localServers: OdalPapi.ServerInfo[]) {
      patchState(store, { localServers });
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
    updateServerPing(address: OdalPapi.MasterResponse, ping: number) {
      const servers = store.servers();
      const server = servers.find(s => 
        s.address.ip === address.ip && s.address.port === address.port
      );
      if (server) {
        server.ping = ping;
        patchState(store, { servers: [...servers] });
      }
      
      // Also check local servers
      const localServers = store.localServers();
      const localServer = localServers.find(s => 
        s.address.ip === address.ip && s.address.port === address.port
      );
      if (localServer) {
        localServer.ping = ping;
        patchState(store, { localServers: [...localServers] });
      }
    },
    reset() {
      patchState(store, initialState);
    }
  }))
);
