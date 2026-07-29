import { Injectable, signal, computed } from '@angular/core';
import type { UserRole, PermissionResource, PermissionAction, RolePermission, AppUser } from './production.models';
import { ROLE_PERMISSIONS } from './production.models';

@Injectable({ providedIn: 'root' })
export class RolePermissionsService {
  private readonly currentUser = signal<AppUser | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly userRole = computed(() => this.currentUser()?.role ?? 'viewer');
  readonly userName = computed(() => this.currentUser()?.name ?? 'Guest');

  private readonly userPermissions = computed(() => {
    const role = this.userRole();
    return ROLE_PERMISSIONS.filter(p => p.role === role);
  });

  login(user: AppUser): void {
    this.currentUser.set(user);
    localStorage.setItem('marketplace_user', JSON.stringify(user));
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('marketplace_user');
  }

  hasPermission(resource: PermissionResource, action: PermissionAction): boolean {
    const perms = this.userPermissions();
    return perms.some(p =>
      p.resource === resource && (p.actions.includes(action) || p.actions.includes('admin')),
    );
  }

  hasAnyPermission(resource: PermissionResource, actions: PermissionAction[]): boolean {
    return actions.some(a => this.hasPermission(resource, a));
  }

  hasAllPermissions(resource: PermissionResource, actions: PermissionAction[]): boolean {
    return actions.every(a => this.hasPermission(resource, a));
  }

  isAdmin(): boolean {
    return this.userRole() === 'admin';
  }

  isAtLeast(role: UserRole): boolean {
    const hierarchy: UserRole[] = ['viewer', 'operator', 'manager', 'admin'];
    return hierarchy.indexOf(this.userRole()) >= hierarchy.indexOf(role);
  }

  getPermissionsForRole(role: UserRole): RolePermission[] {
    return ROLE_PERMISSIONS.filter(p => p.role === role);
  }

  private loadUser(): AppUser | null {
    try {
      const raw = localStorage.getItem('marketplace_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
