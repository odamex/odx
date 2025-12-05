import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('@app/features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'singleplayer',
    loadComponent: () => import('@app/features/singleplayer/singleplayer.component').then(m => m.SingleplayerComponent)
  },
  {
    path: 'multiplayer',
    loadComponent: () => import('@app/features/multiplayer/multiplayer.component').then(m => m.MultiplayerComponent)
  },
  {
    path: 'servers',
    loadComponent: () => import('@app/features/servers/servers.component').then(m => m.ServersComponent)
  },
  {
    path: 'hosting',
    loadComponent: () => import('@app/features/hosting/hosting.component').then(m => m.HostingComponent)
  },
  {
    path: 'community',
    loadComponent: () => import('@app/features/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('@app/features/settings/settings.component').then(m => m.SettingsComponent)
  }
];
