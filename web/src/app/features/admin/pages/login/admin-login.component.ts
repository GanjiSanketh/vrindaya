import { Component, inject, effect, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                       from '@angular/common';
import { Router }                                  from '@angular/router';
import { AdminAuthService }                        from '../../services/admin-auth.service';
import { APP_ROUTES }                              from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-login',
  standalone:  true,
  templateUrl: './admin-login.component.html',
  styleUrl:    './admin-login.component.css',
})
export class AdminLoginComponent {
  readonly auth           = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly pid    = inject(PLATFORM_ID);
  readonly BASE           = `/${APP_ROUTES.ADMIN}`;

  constructor() {
    // Redirect to dashboard as soon as Firebase confirms an authorised session.
    effect(() => {
      if (!this.auth.isLoading() && this.auth.isAuthenticated()) {
        if (isDevMode()) console.log('[AUTH] Navigation to Dashboard');
        this.router.navigate([`${this.BASE}/dashboard`]);
      }
    });
  }

  async signIn(): Promise<void> {
    await this.auth.signIn();
  }

  /** Hard page reload — resets all in-memory state when auth enters an error state. */
  retry(): void {
    if (isPlatformBrowser(this.pid)) {
      window.location.reload();
    }
  }
}
