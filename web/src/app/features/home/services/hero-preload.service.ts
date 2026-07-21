import { Injectable, signal } from '@angular/core';
import { HERO_CONFIG } from './hero.config';

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  done: boolean;
}

@Injectable({ providedIn: 'root' })
export class HeroPreloadService {
  private cache = new Map<number, HTMLImageElement>();
  private totalFrames = HERO_CONFIG.frames.count;
  readonly progress = signal<PreloadProgress>({ loaded: 0, total: this.totalFrames, percent: 0, done: false });

  preload(mobile?: boolean): Promise<HTMLImageElement[]> {
    const count = mobile ? HERO_CONFIG.mobile.frames : this.totalFrames;
    this.totalFrames = count;

    const promises: Promise<HTMLImageElement>[] = [];

    for (let i = 0; i < count; i++) {
      const promise = new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.cache.set(i, img);
          this.progress.update(p => ({
            ...p,
            loaded: p.loaded + 1,
            percent: Math.round(((p.loaded + 1) / p.total) * 100),
          }));
          resolve(img);
        };
        img.onerror = () => {
          this.cache.set(i, img);
          this.progress.update(p => ({
            ...p,
            loaded: p.loaded + 1,
            percent: Math.round(((p.loaded + 1) / p.total) * 100),
          }));
          resolve(img);
        };
        img.src = HERO_CONFIG.frames.getUrl(i + 1);
      });
      promises.push(promise);
    }

    return Promise.all(promises).then((imgs) => {
      this.progress.update(p => ({ ...p, done: true }));
      return imgs;
    });
  }

  getFrame(index: number): HTMLImageElement | undefined {
    return this.cache.get(index);
  }

  clear(): void {
    this.cache.clear();
    this.progress.set({ loaded: 0, total: this.totalFrames, percent: 0, done: false });
  }
}
