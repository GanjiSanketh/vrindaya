import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';

import { AdminUsersService } from '../../services/admin-users.service';
import { AdminAuthService }  from '../../services/admin-auth.service';
import { AdminUser, AdminRole, ROLE_LABELS, ROLE_OPTIONS } from '../../models/admin-user.model';

@Component({
  selector:    'app-admin-management',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './admin-management.component.html',
  styleUrl:    './admin-management.component.css',
})
export class AdminManagementComponent implements OnInit, OnDestroy {
  readonly svc  = inject(AdminUsersService);
  readonly auth = inject(AdminAuthService);

  readonly ROLE_LABELS  = ROLE_LABELS;
  readonly ROLE_OPTIONS = ROLE_OPTIONS;

  // ── Stats ─────────────────────────────────────────────────────────────────
  readonly totalUsers  = computed(() => this.svc.users().length);
  readonly superAdmins = computed(() => this.svc.users().filter(u => u.role === 'super_admin').length);
  readonly admins      = computed(() => this.svc.users().filter(u => u.role === 'admin').length);
  readonly editors     = computed(() => this.svc.users().filter(u => u.role === 'editor').length);

  // ── Add user form ─────────────────────────────────────────────────────────
  readonly formEmail  = signal('');
  readonly formRole   = signal<AdminRole>('editor');
  readonly formActive = signal(true);
  readonly formBusy   = signal(false);
  readonly formError  = signal<string | null>(null);
  readonly formSuccess = signal(false);

  // ── Inline role edit ──────────────────────────────────────────────────────
  readonly editingDocId = signal<string | null>(null);
  readonly editingRole  = signal<AdminRole>('editor');

  // ── Row action state ──────────────────────────────────────────────────────
  readonly busyDocId   = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  // ── Delete confirm ────────────────────────────────────────────────────────
  readonly deleteTarget = signal<AdminUser | null>(null);

  ngOnInit(): void  { this.svc.startListening(); }
  ngOnDestroy(): void { this.svc.stopListening(); }

  // ── Add user ──────────────────────────────────────────────────────────────

  async addUser(): Promise<void> {
    this.formError.set(null);
    this.formSuccess.set(false);

    const email = this.formEmail().trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.formError.set('Please enter a valid email address.');
      return;
    }

    if (this.svc.users().some(u => u.email === email)) {
      this.formError.set('A user with this email already exists.');
      return;
    }

    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;

    this.formBusy.set(true);
    try {
      await this.svc.addUser(email, this.formRole(), this.formActive(), uid);
      this.formEmail.set('');
      this.formRole.set('editor');
      this.formActive.set(true);
      this.formSuccess.set(true);
      setTimeout(() => this.formSuccess.set(false), 3000);
    } catch {
      this.formError.set('Failed to add user. Please try again.');
    } finally {
      this.formBusy.set(false);
    }
  }

  // ── Inline role edit ──────────────────────────────────────────────────────

  startEdit(user: AdminUser): void {
    this.editingDocId.set(user.docId);
    this.editingRole.set(user.role);
    this.actionError.set(null);
  }

  cancelEdit(): void { this.editingDocId.set(null); }

  async saveRole(docId: string): Promise<void> {
    this.busyDocId.set(docId);
    this.actionError.set(null);
    try {
      await this.svc.updateUserRole(docId, this.editingRole());
      this.editingDocId.set(null);
    } catch {
      this.actionError.set('Failed to update role. Please try again.');
    } finally {
      this.busyDocId.set(null);
    }
  }

  // ── Activate / Deactivate ─────────────────────────────────────────────────

  async toggleActive(user: AdminUser): Promise<void> {
    this.busyDocId.set(user.docId);
    this.actionError.set(null);
    try {
      if (user.active) {
        await this.svc.deactivateUser(user.docId);
      } else {
        await this.svc.activateUser(user.docId);
      }
    } catch {
      this.actionError.set('Failed to update user status.');
    } finally {
      this.busyDocId.set(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  confirmDelete(user: AdminUser): void {
    this.deleteTarget.set(user);
    this.actionError.set(null);
  }

  cancelDelete(): void { this.deleteTarget.set(null); }

  async doDelete(): Promise<void> {
    const user = this.deleteTarget();
    if (!user) return;

    this.busyDocId.set(user.docId);
    this.deleteTarget.set(null);
    this.actionError.set(null);
    try {
      await this.svc.deleteUser(user.docId);
    } catch {
      this.actionError.set('Failed to delete user. Please try again.');
    } finally {
      this.busyDocId.set(null);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Prevent a super admin from accidentally modifying their own account. */
  isSelf(user: AdminUser): boolean {
    return user.uid !== '' && user.uid === this.auth.currentUser()?.uid;
  }

  formatDate(ts: { seconds: number; nanoseconds: number } | null): string {
    if (!ts) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
