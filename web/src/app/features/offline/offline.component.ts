import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { RouterLink }                      from '@angular/router';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './offline.component.html',
  styleUrl:    './offline.component.css',
})
export class OfflineComponent {
  private readonly pid = inject(PLATFORM_ID);

  retry(): void {
    if (isPlatformBrowser(this.pid)) window.location.reload();
  }
}
