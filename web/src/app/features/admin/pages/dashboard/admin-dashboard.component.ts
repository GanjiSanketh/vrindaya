import { Component, inject, computed } from '@angular/core';
import { RouterLink }                  from '@angular/router';
import { AdminProductService }         from '../../services/admin-product.service';
import { AdminAuthService }            from '../../services/admin-auth.service';
import { APP_ROUTES }                  from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-dashboard',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl:    './admin-dashboard.component.css',
})
export class AdminDashboardComponent {
  readonly productSvc = inject(AdminProductService);
  readonly authSvc    = inject(AdminAuthService);
  readonly BASE       = `/${APP_ROUTES.ADMIN}`;

  readonly recentProducts = computed(() =>
    [...this.productSvc.products()].sort((a, b) => b.id - a.id).slice(0, 5)
  );

  export(): void { this.productSvc.exportProducts(); }
}
