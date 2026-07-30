import { Injectable, inject } from '@angular/core';
import type { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { RolePermissionsService } from './role-permissions.service';
import type { PermissionResource, PermissionAction } from './production.models';

@Injectable({ providedIn: 'root' })
export class RolePermissionsGuard implements CanActivate {
  private readonly perms = inject(RolePermissionsService);

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    const requiredResource = route.data['resource'] as PermissionResource;
    const requiredAction = route.data['action'] as PermissionAction;
    if (!requiredResource || !requiredAction) return false;
    return this.perms.hasPermission(requiredResource, requiredAction);
  }
}
