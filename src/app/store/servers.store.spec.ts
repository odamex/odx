import { TestBed } from '@angular/core/testing';
import { ServersStore } from './servers.store';
import { OdalPapi } from '@shared/services';

describe('ServersStore', () => {
  let store: InstanceType<typeof ServersStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServersStore]
    });
    
    store = TestBed.inject(ServersStore);
  });

  describe('Initial State', () => {
    it('should initialize with empty arrays and default values', () => {
      expect(store.servers()).toEqual([]);
      expect(store.localServers()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.lastUpdated()).toBeNull();
    });
  });

  describe('setServers', () => {
    it('should update servers and set lastUpdated timestamp', () => {
      const mockServers: OdalPapi.ServerInfo[] = [
        {
          address: { ip: '192.168.1.1', port: 10666 },
          name: 'Test Server 1',
          map: 'MAP01',
          numplayers: 4,
          maxplayers: 16,
          ping: 50
        } as unknown as OdalPapi.ServerInfo,
        {
          address: { ip: '192.168.1.2', port: 10667 },
          name: 'Test Server 2',
          map: 'MAP02',
          numplayers: 8,
          maxplayers: 16,
          ping: 75
        } as unknown as OdalPapi.ServerInfo
      ];

      const beforeTime = new Date();
      store.setServers(mockServers);
      const afterTime = new Date();
      
      expect(store.servers()).toEqual(mockServers);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      
      const lastUpdated = store.lastUpdated();
      expect(lastUpdated).not.toBeNull();
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastUpdated!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should replace existing servers', () => {
      const firstBatch: OdalPapi.ServerInfo[] = [
        {
          address: { ip: '192.168.1.1', port: 10666 },
          name: 'Server 1'
        } as unknown as OdalPapi.ServerInfo
      ];
      const secondBatch: OdalPapi.ServerInfo[] = [
        {
          address: { ip: '192.168.1.2', port: 10667 },
          name: 'Server 2'
        } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(firstBatch);
      const firstUpdate = store.lastUpdated();
      
      store.setServers(secondBatch);
      const secondUpdate = store.lastUpdated();
      
      expect(store.servers()).toEqual(secondBatch);
      expect(secondUpdate!.getTime()).toBeGreaterThanOrEqual(firstUpdate!.getTime());
    });

    it('should clear loading and error when setting servers', () => {
      store.setLoading(true);
      store.setError('test error');
      
      store.setServers([]);
      
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('setLocalServers', () => {
    it('should update local servers', () => {
      const mockLocalServers: OdalPapi.ServerInfo[] = [
        {
          address: { ip: '192.168.1.100', port: 10666 },
          name: 'Local Server',
          map: 'MAP01',
          numplayers: 2,
          maxplayers: 8
        } as unknown as OdalPapi.ServerInfo
      ];

      store.setLocalServers(mockLocalServers);
      
      expect(store.localServers()).toEqual(mockLocalServers);
    });

    it('should not affect regular servers list', () => {
      const mockServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '8.8.8.8', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];
      const mockLocalServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.100', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(mockServers);
      store.setLocalServers(mockLocalServers);
      
      expect(store.servers()).toEqual(mockServers);
      expect(store.localServers()).toEqual(mockLocalServers);
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

  describe('updateServerPing', () => {
    let mockServers: OdalPapi.ServerInfo[];
    let mockLocalServers: OdalPapi.ServerInfo[];

    beforeEach(() => {
      mockServers = [
        {
          address: { ip: '192.168.1.1', port: 10666 },
          name: 'Server 1',
          ping: 100
        } as unknown as OdalPapi.ServerInfo,
        {
          address: { ip: '192.168.1.2', port: 10667 },
          name: 'Server 2',
          ping: 150
        } as unknown as OdalPapi.ServerInfo
      ];

      mockLocalServers = [
        {
          address: { ip: '192.168.1.100', port: 10666 },
          name: 'Local Server 1',
          ping: 50
        } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(mockServers);
      store.setLocalServers(mockLocalServers);
    });

    it('should update ping for matching server in servers list', () => {
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.1', port: 10666 };
      
      store.updateServerPing(address, 75);
      
      const updatedServer = store.servers().find(s => 
        s.address.ip === '192.168.1.1' && s.address.port === 10666
      );
      expect(updatedServer?.ping).toBe(75);
    });

    it('should update ping for matching server in local servers list', () => {
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.100', port: 10666 };
      
      store.updateServerPing(address, 25);
      
      const updatedServer = store.localServers().find(s => 
        s.address.ip === '192.168.1.100' && s.address.port === 10666
      );
      expect(updatedServer?.ping).toBe(25);
    });

    it('should not affect other servers when updating ping', () => {
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.1', port: 10666 };
      
      store.updateServerPing(address, 75);
      
      const otherServer = store.servers().find(s => 
        s.address.ip === '192.168.1.2' && s.address.port === 10667
      );
      expect(otherServer?.ping).toBe(150);
    });

    it('should handle non-existent server gracefully', () => {
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.99', port: 10666 };
      const serversBefore = store.servers();
      
      store.updateServerPing(address, 100);
      
      expect(store.servers()).toEqual(serversBefore);
    });

    it('should create new array reference when updating ping', () => {
      const serversBefore = store.servers();
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.1', port: 10666 };
      
      store.updateServerPing(address, 75);
      
      const serversAfter = store.servers();
      expect(serversAfter).not.toBe(serversBefore);
    });

    it('should update both lists if server exists in both', () => {
      // Add same server to both lists
      const duplicateServer: OdalPapi.ServerInfo = {
        address: { ip: '192.168.1.1', port: 10666 },
        name: 'Duplicate Server',
        ping: 100
      } as unknown as OdalPapi.ServerInfo;
      
      store.setLocalServers([...mockLocalServers, duplicateServer]);
      
      const address: OdalPapi.MasterResponse = { ip: '192.168.1.1', port: 10666 };
      store.updateServerPing(address, 50);
      
      const serverInServers = store.servers().find(s => 
        s.address.ip === '192.168.1.1' && s.address.port === 10666
      );
      const serverInLocalServers = store.localServers().find(s => 
        s.address.ip === '192.168.1.1' && s.address.port === 10666
      );
      
      expect(serverInServers?.ping).toBe(50);
      expect(serverInLocalServers?.ping).toBe(50);
    });

    it('should handle updating ping for non-existent server gracefully', () => {
      const initialServers = [...store.servers()];
      const initialLocalServers = [...store.localServers()];
      
      // Try to update a server that doesn't exist
      const address: OdalPapi.MasterResponse = { ip: '999.999.999.999', port: 99999 };
      
      expect(() => store.updateServerPing(address, 50)).not.toThrow();
      
      // Lists should remain unchanged
      expect(store.servers()).toEqual(initialServers);
      expect(store.localServers()).toEqual(initialLocalServers);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various values
      const mockServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.1', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];
      const mockLocalServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.100', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(mockServers);
      store.setLocalServers(mockLocalServers);
      store.setLoading(true);
      store.setError('test error');
      
      // Reset
      store.reset();
      
      // Verify all values are reset
      expect(store.servers()).toEqual([]);
      expect(store.localServers()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.lastUpdated()).toBeNull();
    });
  });

  describe('State Interactions', () => {
    it('should handle multiple state updates independently', () => {
      store.setLoading(true);
      expect(store.loading()).toBe(true);
      expect(store.error()).toBeNull();
      
      store.setError('error occurred');
      expect(store.error()).toBe('error occurred');
      expect(store.loading()).toBe(false);
      
      store.clearError();
      expect(store.error()).toBeNull();
      expect(store.loading()).toBe(false);
    });

    it('should maintain independent state for servers and localServers', () => {
      const mockServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '8.8.8.8', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];
      const mockLocalServers: OdalPapi.ServerInfo[] = [
        { address: { ip: '192.168.1.1', port: 10666 } } as unknown as OdalPapi.ServerInfo
      ];

      store.setServers(mockServers);
      store.setLocalServers(mockLocalServers);
      
      expect(store.servers()).toEqual(mockServers);
      expect(store.localServers()).toEqual(mockLocalServers);
      expect(store.servers()).not.toBe(store.localServers());
    });
  });
});
