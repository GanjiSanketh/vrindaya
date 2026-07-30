import { Injectable, signal, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);

  readonly updateAvailable = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.updateAvailable.set(true);
    });

    this.swUpdate.unrecoverable.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      document.location.reload();
    });

    interval(60 * 60 * 1000).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.swUpdate.checkForUpdate();
    });
  }

  activateUpdate(): void {
    this.updateAvailable.set(false);
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
