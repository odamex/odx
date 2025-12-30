import { Component, ChangeDetectionStrategy, inject, computed, effect, HostListener, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy, DestroyRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppSettingsService, ControllerService, ControllerFocusService, GamepadButton, type ControllerEvent } from '@shared/services';
import {
  bootstrapHouseFill,
  bootstrapController,
  bootstrapKeyboard,
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
      bootstrapKeyboard,
      bootstrapPeopleFill,
      bootstrapListUl,
      bootstrapHddStackFill,
      bootstrapPeople,
      bootstrapGearFill,
      bootstrapPersonCircle
    })
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationComponent implements AfterViewInit, OnDestroy {
  private appSettings = inject(AppSettingsService);
  private controllerService = inject(ControllerService);
  private focusService = inject(ControllerFocusService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  protected developerMode = computed(() => this.appSettings.developerMode());
  
  @ViewChildren('navLink') navLinks!: QueryList<ElementRef<HTMLAnchorElement>>;
  private currentFocusIndex = 0; // Start with first item
  private isNavigatingWithKeyboard = false;
  private controllerUnsubscribe?: () => void;
  private initialized = false;

  constructor() {
    // Watch for focus returning to navigation and refocus current nav item
    effect(() => {
      if (this.focusService.focusArea() === 'navigation' && this.initialized) {
        // Focus immediately to prevent missing button presses
        this.focusCurrentNavItem();
      }
    });
  }

  protected readonly allNavItems: NavItem[] = [
    { path: '/home', icon: 'bootstrapHouseFill', label: 'Home' },
    { path: '/singleplayer', icon: 'bootstrapKeyboard', label: 'Single Player' },
    { path: '/multiplayer', icon: 'bootstrapPeopleFill', label: 'Multiplayer' },
    { path: '/servers', icon: 'bootstrapListUl', label: 'Server Browser' },
    { path: '/hosting', icon: 'bootstrapHddStackFill', label: 'Server Hosting' },
    { path: '/community', icon: 'bootstrapPeople', label: 'Community' }
  ];

  protected topNavItems = computed(() => {
    const items = this.allNavItems;
    if (!this.developerMode()) {
      // Filter out Community and Server Hosting when not in developer mode
      return items.filter(item => 
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
    
    // Set current focus index to match the active route
    // Build array that matches what's actually rendered: [profile, ...topNavItems, ...bottomNavItems]
    let currentUrl = this.router.url;
    // Handle root path - map to /home
    if (currentUrl === '/') {
      currentUrl = '/home';
    }
    const profileItem = { path: '/profile', icon: 'bootstrapPersonCircle', label: 'Account' };
    const allItems = [profileItem, ...this.topNavItems(), ...this.bottomNavItems];
    const activeIndex = allItems.findIndex(item => currentUrl.startsWith(item.path));
    if (activeIndex !== -1) {
      this.currentFocusIndex = activeIndex;
    }
    
    this.updateTabIndices();
    
    // Mark as initialized so the effect can now handle focus changes
    this.initialized = true;
    
    // Only focus the current nav item on startup if controller is enabled
    // Keyboard navigation will focus naturally when Tab is pressed
    if (this.controllerService.enabled()) {
      this.focusCurrentNavItem();
    }
    
    // Setup controller event listener
    this.controllerUnsubscribe = this.controllerService.addEventListener(
      (event: ControllerEvent) => this.handleControllerEvent(event)
    );

    // Watch for route changes to automatically manage focus
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Scroll to top when route changes
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.scrollTop = 0;
        }
        
        // Content routes that should have content focus
        const contentRoutes = ['/servers', '/multiplayer', '/singleplayer', '/hosting', '/community', '/settings'];
        const isContentRoute = contentRoutes.some(route => event.url.startsWith(route));
        
        if (isContentRoute) {
          // Navigated to a content area via keyboard/mouse
          setTimeout(() => this.focusService.setFocus('content'), 100);
        } else {
          // Navigated away from content (home, etc.)
          setTimeout(() => this.focusService.setFocus('navigation'), 100);
        }
      }
    });
  }

  focusCurrentNavItem() {
    const navItems = this.navLinks.toArray();
    if (navItems.length > 0) {
      const element = navItems[this.currentFocusIndex].nativeElement;
      element.focus();
    }
  }
  
  ngOnDestroy() {
    // Clean up controller listener
    if (this.controllerUnsubscribe) {
      this.controllerUnsubscribe();
    }
  }
  
  private handleControllerEvent(event: ControllerEvent) {
    const navItems = this.navLinks.toArray();
    
    // Only handle if controller is enabled and a nav item has focus (or no element has focus)
    if (!this.controllerService.enabled()) {
      return;
    }
    
    // Handle directional navigation (D-pad or analog stick) - only if navigation has focus
    if (event.type === 'direction') {
      if (!this.focusService.hasFocus('navigation')) return;
      
      const hasNavFocus = navItems.some(link => link.nativeElement === document.activeElement);
      
      // If no nav item has focus, focus the current index
      if (!hasNavFocus && navItems.length > 0) {
        navItems[this.currentFocusIndex].nativeElement.focus();
        return;
      }
      
      if (event.direction === 'down') {
        this.navigateDown();
      } else if (event.direction === 'up') {
        this.navigateUp();
      }
    }
    
    // Handle button presses
    if (event.type === 'buttonpress') {
      const hasNavFocus = navItems.some(link => link.nativeElement === document.activeElement);
      
      if (hasNavFocus) {
        // A button (Cross/A) = activate/click the focused link and transfer focus to content
        if (event.button === GamepadButton.A) {
          navItems[this.currentFocusIndex].nativeElement.click();
          // Transfer focus to content area after navigation
          setTimeout(() => this.focusService.setFocus('content'), 100);
        }
      }
    }
  }
  
  private navigateDown() {
    const navItems = this.navLinks.toArray();
    this.isNavigatingWithKeyboard = true;
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % navItems.length;
    this.updateTabIndices();
    const element = navItems[this.currentFocusIndex].nativeElement;
    element.focus();
    
    setTimeout(() => {
      this.isNavigatingWithKeyboard = false;
    }, 100);
  }
  
  private navigateUp() {
    const navItems = this.navLinks.toArray();
    this.isNavigatingWithKeyboard = true;
    
    this.currentFocusIndex = (this.currentFocusIndex - 1 + navItems.length) % navItems.length;
    this.updateTabIndices();
    const element = navItems[this.currentFocusIndex].nativeElement;
    element.focus();
    
    setTimeout(() => {
      this.isNavigatingWithKeyboard = false;
    }, 100);
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
      
      // Clean up focus-visible attribute on blur
      link.nativeElement.addEventListener('blur', () => {
        link.nativeElement.removeAttribute('data-focus-visible-added');
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
