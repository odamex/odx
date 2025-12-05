import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable card component for settings sections
 * Provides consistent styling and layout for all settings cards
 */
@Component({
  selector: 'app-settings-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-card">
      <div class="card-header" *ngIf="hasHeader">
        <div class="card-title">
          <ng-content select="[card-icon]"></ng-content>
          <ng-content select="[card-title]"></ng-content>
        </div>
        <ng-content select="[card-actions]"></ng-content>
      </div>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: './settings-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsCardComponent {
  // Check if header content is projected
  hasHeader = true;
}
