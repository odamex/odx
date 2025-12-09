import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable card component for settings sections
 * Provides consistent styling and layout for all settings cards
 */
@Component({
  selector: 'app-settings-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-card.component.html',
  styleUrls: ['./settings-card.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsCardComponent {
  // Check if header content is projected
  hasHeader = true;
}
