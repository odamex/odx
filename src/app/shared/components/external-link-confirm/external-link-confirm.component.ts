import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-external-link-confirm',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">
        <i class="bi bi-box-arrow-up-right me-2"></i>
        Open External Link
      </h4>
      <button type="button" class="btn-close" (click)="activeModal.dismiss()"></button>
    </div>
    
    <div class="modal-body">
      <p class="mb-3">You are about to open an external link in your browser:</p>
      <div class="url-display">
        <i class="bi bi-link-45deg"></i>
        <span>{{ url }}</span>
      </div>
      <div class="warning-message">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Make sure you trust this link before opening it.</span>
      </div>
    </div>
    
    <div class="modal-footer">
      <div class="dont-show-again">
        <input 
          type="checkbox" 
          class="form-check-input" 
          id="dontShowAgain"
          [(ngModel)]="dontShowAgain">
        <label class="form-check-label" for="dontShowAgain">
          Don't ask me again
        </label>
      </div>
      <div class="footer-buttons">
        <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">
          Cancel
        </button>
        <button type="button" class="btn btn-primary" (click)="confirm()">
          <i class="bi bi-box-arrow-up-right me-1"></i>
          Open Link
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
      border-bottom: 1px solid #3a3a3a;
      
      .modal-title {
        display: flex;
        align-items: center;
        color: #fff;
        font-size: 1.1rem;
        font-weight: 600;
        
        i {
          color: #0d6efd;
        }
      }
    }
    
    .modal-body {
      background: #1e1e1e;
      color: #ddd;
      padding: 1.5rem;
      
      p {
        font-size: 0.95rem;
        margin-bottom: 1rem;
      }
      
      .url-display {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        margin-bottom: 1rem;
        word-break: break-all;
        
        i {
          font-size: 1.25rem;
          color: #0d6efd;
          flex-shrink: 0;
        }
        
        span {
          font-family: monospace;
          font-size: 0.9rem;
          color: #fff;
        }
      }
      
      .warning-message {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 6px;
        
        i {
          color: #ffc107;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        
        span {
          font-size: 0.9rem;
          color: #ffc107;
        }
      }
    }
    
    .modal-footer {
      background: #1e1e1e;
      border-top: 1px solid #3a3a3a;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .dont-show-again {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        .form-check-input {
          cursor: pointer;
          background-color: #3a3a3a;
          border-color: #555;
          
          &:checked {
            background-color: #0d6efd;
            border-color: #0d6efd;
          }
          
          &:focus {
            box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
          }
        }
        
        .form-check-label {
          cursor: pointer;
          color: #999;
          font-size: 0.9rem;
          user-select: none;
        }
      }
      
      .footer-buttons {
        display: flex;
        gap: 0.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExternalLinkConfirmComponent {
  activeModal = inject(NgbActiveModal);
  
  url = '';
  dontShowAgain = false;
  
  confirm() {
    this.activeModal.close({ confirmed: true, dontShowAgain: this.dontShowAgain });
  }
}
