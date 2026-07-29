import { Injectable, signal, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether a new version is available and awaiting activation */
  readonly updateAvailable = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      map(e => ({ current: e.currentVersion, latest: e.latestVersion })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.updateAvailable.set(true);
    });

    this.swUpdate.unrecoverable.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      document.location.reload();
    });
  }

  activateUpdate(): void {
    this.updateAvailable.set(false);
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
