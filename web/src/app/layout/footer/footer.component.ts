import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly analytics = inject(AnalyticsService);
  readonly currentYear = new Date().getFullYear();

  onLinkClick(label: string): void {
    this.analytics.trackFooterLinkClick(label);
  }
}
