import { Component, ChangeDetectionStrategy, signal, input } from '@angular/core';

@Component({
  selector: 'app-splash',
  imports: [],
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplashComponent {
  message = input<string>('Initializing...');
  subMessage = input<string>('');
  progress = input<number | null>(null);
  version = input<string>('1.0.0');
  fadeOut = input<boolean>(false);
}
