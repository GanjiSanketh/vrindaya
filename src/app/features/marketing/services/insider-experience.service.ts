import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type InsiderTrigger = 'ribbon' | 'exit-intent';

/**
 * Session-scoped: re-armed on every new browser session so the ribbon and
 * exit-intent modal remain a normal (if unobtrusive) part of the return-visit
 * experience, rather than permanently vanishing after one dismissal.
 */
const RIBBON_CLOSED_KEY = 'vrindaya_insider_ribbon_closed';
const EXIT_POPUP_SHOWN_KEY = 'vrindaya_exit_popup_shown';

/**
 * Persisted across sessions: once someone has actually joined, never ask
 * again — on this browser — regardless of session boundaries.
 */
const EXIT_POPUP_JOINED_KEY = 'vrindaya_exit_popup_joined';

const RIBBON_SCROLL_THRESHOLD = 0.45;
const MOBILE_MAX_WIDTH = 768;
const MOBILE_SCROLL_THRESHOLD = 0.70;
const MOBILE_TIME_THRESHOLD_MS = 45_000;
const DESKTOP_TOP_EXIT_PX = 10;

@Injectable({ providedIn: 'root' })
export class InsiderExperienceService {
  private readonly pid = inject(PLATFORM_ID);

  readonly ribbonVisible = signal(false);
  readonly modalOpen     = signal(false);
  readonly lastTrigger   = signal<InsiderTrigger>('ribbon');

  private ribbonHasAppeared = false;
  private exitIntentInitialized = false;
  private mobileTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (isPlatformBrowser(this.pid) && this.hasJoined()) {
      // Already converted on this browser — never show either surface again.
      this.ribbonHasAppeared = true;
    }
  }

  // ── Ribbon ───────────────────────────────────────────────────────────────

  /** Called by the ribbon's own scroll listener with the current scroll depth (0–1). */
  reportScrollDepth(depth: number): void {
    if (this.ribbonHasAppeared || this.hasJoined() || this.isRibbonDismissed()) return;
    if (depth < RIBBON_SCROLL_THRESHOLD) return;

    this.ribbonHasAppeared = true;
    this.ribbonVisible.set(true);
  }

  dismissRibbon(): void {
    this.ribbonVisible.set(false);
    if (isPlatformBrowser(this.pid)) {
      sessionStorage.setItem(RIBBON_CLOSED_KEY, '1');
    }
  }

  private isRibbonDismissed(): boolean {
    return isPlatformBrowser(this.pid) && sessionStorage.getItem(RIBBON_CLOSED_KEY) === '1';
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  openModal(trigger: InsiderTrigger): void {
    if (this.hasJoined()) return;
    this.lastTrigger.set(trigger);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  /** Called by the modal once a subscription succeeds — suppresses the ribbon too. */
  markJoined(): void {
    if (!isPlatformBrowser(this.pid)) return;
    localStorage.setItem(EXIT_POPUP_JOINED_KEY, '1');
    this.ribbonHasAppeared = true;
    this.ribbonVisible.set(false);
  }

  private hasJoined(): boolean {
    return isPlatformBrowser(this.pid) && localStorage.getItem(EXIT_POPUP_JOINED_KEY) === '1';
  }

  // ── Exit intent ──────────────────────────────────────────────────────────

  /** Attaches exit-intent listeners once. Safe to call repeatedly (idempotent). */
  initExitIntent(): void {
    if (!isPlatformBrowser(this.pid) || this.exitIntentInitialized) return;
    this.exitIntentInitialized = true;

    if (this.hasJoined() || this.hasExitPopupShown()) return;

    // Desktop: cursor exits toward the top of the viewport.
    document.addEventListener('mouseleave', (e: MouseEvent) => {
      if (this.isMobileViewport()) return;
      if (e.clientY <= DESKTOP_TOP_EXIT_PX) this.triggerExitIntent();
    });

    // Mobile: 70% scroll depth OR 45s on page, whichever comes first.
    let mobileScrollDepth = 0;
    window.addEventListener(
      'scroll',
      () => {
        if (!this.isMobileViewport()) return;
        mobileScrollDepth = this.currentScrollDepth();
        if (mobileScrollDepth >= MOBILE_SCROLL_THRESHOLD) this.triggerExitIntent();
      },
      { passive: true },
    );

    this.mobileTimer = setTimeout(() => {
      if (this.isMobileViewport()) this.triggerExitIntent();
    }, MOBILE_TIME_THRESHOLD_MS);
  }

  private triggerExitIntent(): void {
    if (this.hasJoined() || this.hasExitPopupShown() || this.modalOpen()) return;

    if (this.mobileTimer) {
      clearTimeout(this.mobileTimer);
      this.mobileTimer = null;
    }

    sessionStorage.setItem(EXIT_POPUP_SHOWN_KEY, '1');
    this.openModal('exit-intent');
  }

  private hasExitPopupShown(): boolean {
    return isPlatformBrowser(this.pid) && sessionStorage.getItem(EXIT_POPUP_SHOWN_KEY) === '1';
  }

  private isMobileViewport(): boolean {
    return isPlatformBrowser(this.pid) && window.innerWidth <= MOBILE_MAX_WIDTH;
  }

  private currentScrollDepth(): number {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    return scrollable <= 0 ? 1 : window.scrollY / scrollable;
  }
}
