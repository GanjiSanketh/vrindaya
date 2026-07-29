import { Component, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { RouterLink }                      from '@angular/router';
import { SeoService }                      from '../../core/services/seo.service';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './offline.component.html',
  styleUrl:    './offline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineComponent {
  private readonly pid = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setPage({
      title: 'You\'re Offline',
      description: 'Vrindaya — you are currently offline. Check your connection and try again.',
      url: '/offline',
    });
  }

  retry(): void {
    if (isPlatformBrowser(this.pid)) window.location.reload();
  }
}
