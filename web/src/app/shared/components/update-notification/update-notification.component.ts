import { Component, inject, signal, OnInit, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser }                               from '@angular/common';
import { SwUpdate }                                        from '@angular/service-worker';
import { filter, interval }                                from 'rxjs';
import { takeUntilDestroyed }                              from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  templateUrl: './update-notification.component.html',
  styleUrl:    './update-notification.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateNotificationComponent implements OnInit {
  private readonly swUpdate = inject(SwUpdate);
  private readonly pid      = inject(PLATFORM_ID);

  readonly showUpdate   = signal(false);
  readonly isActivating = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid) || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter(e => e.type === 'VERSION_READY'),
      takeUntilDestroyed(),
    ).subscribe(() => this.showUpdate.set(true));

    interval(6 * 60 * 60 * 1000).pipe(
      takeUntilDestroyed(),
    ).subscribe(() => this.swUpdate.checkForUpdate());
  }

  async reload(): Promise<void> {
    this.isActivating.set(true);
    await this.swUpdate.activateUpdate();
    location.reload();
  }
}
