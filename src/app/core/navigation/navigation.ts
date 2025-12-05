import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  bootstrapHouseFill,
  bootstrapController,
  bootstrapPeopleFill,
  bootstrapListUl,
  bootstrapHddStackFill,
  bootstrapPeople,
  bootstrapGearFill,
  bootstrapPersonCircle
} from '@ng-icons/bootstrap-icons';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  position?: 'top' | 'bottom';
}

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, NgIconComponent],
  viewProviders: [
    provideIcons({
      bootstrapHouseFill,
      bootstrapController,
      bootstrapPeopleFill,
      bootstrapListUl,
      bootstrapHddStackFill,
      bootstrapPeople,
      bootstrapGearFill,
      bootstrapPersonCircle
    })
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationComponent {
  protected readonly topNavItems: NavItem[] = [
    { path: '/home', icon: 'bootstrapHouseFill', label: 'Home' },
    { path: '/singleplayer', icon: 'bootstrapController', label: 'Single Player' },
    { path: '/multiplayer', icon: 'bootstrapPeopleFill', label: 'Multiplayer' },
    { path: '/servers', icon: 'bootstrapListUl', label: 'Server Browser' },
    { path: '/hosting', icon: 'bootstrapHddStackFill', label: 'Server Hosting' },
    { path: '/community', icon: 'bootstrapPeople', label: 'Community' }
  ];

  protected readonly bottomNavItems: NavItem[] = [
    { path: '/settings', icon: 'bootstrapGearFill', label: 'Settings', position: 'bottom' }
  ];
}
