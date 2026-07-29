import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  imports: [],
  template: `
    @if (updateSvc.updateAvailable()) {
      <div class="up-toast">
        <div class="up-body">
          <span class="up-icon"><i class="bi bi-arrow-clockwise"></i></span>
          <span class="up-text">A new version is available.</span>
        </div>
        <button class="up-btn" (click)="updateSvc.activateUpdate()">Update</button>
      </div>
    }
  `,
  styles: [`
    .up-toast {
      position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%);
      z-index: 10000;
      display: flex; align-items: center; gap: 1rem;
      background: #1a1a2e; color: #fff;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      font-size: 0.875rem;
      animation: up-slide 0.3s ease;
      max-width: calc(100vw - 2rem);
    }
    @keyframes up-slide {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    .up-body {
      display: flex; align-items: center; gap: 0.5rem;
    }
    .up-icon { font-size: 1rem; }
    .up-text { line-height: 1.4; }
    .up-btn {
      background: #c4a15e; color: #1a1a2e;
      border: none; border-radius: 8px;
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem; font-weight: 700;
      cursor: pointer; white-space: nowrap;
      transition: background 0.2s;
    }
    .up-btn:hover { background: #d4b06e; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdatePromptComponent {
  readonly updateSvc = inject(UpdateService);
}
