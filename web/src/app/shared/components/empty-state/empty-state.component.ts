import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector:   'app-empty-state',
  standalone: true,
  imports:    [RouterLink],
  template: `
    @switch (type()) {
      @case ('loading') {
        <div class="es-root">
          <span class="es-spinner"></span>
          <p class="es-text">{{ message() || 'Loading\u2026' }}</p>
        </div>
      }
      @case ('error') {
        <div class="es-root es-root--error">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <p class="es-text">{{ message() }}</p>
          @if (showRetry()) {
            <button class="es-retry" (click)="retry.emit()">Retry</button>
          }
        </div>
      }
      @case ('empty') {
        <div class="es-root">
          <i class="bi" [class]="icon()"></i>
          <p class="es-text">{{ message() || 'No data found.' }}</p>
          @if (actionLabel(); as label) {
            <a [routerLink]="actionLink() || '.'" class="es-action">{{ label }}</a>
          }
        </div>
      }
    }
  `,
  styles: [`
    .es-root {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.75rem; padding: 3rem 1.5rem; color: #6b7280; text-align: center;
    }
    .es-root--error { color: #991b1b; }
    .es-root i { font-size: 2.5rem; opacity: 0.25; }
    .es-root--error i { opacity: 0.5; }
    .es-text { font-size: 0.88rem; margin: 0; max-width: 360px; line-height: 1.5; }
    .es-spinner {
      width: 22px; height: 22px; border: 2.5px solid #e0e4ea; border-top-color: #0f6f84;
      border-radius: 50%; animation: es-spin 0.7s linear infinite;
    }
    @keyframes es-spin { to { transform: rotate(360deg); } }
    .es-retry {
      margin-top: 0.25rem; padding: 0.4rem 1rem; border: 1px solid #e0e4ea; border-radius: 6px;
      background: #fff; font-size: 0.82rem; font-weight: 600; color: #0f6f84; cursor: pointer;
    }
    .es-retry:hover { background: #f0f4f7; }
    .es-action {
      padding: 0.4rem 1rem; border-radius: 6px; background: #0f6f84; color: #fff;
      font-size: 0.82rem; font-weight: 600; text-decoration: none; display: inline-block;
    }
    .es-action:hover { background: #0c5c6e; }
  `],
})
export class EmptyStateComponent {
  readonly type        = input<'loading' | 'error' | 'empty'>('empty');
  readonly message     = input<string>();
  readonly icon        = input('bi-inbox');
  readonly showRetry   = input(true);
  readonly actionLabel = input<string>();
  readonly actionLink  = input<string>();
  readonly retry       = output<void>();
}
