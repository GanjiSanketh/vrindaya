import { Component, output, input } from '@angular/core';

@Component({
  selector:   'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="modal-backdrop" (click)="cancel()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-icon"><i class="bi" [class.bi-trash3-fill]="icon() === 'delete'" [class.bi-exclamation-triangle-fill]="icon() === 'warning'" [class.bi-question-circle-fill]="icon() === 'question'"></i></div>
        <h3 class="modal-title">{{ title() }}</h3>
        @if (message(); as msg) {
          <p class="modal-body">{{ msg }}</p>
        }
        <div class="modal-actions">
          <button class="modal-cancel" (click)="cancel()">{{ cancelLabel() }}</button>
          <button class="modal-confirm" [class.modal-confirm--danger]="icon() === 'delete'" (click)="confirm()">{{ confirmLabel() }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 3000;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .modal-box {
      background: #fff; border-radius: 14px; padding: 1.75rem 1.75rem 1.5rem;
      max-width: 400px; width: 100%; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .modal-icon { font-size: 2.25rem; color: #b45309; margin-bottom: 0.75rem; }
    .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 1.35rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.5rem; }
    .modal-body { font-size: 0.88rem; color: #6b7280; margin: 0 0 1.5rem; line-height: 1.5; }
    .modal-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .modal-cancel {
      padding: 0.5rem 1.25rem; border: 1px solid #e0e4ea; border-radius: 8px;
      background: #fff; font-size: 0.85rem; font-weight: 600; color: #6b7280; cursor: pointer;
    }
    .modal-cancel:hover { background: #f0f4f7; }
    .modal-confirm {
      padding: 0.5rem 1.25rem; border: none; border-radius: 8px;
      background: #0f6f84; font-size: 0.85rem; font-weight: 600; color: #fff; cursor: pointer;
    }
    .modal-confirm:hover { background: #0c5c6e; }
    .modal-confirm--danger { background: #dc2626; }
    .modal-confirm--danger:hover { background: #b91c1c; }
  `],
})
export class ConfirmDialogComponent {
  readonly title        = input('Confirm');
  readonly message      = input<string>();
  readonly icon         = input<'delete' | 'warning' | 'question'>('question');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel  = input('Cancel');
  readonly confirmed    = output<void>();
  readonly cancelled    = output<void>();

  confirm(): void { this.confirmed.emit(); }
  cancel():  void { this.cancelled.emit(); }
}
