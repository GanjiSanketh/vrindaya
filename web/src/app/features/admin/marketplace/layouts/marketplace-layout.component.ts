import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-marketplace-layout',
  standalone: true,
  template: `
    <div class="mp-page">
      @if (title()) {
        <div class="mp-header">
          <div>
            <h1 class="mp-title">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="mp-subtitle">{{ subtitle() }}</p>
            }
          </div>
          <div class="mp-actions">
            <ng-content select="[actions]" />
          </div>
        </div>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .mp-page { padding: 1.5rem; }
    .mp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
    .mp-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #1a1a2e; margin: 0; }
    .mp-subtitle { font-size: 0.85rem; color: #888; margin: 0.15rem 0 0; }
    .mp-actions { display: flex; gap: 0.5rem; align-items: center; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceLayoutComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
}
