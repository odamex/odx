import { Injectable, inject, Type, TemplateRef } from '@angular/core';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

/**
 * Configuration options for opening dialogs.
 * Extends NgbModalOptions with additional convenience options.
 */
export interface DialogConfig extends NgbModalOptions {
  /**
   * Size of the modal.
   * - 'sm': Small (300px)
   * - 'lg': Large (800px)
   * - 'xl': Extra large (1140px)
   * - string: Custom size class
   */
  size?: 'sm' | 'lg' | 'xl' | string;
  
  /**
   * Whether the modal should have a backdrop.
   * - true: Backdrop is present and clickable (dismisses modal)
   * - false: No backdrop
   * - 'static': Backdrop is present but not clickable (non-dismissible)
   */
  backdrop?: boolean | 'static';
  
  /**
   * Whether the modal should close on ESC key.
   * Default: true
   */
  keyboard?: boolean;
  
  /**
   * Whether the modal should be vertically centered.
   * Default: true
   */
  centered?: boolean;
  
  /**
   * Whether the modal body should be scrollable.
   * Default: false
   */
  scrollable?: boolean;
  
  /**
   * Custom CSS class for the modal dialog element.
   */
  modalDialogClass?: string;
  
  /**
   * Custom CSS class for the backdrop element.
   */
  backdropClass?: string;
  
  /**
   * Animation style for modal appearance.
   * - 'fade': Default fade animation
   * - 'none': No animation
   */
  animation?: boolean;
}

/**
 * Preset dialog configurations for common use cases.
 */
export const DialogPresets = {
  /**
   * Standard dismissible dialog (click outside or ESC to close).
   */
  standard: (): DialogConfig => ({
    backdrop: true,
    keyboard: true,
    centered: true,
    animation: true,
    modalDialogClass: 'odx-modal'
  }),
  
  /**
   * Non-dismissible dialog (must use dialog buttons to close).
   * Used for critical flows like first-run setup.
   */
  nonDismissible: (): DialogConfig => ({
    backdrop: 'static',
    keyboard: false,
    centered: true,
    animation: true,
    modalDialogClass: 'odx-modal'
  }),
  
  /**
   * Large dialog for content-heavy modals.
   */
  large: (): DialogConfig => ({
    backdrop: true,
    keyboard: true,
    centered: true,
    size: 'lg',
    animation: true,
    modalDialogClass: 'odx-modal'
  }),
  
  /**
   * Confirmation dialog preset.
   */
  confirmation: (): DialogConfig => ({
    backdrop: true,
    keyboard: true,
    centered: true,
    size: 'sm',
    animation: true,
    modalDialogClass: 'odx-modal'
  })
};

/**
 * Service for managing application dialogs using NgBootstrap modals.
 * Provides a consistent API and styling for all modal dialogs.
 * 
 * @example
 * ```typescript
 * // Open a standard modal with a component
 * const modalRef = this.dialogService.open(MyComponent, DialogPresets.standard());
 * modalRef.result.then(
 *   (result) => console.log('Closed with:', result),
 *   (reason) => console.log('Dismissed with:', reason)
 * );
 * 
 * // Pass data to the modal component
 * const modalRef = this.dialogService.open(MyComponent, {
 *   ...DialogPresets.standard(),
 *   injector: Injector.create({
 *     providers: [{ provide: DATA_TOKEN, useValue: myData }]
 *   })
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private modalService = inject(NgbModal);
  
  /**
   * Opens a modal dialog with the specified component or template.
   * 
   * @param content Component type or TemplateRef to display in the modal
   * @param config Configuration options for the modal
   * @returns NgbModalRef instance for interacting with the modal
   */
  open<T = any>(
    content: Type<T> | TemplateRef<T>,
    config: DialogConfig = DialogPresets.standard()
  ): NgbModalRef {
    return this.modalService.open(content, config);
  }
  
  /**
   * Dismisses all currently open modals.
   * 
   * @param reason Optional reason for dismissal
   */
  dismissAll(reason?: any): void {
    this.modalService.dismissAll(reason);
  }
  
  /**
   * Checks if any modal is currently open.
   * 
   * @returns True if at least one modal is open
   */
  hasOpenModals(): boolean {
    return this.modalService.hasOpenModals();
  }
}
