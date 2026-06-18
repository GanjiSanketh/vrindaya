import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';

export interface ExitIntentConfig {
  enabled: boolean;
  title:   string;
  message: string;
}

const DEFAULT_CONFIG: ExitIntentConfig = {
  enabled: true,
  title:   'Before You Go...',
  message: 'Explore our latest arrivals and best-selling ethnic collections.',
};

const SHOWN_KEY  = 'vrindaya_exit_intent_shown';
const CONFIG_KEY = 'vrindaya_exit_intent_config';

@Injectable({ providedIn: 'root' })
export class ExitIntentService {
  private readonly pid = inject(PLATFORM_ID);

  readonly shouldShow = signal(false);
  readonly config     = signal<ExitIntentConfig>(this.loadConfig());

  init(): void {
    if (!isPlatformBrowser(this.pid)) return;
    if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
    if (!this.config().enabled) return;

    // Desktop: cursor exits toward the top of the viewport
    document.addEventListener('mouseleave', (e: MouseEvent) => {
      if (e.clientY <= 5) this.trigger();
    });

    // Mobile: user switches app/tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.trigger();
    });

    // Mobile: 30-second inactivity timer
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      if (!this.shouldShow()) {
        timer = setTimeout(() => this.trigger(), 30_000);
      }
    };
    ['touchstart', 'scroll', 'mousemove', 'keypress'].forEach(ev =>
      document.addEventListener(ev, reset, { passive: true })
    );
    reset();
  }

  trigger(): void {
    if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
    if (!this.config().enabled) return;
    this.shouldShow.set(true);
  }

  dismiss(): void {
    this.shouldShow.set(false);
    if (isPlatformBrowser(this.pid)) {
      sessionStorage.setItem(SHOWN_KEY, '1');
    }
  }

  saveConfig(cfg: ExitIntentConfig): void {
    this.config.set(cfg);
    if (isPlatformBrowser(this.pid)) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    }
  }

  private loadConfig(): ExitIntentConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  }
}
