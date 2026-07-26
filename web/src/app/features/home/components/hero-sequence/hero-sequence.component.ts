import { Component, input, output, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';

@Component({
  selector: 'app-hero-sequence',
  standalone: true,
  imports: [],
  template: `
    @if (showFallback()) {
      <div class="hero-fallback-bg" aria-hidden="true"></div>
    }

    <img
      [src]="currentSrc()"
      alt="Vrindaya — Wear The Grace"
      class="hero-image"
      [class.hero-image--loaded]="!loading()"
      [class.hero-image--hidden]="showFallback()"
      fetchpriority="high"
      loading="eager"
      decoding="async"
      (load)="onLoadSuccess()"
      (error)="onLoadError()"
    />
  `,
  styleUrl: './hero-sequence.component.css',
  host: { class: 'hero-sequence-container' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSequenceComponent implements OnInit {
  readonly fallbackImg = input<string>('');
  readonly loaded = output<void>();

  readonly currentSrc = signal<string>('');
  readonly loading = signal(true);
  readonly showFallback = signal(false);

  private retried = false;

  ngOnInit(): void {
    const src = this.fallbackImg();
    if (src) {
      this.currentSrc.set(src);
    }
  }

  onLoadSuccess(): void {
    this.loading.set(false);
    this.showFallback.set(false);
    this.loaded.emit();
  }

  onLoadError(): void {
    const currentUrl = this.currentSrc();
    console.error('[HeroSequence] Failed to load image:', currentUrl);

    if (!this.retried) {
      this.retried = true;
      const fallbackUrl = 'assets/hero/hero-fallback.png';
      this.currentSrc.set(fallbackUrl);
    } else {
      console.error('[HeroSequence] Fallback image also failed. Showing neutral background.');
      this.loading.set(false);
      this.showFallback.set(true);
      this.loaded.emit();
    }
  }
}
