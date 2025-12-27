import { Component, ChangeDetectionStrategy, inject, computed, HostListener, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
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
export class NavigationComponent implements AfterViewInit {
  private appSettings = inject(AppSettingsService);
  private elementRef = inject(ElementRef);
  protected developerMode = computed(() => this.appSettings.developerMode());
  
  @ViewChildren('navLink') navLinks!: QueryList<ElementRef<HTMLAnchorElement>>;
  private currentFocusIndex = 0; // Start with first item
  private isNavigatingWithKeyboard = false;

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

  ngAfterViewInit() {
    // Initialize focus management
    this.setupFocusTracking();
    this.updateTabIndices();
  }

  private setupFocusTracking() {
    // Track which item has focus
    const navItems = this.navLinks.toArray();
    navItems.forEach((link, index) => {
      link.nativeElement.addEventListener('focus', () => {
        if (!this.isNavigatingWithKeyboard) {
          this.currentFocusIndex = index;
          this.updateTabIndices();
        }
      });
    });
  }

  private updateTabIndices() {
    // Roving tabindex: only the current item is tabbable
    const navItems = this.navLinks.toArray();
    navItems.forEach((link, index) => {
      link.nativeElement.tabIndex = index === this.currentFocusIndex ? 0 : -1;
    });
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const navItems = this.navLinks.toArray();
    
    // Only handle arrow keys if a nav item has focus
    if (!navItems.some(link => link.nativeElement === document.activeElement)) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.isNavigatingWithKeyboard = true;
      
      if (event.key === 'ArrowDown') {
        this.currentFocusIndex = (this.currentFocusIndex + 1) % navItems.length;
      } else {
        this.currentFocusIndex = (this.currentFocusIndex - 1 + navItems.length) % navItems.length;
      }
      
      this.updateTabIndices();
      navItems[this.currentFocusIndex].nativeElement.focus();
      
      // Reset flag after a short delay
      setTimeout(() => {
        this.isNavigatingWithKeyboard = false;
      }, 100);
    }
  }
}
