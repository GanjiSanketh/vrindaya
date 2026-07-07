import {
  Component, ElementRef, HostListener, OnDestroy, ViewChild,
  inject, signal, effect, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { InsiderExperienceService } from '../../services/insider-experience.service';
import { MarketingService } from '../../services/marketing.service';
import { MOBILE_NUMBER_PATTERN } from '../../models/marketing-subscriber.model';

type ModalState = 'form' | 'success' | 'duplicate';

const AUTO_CLOSE_DELAY_MS = 2_500;
const RESET_DELAY_MS = 300;
const FOCUSABLE_SELECTOR = 'button, input, [href], [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-insider-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './insider-modal.component.html',
  styleUrl: './insider-modal.component.css',
  animations: [
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('{{ duration }}ms ease', style({ opacity: 1 })),
      ], { params: { duration: 250 } }),
      transition(':leave', [
        animate('{{ duration }}ms ease', style({ opacity: 0 })),
      ], { params: { duration: 200 } }),
    ]),
    trigger('modalScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px) scale(0.96)' }),
        animate('{{ duration }}ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ], { params: { duration: 320 } }),
      transition(':leave', [
        animate('{{ duration }}ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(8px) scale(0.97)' })),
      ], { params: { duration: 220 } }),
    ]),
  ],
})
export class InsiderModalComponent implements OnDestroy {
  private readonly pid       = inject(PLATFORM_ID);
  private readonly fb        = inject(FormBuilder);
  readonly svc                = inject(InsiderExperienceService);
  private readonly marketing = inject(MarketingService);

  @ViewChild('modalCard') private modalCardRef?: ElementRef<HTMLElement>;

  readonly state       = signal<ModalState>('form');
  readonly submitting  = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confettiPieces = Array.from({ length: 12 }, (_, i) => i);

  private readonly reducedMotion = signal(false);
  private previouslyFocused: HTMLElement | null = null;
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.group({
    mobileNumber: ['', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]],
  });

  constructor() {
    if (isPlatformBrowser(this.pid)) {
      this.reducedMotion.set(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    effect(() => {
      if (!isPlatformBrowser(this.pid)) return;

      if (this.svc.modalOpen()) {
        document.body.style.overflow = 'hidden';
        this.previouslyFocused = document.activeElement as HTMLElement;
        setTimeout(() => this.focusFirstElement(), 0);
      } else {
        document.body.style.overflow = '';
        this.previouslyFocused?.focus();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    if (isPlatformBrowser(this.pid)) document.body.style.overflow = '';
  }

  animParams(enterDuration: number, leaveDuration: number): { value: string; params: { duration: number } } {
    const scale = this.reducedMotion() ? 0 : 1;
    return {
      value: '',
      params: { duration: (this.svc.modalOpen() ? enterDuration : leaveDuration) * scale },
    };
  }

  isInvalid(): boolean {
    const c = this.form.get('mobileNumber');
    return !!(c?.invalid && c?.touched);
  }

  onMobileInput(event: Event): void {
    const input      = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digitsOnly;
    this.form.get('mobileNumber')?.setValue(digitsOnly, { emitEvent: false });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.form.disable();
    this.errorMessage.set(null);
    const mobileNumber = this.form.getRawValue().mobileNumber ?? '';

    try {
      const result = await this.marketing.subscribe({
        mobileNumber,
        // Implicit consent — the modal's footer discloses this explicitly
        // ("No spam. Only meaningful updates."); there is no separate checkbox
        // in this design, matching the minimal single-field luxury pattern.
        consent: true,
        source: this.svc.lastTrigger() === 'exit-intent' ? 'Exit Intent Modal' : 'Sticky Ribbon',
      });

      if (result === 'duplicate') {
        this.state.set('duplicate');
      } else {
        this.svc.markJoined();
        this.state.set('success');
      }

      this.autoCloseTimer = setTimeout(() => this.close(), AUTO_CLOSE_DELAY_MS);
    } catch (err) {
      console.error('[Marketing]', err);
      this.errorMessage.set('Something went wrong. Please try again.');
    } finally {
      this.form.enable();
      this.submitting.set(false);
    }
  }

  onBackdropClick(): void {
    if (this.submitting()) return;
    this.close();
  }

  close(): void {
    if (this.submitting()) return;
    this.svc.closeModal();
    this.resetTimer = setTimeout(() => {
      this.state.set('form');
      this.form.reset({ mobileNumber: '' });
      this.errorMessage.set(null);
    }, RESET_DELAY_MS);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.svc.modalOpen()) return;

    if (e.key === 'Escape') {
      this.close();
      return;
    }

    if (e.key === 'Tab') this.trapFocus(e);
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusable = this.getFocusableElements();
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private focusFirstElement(): void {
    this.getFocusableElements()[0]?.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const root = this.modalCardRef?.nativeElement;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(el => !el.hasAttribute('disabled'));
  }
}
