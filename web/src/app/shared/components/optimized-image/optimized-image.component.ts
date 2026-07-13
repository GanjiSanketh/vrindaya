import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-optimized-image',
  standalone: true,
  templateUrl: './optimized-image.component.html',
  styleUrl:    './optimized-image.component.css',
})
export class OptimizedImageComponent {
  src         = input.required<string>();
  alt         = input.required<string>();
  fallback    = input<string>('assets/images/product-placeholder.png');
  eager       = input<boolean>(false);
  aspectRatio = input<string>('1 / 1');

  readonly loaded  = signal(false);
  readonly errored = signal(false);

  onLoad(): void  { this.loaded.set(true); }
  onError(): void { this.errored.set(true); this.loaded.set(true); }
}
