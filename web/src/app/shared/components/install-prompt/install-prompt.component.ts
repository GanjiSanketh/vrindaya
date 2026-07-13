import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                               from '@angular/common';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  templateUrl: './install-prompt.component.html',
  styleUrl:    './install-prompt.component.css',
})
export class InstallPromptComponent implements OnInit {
  private readonly pid = inject(PLATFORM_ID);
  private deferredEvt: BeforeInstallPromptEvent | null = null;

  readonly showBanner = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid)) return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredEvt = e as BeforeInstallPromptEvent;
      // Show banner after 45 s — not intrusive on first visit
      setTimeout(() => this.showBanner.set(true), 45_000);
    });

    window.addEventListener('appinstalled', () => {
      this.showBanner.set(false);
      this.deferredEvt = null;
    });
  }

  async install(): Promise<void> {
    if (!this.deferredEvt) return;
    await this.deferredEvt.prompt();
    const { outcome } = await this.deferredEvt.userChoice;
    if (outcome === 'accepted') this.showBanner.set(false);
    this.deferredEvt = null;
  }

  dismiss(): void { this.showBanner.set(false); }
}
