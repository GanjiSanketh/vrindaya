import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PwaInstallService } from '../../services/pwa-install.service';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [],
  template: `
    @if (installSvc.showPrompt()) {
      <div class="ip-overlay" (click)="installSvc.dismiss()">
        <div class="ip-card" (click)="$event.stopPropagation()">
          <div class="ip-header">
            <img class="ip-icon" src="assets/icons/icon-192x192.png" alt="Vrindaya" width="48" height="48" />
            <div class="ip-info">
              <strong class="ip-name">Vrindaya</strong>
              <span class="ip-desc">Premium Indian Ethnic Wear</span>
            </div>
          </div>
          <p class="ip-msg">Install the app for a faster experience with offline access.</p>
          <div class="ip-actions">
            <button class="ip-btn ip-btn--secondary" (click)="installSvc.dismiss()">Not now</button>
            <button class="ip-btn ip-btn--primary" (click)="installSvc.install()">Install</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ip-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.35);
      display: flex; align-items: flex-end; justify-content: center;
      padding: 1rem;
    }
    .ip-card {
      background: #fff; border-radius: 16px 16px 0 0;
      width: 100%; max-width: 380px;
      padding: 1.5rem 1.25rem 1.75rem;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
      animation: ip-slide-up 0.3s ease;
    }
    @keyframes ip-slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .ip-header {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .ip-icon {
      border-radius: 12px;
    }
    .ip-info {
      display: flex; flex-direction: column;
    }
    .ip-name {
      font-size: 1.05rem; color: #1a1a1a;
    }
    .ip-desc {
      font-size: 0.8rem; color: #888;
    }
    .ip-msg {
      font-size: 0.875rem; color: #555;
      margin: 0 0 1.25rem; line-height: 1.5;
    }
    .ip-actions {
      display: flex; gap: 0.75rem;
    }
    .ip-btn {
      flex: 1; border: none; border-radius: 10px;
      padding: 0.7rem 1rem; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .ip-btn--primary {
      background: #0f6f84; color: #fff;
    }
    .ip-btn--primary:hover { background: #0d5f72; }
    .ip-btn--secondary {
      background: #f0f0f0; color: #555;
    }
    .ip-btn--secondary:hover { background: #e4e4e4; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent {
  readonly installSvc = inject(PwaInstallService);
}
