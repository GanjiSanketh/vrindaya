import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LightboxService {
  private readonly _images = signal<string[]>([]);
  private readonly _index  = signal(0);

  readonly images      = this._images.asReadonly();
  readonly index       = this._index.asReadonly();
  readonly isOpen      = computed(() => this._images().length > 0);
  readonly current     = computed(() => this._images()[this._index()] ?? '');
  readonly hasMultiple = computed(() => this._images().length > 1);

  open(images: string[], startIndex = 0): void {
    this._images.set(images);
    this._index.set(Math.max(0, Math.min(startIndex, images.length - 1)));
  }

  close(): void {
    this._images.set([]);
    this._index.set(0);
  }

  next(): void {
    const len = this._images().length;
    if (len > 1) this._index.update(i => (i + 1) % len);
  }

  prev(): void {
    const len = this._images().length;
    if (len > 1) this._index.update(i => (i - 1 + len) % len);
  }

  goTo(i: number): void {
    if (i >= 0 && i < this._images().length) this._index.set(i);
  }
}
