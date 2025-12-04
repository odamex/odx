/**
 * Accessibility utilities for improved keyboard navigation and screen reader support
 * 
 * @module accessibility
 */

/**
 * Trap focus within a container (for modals, dialogs)
 * 
 * @param container HTML element to trap focus within
 * @returns Function to remove the trap
 * 
 * @example
 * const modal = document.querySelector('.modal');
 * const removeTrap = trapFocus(modal);
 * // Later: removeTrap();
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce a message to screen readers
 * 
 * @param message Message to announce
 * @param priority 'polite' (wait) or 'assertive' (interrupt)
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get a unique ID for ARIA attributes
 * 
 * @param prefix Prefix for the ID
 * @returns Unique ID string
 */
let idCounter = 0;
export function getUniqueId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Check if an element is visible to screen readers
 * 
 * @param element HTML element to check
 * @returns Whether the element is accessible
 */
export function isAccessible(element: HTMLElement): boolean {
  if (element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  return true;
}

/**
 * Manage focus restoration (useful for dialogs/modals)
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  /**
   * Save the currently focused element
   */
  saveFocus(): void {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  /**
   * Restore focus to the previously focused element
   */
  restoreFocus(): void {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }
}

/**
 * Add skip navigation link for keyboard users
 * 
 * @param targetId ID of the main content area
 * @returns Function to remove the skip link
 */
export function addSkipLink(targetId: string): () => void {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;

  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });

  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });

  document.body.insertBefore(skipLink, document.body.firstChild);

  return () => {
    if (skipLink.parentNode) {
      skipLink.parentNode.removeChild(skipLink);
    }
  };
}
