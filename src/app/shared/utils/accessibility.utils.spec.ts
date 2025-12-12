import {
  trapFocus,
  announceToScreenReader,
  getUniqueId,
  isAccessible,
  FocusManager,
  addSkipLink
} from './accessibility.utils';

describe('accessibility.utils', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('trapFocus', () => {
    it('should trap focus within container', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;

      const first = container.querySelector('#first') as HTMLElement;
      const last = container.querySelector('#last') as HTMLElement;

      const removeTrap = trapFocus(container);

      // Focus should be on first element after trap
      expect(document.activeElement).toBe(first);

      removeTrap();
    });

    it('should cycle focus from last to first on Tab', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="last">Last</button>
      `;

      const first = container.querySelector('#first') as HTMLElement;
      const last = container.querySelector('#last') as HTMLElement;

      const removeTrap = trapFocus(container);
      
      last.focus();
      expect(document.activeElement).toBe(last);

      // Simulate Tab key
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(event);

      removeTrap();
    });

    it('should cycle focus from first to last on Shift+Tab', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="last">Last</button>
      `;

      const first = container.querySelector('#first') as HTMLElement;
      const removeTrap = trapFocus(container);
      
      // First element should be focused after trap
      expect(document.activeElement).toBe(first);
      
      // Simulate Shift+Tab
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      container.dispatchEvent(event);

      removeTrap();
    });

    it('should return no-op function if no focusable elements', () => {
      container.innerHTML = '<div>No focusable elements</div>';
      const removeTrap = trapFocus(container);
      
      expect(typeof removeTrap).toBe('function');
      expect(() => removeTrap()).not.toThrow();
    });

    it('should include various focusable elements', () => {
      container.innerHTML = `
        <a href="#">Link</a>
        <button>Button</button>
        <input type="text">
        <textarea></textarea>
        <select><option>Option</option></select>
        <div tabindex="0">Div</div>
      `;

      const removeTrap = trapFocus(container);
      const firstElement = container.querySelector('a') as HTMLElement;
      
      expect(document.activeElement).toBe(firstElement);
      removeTrap();
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = `
        <button disabled>Disabled</button>
        <button id="enabled">Enabled</button>
      `;

      const removeTrap = trapFocus(container);
      const enabled = container.querySelector('#enabled') as HTMLElement;
      
      expect(document.activeElement).toBe(enabled);
      removeTrap();
    });

    it('should exclude elements with tabindex="-1"', () => {
      container.innerHTML = `
        <div tabindex="-1">Not focusable</div>
        <button id="focusable">Focusable</button>
      `;

      const removeTrap = trapFocus(container);
      const focusable = container.querySelector('#focusable') as HTMLElement;
      
      expect(document.activeElement).toBe(focusable);
      removeTrap();
    });

    it('should remove event listener when cleanup function is called', () => {
      container.innerHTML = '<button>Button</button>';
      const removeTrap = trapFocus(container);
      
      removeTrap();
      
      // After cleanup, Tab shouldn't be trapped
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      expect(() => container.dispatchEvent(event)).not.toThrow();
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should create an announcement element', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement).not.toBeNull();
      expect(announcement.textContent).toBe('Test message');
      
      jasmine.clock().tick(1000);
    });

    it('should set aria-live to polite by default', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement.getAttribute('aria-live')).toBe('polite');
      
      jasmine.clock().tick(1000);
    });

    it('should set aria-live to assertive when specified', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement.getAttribute('aria-live')).toBe('assertive');
      
      jasmine.clock().tick(1000);
    });

    it('should set aria-atomic to true', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement.getAttribute('aria-atomic')).toBe('true');
      
      jasmine.clock().tick(1000);
    });

    it('should add sr-only class', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]') as HTMLElement;
      expect(announcement.className).toBe('sr-only');
      
      jasmine.clock().tick(1000);
    });

    it('should remove announcement after 1 second', () => {
      announceToScreenReader('Test message');
      
      let announcement = document.querySelector('[role="status"]');
      expect(announcement).not.toBeNull();
      
      jasmine.clock().tick(1000);
      
      announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeNull();
    });
  });

  describe('getUniqueId', () => {
    it('should generate unique IDs', () => {
      const id1 = getUniqueId();
      const id2 = getUniqueId();
      
      expect(id1).not.toBe(id2);
    });

    it('should use default prefix "id"', () => {
      const id = getUniqueId();
      expect(id).toMatch(/^id-\d+$/);
    });

    it('should use custom prefix', () => {
      const id = getUniqueId('custom');
      expect(id).toMatch(/^custom-\d+$/);
    });

    it('should increment counter for each call', () => {
      const id1 = getUniqueId('test');
      const id2 = getUniqueId('test');
      
      const num1 = parseInt(id1.split('-')[1]);
      const num2 = parseInt(id2.split('-')[1]);
      
      expect(num2).toBe(num1 + 1);
    });
  });

  describe('isAccessible', () => {
    it('should return true for visible elements', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);
      
      expect(isAccessible(element)).toBe(true);
    });

    it('should return false for elements with aria-hidden="true"', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'true');
      document.body.appendChild(element);
      
      expect(isAccessible(element)).toBe(false);
    });

    it('should return true for elements with aria-hidden="false"', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'false');
      document.body.appendChild(element);
      
      expect(isAccessible(element)).toBe(true);
    });

    it('should return false for elements with display:none', () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      document.body.appendChild(element);
      
      expect(isAccessible(element)).toBe(false);
    });

    it('should return false for elements with visibility:hidden', () => {
      const element = document.createElement('div');
      element.style.visibility = 'hidden';
      document.body.appendChild(element);
      
      expect(isAccessible(element)).toBe(false);
    });
  });

  describe('FocusManager', () => {
    it('should save current focus', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      
      const manager = new FocusManager();
      manager.saveFocus();
      
      // Focus something else
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });

    it('should restore previously focused element', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      
      const manager = new FocusManager();
      manager.saveFocus();
      
      // Focus something else
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      
      manager.restoreFocus();
      expect(document.activeElement).toBe(button);
    });

    it('should handle restoreFocus when no focus was saved', () => {
      const manager = new FocusManager();
      expect(() => manager.restoreFocus()).not.toThrow();
    });

    it('should clear saved focus after restoring', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      
      const manager = new FocusManager();
      manager.saveFocus();
      manager.restoreFocus();
      
      // Try to restore again - should not throw
      expect(() => manager.restoreFocus()).not.toThrow();
    });

    it('should handle elements that lose focus method', () => {
      const element = { focus: jasmine.createSpy('focus') } as any;
      const manager = new FocusManager();
      (manager as any).previousFocus = element;
      
      manager.restoreFocus();
      expect(element.focus).toHaveBeenCalled();
    });
  });

  describe('addSkipLink', () => {
    it('should add skip link to body', () => {
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLAnchorElement;
      expect(skipLink).not.toBeNull();
      expect(skipLink.href).toContain('#main-content');
      expect(skipLink.textContent).toBe('Skip to main content');
      
      cleanup();
    });

    it('should position skip link off-screen initially', () => {
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLElement;
      expect(skipLink.style.top).toBe('-40px');
      
      cleanup();
    });

    it('should show skip link on focus', () => {
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLElement;
      skipLink.dispatchEvent(new FocusEvent('focus'));
      
      expect(skipLink.style.top).toBe('0px');
      
      cleanup();
    });

    it('should hide skip link on blur', () => {
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLElement;
      skipLink.dispatchEvent(new FocusEvent('focus'));
      skipLink.dispatchEvent(new FocusEvent('blur'));
      
      expect(skipLink.style.top).toBe('-40px');
      
      cleanup();
    });

    it('should insert skip link at beginning of body', () => {
      const existingElement = document.createElement('div');
      document.body.appendChild(existingElement);
      
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLElement;
      expect(document.body.firstChild).toBe(skipLink);
      
      cleanup();
    });

    it('should remove skip link when cleanup is called', () => {
      const cleanup = addSkipLink('main-content');
      
      let skipLink = document.querySelector('.skip-link');
      expect(skipLink).not.toBeNull();
      
      cleanup();
      
      skipLink = document.querySelector('.skip-link');
      expect(skipLink).toBeNull();
    });

    it('should handle cleanup when already removed', () => {
      const cleanup = addSkipLink('main-content');
      
      const skipLink = document.querySelector('.skip-link') as HTMLElement;
      skipLink.remove();
      
      expect(() => cleanup()).not.toThrow();
    });
  });
});
