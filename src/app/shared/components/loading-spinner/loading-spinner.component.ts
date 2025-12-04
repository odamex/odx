import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  template: `
    <div class="loading-spinner-overlay" [class.fixed]="fixed()">
      <div class="spinner"></div>
      @if (message()) {
        <p class="spinner-message">{{ message() }}</p>
      }
    </div>
  `,
  styles: `
    .loading-spinner-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      
      &.fixed {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
      }
    }

    .spinner {
      width: 80px;
      height: 80px;
      border: 6px solid rgba(74, 158, 255, 0.2);
      border-top-color: #4a9eff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner-message {
      font-size: 0.95rem;
      color: #ddd;
      margin: 0;
      text-align: center;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  /** Whether to position fixed relative to viewport (true) or relative to parent (false) */
  fixed = input<boolean>(false);
  
  /** Optional message to display below spinner */
  message = input<string>('');
}
