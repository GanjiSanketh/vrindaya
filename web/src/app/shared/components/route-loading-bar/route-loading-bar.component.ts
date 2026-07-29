import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-route-loading-bar',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="route-loading-bar" role="progressbar" aria-label="Page loading"></div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteLoadingBarComponent {
  private readonly router = inject(Router);
  readonly visible = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      takeUntilDestroyed(),
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.timer) clearTimeout(this.timer);
        this.visible.set(true);
      } else {
        this.timer = setTimeout(() => this.visible.set(false), 300);
      }
    });
  }
}
