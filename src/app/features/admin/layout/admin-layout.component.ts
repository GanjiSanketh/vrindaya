import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService }   from '../services/admin-auth.service';
import { APP_ROUTES }         from '../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-layout',
  standalone:  true,
  imports:     [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl:    './admin-layout.component.css',
})
export class AdminLayoutComponent {
  readonly auth     = inject(AdminAuthService);
  readonly BASE     = `/${APP_ROUTES.ADMIN}`;
  readonly sideOpen = signal(false);

  toggleSide(): void { this.sideOpen.update(v => !v); }
  closeSide():  void { this.sideOpen.set(false); }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
