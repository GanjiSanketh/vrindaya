import { Component, inject, effect } from '@angular/core';
import { Router }                     from '@angular/router';
import { AdminAuthService }           from '../../services/admin-auth.service';
import { APP_ROUTES }                 from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-login',
  standalone:  true,
  templateUrl: './admin-login.component.html',
  styleUrl:    './admin-login.component.css',
})
export class AdminLoginComponent {
  readonly auth           = inject(AdminAuthService);
  private readonly router = inject(Router);
  readonly BASE           = `/${APP_ROUTES.ADMIN}`;

  constructor() {
    // Reactively redirect once Firebase resolves an existing session
    effect(() => {
      if (!this.auth.isLoading() && this.auth.isAuthenticated()) {
        this.router.navigate([`${this.BASE}/dashboard`]);
      }
    });
  }

  async signIn(): Promise<void> {
    await this.auth.signIn();
  }
}
