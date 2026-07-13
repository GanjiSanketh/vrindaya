import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                               from '@angular/common';
import { SwUpdate }                                        from '@angular/service-worker';
import { filter, interval }                                from 'rxjs';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  templateUrl: './update-notification.component.html',
  styleUrl:    './update-notification.component.css',
})
export class UpdateNotificationComponent implements OnInit {
  private readonly swUpdate = inject(SwUpdate);
  private readonly pid      = inject(PLATFORM_ID);

  readonly showUpdate   = signal(false);
  readonly isActivating = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid) || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter(e => e.type === 'VERSION_READY')
    ).subscribe(() => this.showUpdate.set(true));

    // Check every 6 hours
    interval(6 * 60 * 60 * 1000).subscribe(() => this.swUpdate.checkForUpdate());
  }

  async reload(): Promise<void> {
    this.isActivating.set(true);
    await this.swUpdate.activateUpdate();
    location.reload();
  }
}
