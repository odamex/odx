import { TestBed } from '@angular/core/testing';
import { ServerRefreshService } from '../server-refresh.service';
import { OdalPapiService, NotificationService, OdalPapi } from '@shared/services';
import { ServersStore } from '@app/store';

describe('ServerRefreshService', () => {
  let service: ServerRefreshService;
  let mockOdalPapi: jasmine.SpyObj<OdalPapiService>;
  let mockStore: any;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockServerInfo = new OdalPapi.ServerInfo();
  mockServerInfo.name = 'Test Server';
  mockServerInfo.address = { ip: '192.168.1.1', port: 10666 };
  mockServerInfo.players = [
    { name: 'Player1', ping: 50, time: 100, kills: 5, deaths: 2, team: 0, color: 0, frags: 5, spectator: false },
    { name: 'Player2', ping: 60, time: 200, kills: 3, deaths: 4, team: 0, color: 1, frags: 3, spectator: false }
  ];
  mockServerInfo.maxPlayers = 16;
  mockServerInfo.responded = true;

  beforeEach(() => {
    localStorage.clear();

    // Mock window.electron
    (window as any).electron = {
      flashWindow: jasmine.createSpy('flashWindow')
    };

    mockOdalPapi = jasmine.createSpyObj('OdalPapiService', [
      'queryMasterServer',
      'queryGameServer'
    ]);

    mockStore = {
      clearError: jasmine.createSpy('clearError'),
      setError: jasmine.createSpy('setError'),
      setServers: jasmine.createSpy('setServers'),
      servers: jasmine.createSpy('servers').and.returnValue([])
    };

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'show'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ServerRefreshService,
        { provide: OdalPapiService, useValue: mockOdalPapi },
        { provide: ServersStore, useValue: mockStore },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(ServerRefreshService);
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).electron;
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(service.isEnabled()).toBe(true);
      expect(service.getMinutes()).toBe(5);
    });

    it('should load settings from localStorage', () => {
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem('autoRefreshEnabled', 'false');
      localStorage.setItem('autoRefreshMinutes', '10');

      TestBed.configureTestingModule({
        providers: [
          ServerRefreshService,
          { provide: OdalPapiService, useValue: mockOdalPapi },
          { provide: ServersStore, useValue: mockStore },
          { provide: NotificationService, useValue: mockNotificationService }
        ]
      });

      const newService = TestBed.inject(ServerRefreshService);

      expect(newService.isEnabled()).toBe(false);
      expect(newService.getMinutes()).toBe(10);
    });

    it('should handle invalid localStorage values gracefully', () => {
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem('autoRefreshMinutes', 'invalid');

      TestBed.configureTestingModule({
        providers: [
          ServerRefreshService,
          { provide: OdalPapiService, useValue: mockOdalPapi },
          { provide: ServersStore, useValue: mockStore },
          { provide: NotificationService, useValue: mockNotificationService }
        ]
      });

      const newService = TestBed.inject(ServerRefreshService);

      // Should fall back to default
      expect(newService.getMinutes()).toBe(5);
    });
  });

  describe('setEnabled', () => {
    it('should enable auto-refresh', () => {
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable auto-refresh', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
    });

    it('should persist setting to localStorage', () => {
      service.setEnabled(false);
      const stored = localStorage.getItem('autoRefreshEnabled');
      expect(stored).toBe('false');
    });
  });

  describe('setMinutes', () => {
    it('should update refresh interval', () => {
      service.setMinutes(10);
      expect(service.getMinutes()).toBe(10);
    });

    it('should persist setting to localStorage', () => {
      service.setMinutes(15);
      const stored = localStorage.getItem('autoRefreshMinutes');
      expect(stored).toBe('15');
    });

    it('should reject zero or negative values', () => {
      service.setMinutes(5);
      service.setMinutes(0);
      expect(service.getMinutes()).toBe(5);

      service.setMinutes(-10);
      expect(service.getMinutes()).toBe(5);
    });
  });

  describe('refreshServers', () => {
    it('should query master server and game servers', async () => {
      const masterList = [
        { ip: '192.168.1.1', port: 10666 }
      ];

      mockOdalPapi.queryMasterServer.and.returnValue(Promise.resolve(masterList));
      mockOdalPapi.queryGameServer.and.returnValue(Promise.resolve({ server: mockServerInfo, pong: 50 }));

      await service.refreshServers();

      expect(mockOdalPapi.queryMasterServer).toHaveBeenCalledWith('master1.odamex.net');
      expect(mockStore.clearError).toHaveBeenCalled();
    });

    it('should handle empty master server response', async () => {
      mockOdalPapi.queryMasterServer.and.returnValue(Promise.resolve([]));

      await service.refreshServers();

      expect(mockStore.setError).toHaveBeenCalledWith('No servers returned from master server');
    });

    it('should handle master server errors', async () => {
      mockOdalPapi.queryMasterServer.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      await service.refreshServers();

      expect(mockStore.setError).toHaveBeenCalled();
    });

    it('should prevent concurrent refreshes', async () => {
      mockOdalPapi.queryMasterServer.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      // Start first refresh
      const promise1 = service.refreshServers();
      // Immediately start second refresh
      const promise2 = service.refreshServers();

      await Promise.all([promise1, promise2]);

      // Should only call once
      expect(mockOdalPapi.queryMasterServer).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelRefresh', () => {
    it('should cancel in-progress refresh', async () => {
      mockOdalPapi.queryMasterServer.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve([{ ip: '192.168.1.1', port: 10666 }]), 1000))
      );

      // Start refresh
      const refreshPromise = service.refreshServers();

      // Cancel immediately
      service.cancelRefresh();

      await refreshPromise;

      // Should not set error since it was manually cancelled
      expect(mockStore.setError).not.toHaveBeenCalled();
    });
  });

  describe('player notifications', () => {
    it('should send notification when player joins', async () => {
      const masterList = [{ ip: '192.168.1.1', port: 10666 }];
      
      // First refresh with 0 players
      const emptyServer = new OdalPapi.ServerInfo();
      emptyServer.name = 'Test Server';
      emptyServer.address = { ip: '192.168.1.1', port: 10666 };
      emptyServer.players = [];
      emptyServer.responded = true;

      mockOdalPapi.queryMasterServer.and.returnValue(Promise.resolve(masterList));
      mockOdalPapi.queryGameServer.and.returnValue(Promise.resolve({ server: emptyServer, pong: 50 }));

      await service.refreshServers();

      // Second refresh with 1 player
      const serverWithPlayer = new OdalPapi.ServerInfo();
      serverWithPlayer.name = 'Test Server';
      serverWithPlayer.address = { ip: '192.168.1.1', port: 10666 };
      serverWithPlayer.players = [{ name: 'Player1', ping: 50, time: 100, kills: 0, deaths: 0, team: 0, color: 0, frags: 0, spectator: false }];
      serverWithPlayer.responded = true;

      mockOdalPapi.queryGameServer.and.returnValue(Promise.resolve({ server: serverWithPlayer, pong: 50 }));

      await service.refreshServers();

      // Should have sent notification about player joining
      expect(mockNotificationService.show).toHaveBeenCalled();
    });

    it('should not send duplicate notifications', async () => {
      const masterList = [{ ip: '192.168.1.1', port: 10666 }];
      
      mockOdalPapi.queryMasterServer.and.returnValue(Promise.resolve(masterList));
      mockOdalPapi.queryGameServer.and.returnValue(Promise.resolve({ server: mockServerInfo, pong: 50 }));

      // First refresh
      await service.refreshServers();

      // Second refresh with same player count
      await service.refreshServers();

      // Should only notify on first refresh
      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-refresh interval', () => {
    it('should not auto-refresh when disabled', (done) => {
      service.setEnabled(false);
      mockOdalPapi.queryMasterServer.and.returnValue(Promise.resolve([]));

      // Wait a bit to ensure no auto-refresh happens
      setTimeout(() => {
        expect(mockOdalPapi.queryMasterServer).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
