import { Component, ChangeDetectionStrategy, signal, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-splash',
  imports: [DecimalPipe],
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
