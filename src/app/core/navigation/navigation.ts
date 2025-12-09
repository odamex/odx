import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppSettingsService } from '@shared/services';
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
  private appSettings = inject(AppSettingsService);
  protected developerMode = computed(() => this.appSettings.developerMode());

  protected readonly allNavItems: NavItem[] = [
    { path: '/home', icon: 'bootstrapHouseFill', label: 'Home' },
    { path: '/singleplayer', icon: 'bootstrapController', label: 'Single Player' },
    { path: '/multiplayer', icon: 'bootstrapPeopleFill', label: 'Multiplayer' },
    { path: '/servers', icon: 'bootstrapListUl', label: 'Server Browser' },
    { path: '/hosting', icon: 'bootstrapHddStackFill', label: 'Server Hosting' },
    { path: '/community', icon: 'bootstrapPeople', label: 'Community' }
  ];

  protected topNavItems = computed(() => {
    const items = this.allNavItems;
    if (!this.developerMode()) {
      // Filter out Single Player, Community, and Server Hosting when not in developer mode
      return items.filter(item => 
        item.path !== '/singleplayer' && 
        item.path !== '/community' && 
        item.path !== '/hosting'
      );
    }
    return items;
  });

  protected readonly bottomNavItems: NavItem[] = [
    { path: '/settings', icon: 'bootstrapGearFill', label: 'Settings', position: 'bottom' }
  ];
}
