import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AdminUsersService } from '../../services/admin-users.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminUser, ROLE_LABELS } from '../../models/admin-user.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-users-list',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './admin-users-list.component.html',
  styleUrl:    './admin-users-list.component.css',
})
export class AdminUsersListComponent implements OnInit {
  private readonly svc = inject(AdminUsersService);
  readonly auth        = inject(AdminAuthService);

  readonly BASE        = `/${APP_ROUTES.ADMIN}/admin-users`;
  readonly ROLE_LABELS = ROLE_LABELS;

  readonly users   = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly totalUsers  = computed(() => this.users().length);
  readonly superAdmins = computed(() => this.users().filter(u => u.role === 'SuperAdmin').length);
  readonly admins      = computed(() => this.users().filter(u => u.role === 'Admin').length);

  readonly busyEmail    = signal<string | null>(null);
  readonly actionError  = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.users.set(await this.svc.getAll());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load admin users.');
    } finally {
      this.loading.set(false);
    }
  }

  encodeEmail(email: string): string {
    return encodeURIComponent(email);
  }

  isSelf(user: AdminUser): boolean {
    return user.email.toLowerCase() === (this.auth.currentUser()?.email ?? '').toLowerCase();
  }

  async toggleActive(user: AdminUser): Promise<void> {
    this.busyEmail.set(user.email);
    this.actionError.set(null);
    try {
      const updated = user.isActive
        ? await this.svc.deactivate(user.email)
        : await this.svc.activate(user.email);
      this.users.update(list => list.map(u => (u.email === updated.email ? updated : u)));
    } catch (err) {
      this.actionError.set(err instanceof Error ? err.message : 'Failed to update user status.');
    } finally {
      this.busyEmail.set(null);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
