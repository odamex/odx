import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SettingsCardComponent } from '@app/shared/components/settings-card/settings-card.component';

@Component({
  selector: 'app-about-settings',
  imports: [SettingsCardComponent],
  templateUrl: './about-settings.component.html',
  styleUrl: './about-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutSettingsComponent {
  openLink(url: string) {
    if (window.electron) {
      window.electron.openExternal(url);
    }
  }
}
