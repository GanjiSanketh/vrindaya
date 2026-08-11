import { Component, inject, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Router }              from '@angular/router';
import { ExitIntentService }   from '../../../core/services/exit-intent.service';
import { APP_ROUTES }          from '../../../core/constants/routes.constants';

@Component({
  selector: 'app-exit-intent-popup',
  standalone: true,
  templateUrl: './exit-intent-popup.component.html',
  styleUrl:    './exit-intent-popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitIntentPopupComponent {
  readonly svc   = inject(ExitIntentService);
  private router = inject(Router);

  goToNewArrivals(): void {
    this.svc.dismiss();
    this.router.navigate(['/', APP_ROUTES.NEW_ARRIVALS]);
  }

  dismiss(): void { this.svc.dismiss(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('ei-backdrop')) this.dismiss();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.dismiss(); }
}
