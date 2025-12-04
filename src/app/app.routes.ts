import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'singleplayer',
    loadComponent: () => import('./features/singleplayer/singleplayer.component').then(m => m.SingleplayerComponent)
  },
  {
    path: 'multiplayer',
    loadComponent: () => import('./features/servers/servers.component').then(m => m.ServersComponent)
  },
  {
    path: 'servers',
    loadComponent: () => import('./features/multiplayer/multiplayer.component').then(m => m.MultiplayerComponent)
  },
  {
    path: 'community',
    loadComponent: () => import('./features/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  }
];
