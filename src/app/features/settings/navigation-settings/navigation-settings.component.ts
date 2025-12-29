import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsCardComponent } from '@shared/components';
import { AppSettingsService, ControllerService } from '@shared/services';

@Component({
  selector: 'app-navigation-settings',
  imports: [CommonModule, FormsModule, SettingsCardComponent],
  templateUrl: './navigation-settings.component.html',
  styleUrls: ['./navigation-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationSettingsComponent {
  private appSettings = inject(AppSettingsService);
  private controllerService = inject(ControllerService);

  // Controller settings (computed from services)
  controllerEnabled = computed(() => this.appSettings.controllerEnabled());
  controllerSchema = computed(() => this.appSettings.controllerSchema());
  controllerDeadzone = computed(() => this.appSettings.controllerDeadzone());
  controllerShowButtonPrompts = computed(() => this.appSettings.controllerShowButtonPrompts());
  controllerConnected = computed(() => this.controllerService.connected());
  controllerName = computed(() => this.controllerService.controllerName());

  // Controller settings methods
  toggleControllerEnabled() {
    this.appSettings.setControllerEnabled(!this.controllerEnabled());
  }

  onControllerSchemaChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.appSettings.setControllerSchema(select.value as any);
  }

  onControllerDeadzoneChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const deadzone = parseFloat(input.value);
    this.appSettings.setControllerDeadzone(deadzone);
  }

  toggleControllerShowButtonPrompts() {
    this.appSettings.setControllerShowButtonPrompts(!this.controllerShowButtonPrompts());
  }
}
