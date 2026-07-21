import { Injectable, inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MaintenanceGuard  {
  private readonly router = inject(Router);

  canActivate(): boolean | UrlTree {
    if (!environment.maintenanceMode) return true;

    const url = this.router.url;
    if (url.startsWith('/maintenance')) return true;

    return this.router.parseUrl('/maintenance');
  }
}
