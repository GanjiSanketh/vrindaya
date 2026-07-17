import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminUsersService } from '../../services/admin-users.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ROLE_OPTIONS } from '../../models/admin-user.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-admin-user-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-user-form.component.html',
  styleUrl:    './admin-user-form.component.css',
})
export class AdminUserFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly svc    = inject(AdminUsersService);
  readonly auth           = inject(AdminAuthService);

  readonly BASE       = `/${APP_ROUTES.ADMIN}/admin-users`;
  readonly ROLE_OPTIONS = ROLE_OPTIONS;

  readonly isEdit    = signal(false);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly formError = signal<string | null>(null);
  /** True when editing the signed-in SuperAdmin's own record — role can't be self-changed. */
  readonly lockRole  = signal(false);

  private email = '';

  readonly form = this.fb.group({
    name:     ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    role:     ['Admin' as 'SuperAdmin' | 'Admin', Validators.required],
    isActive: [true],
  });

  async ngOnInit(): Promise<void> {
    const emailParam = this.route.snapshot.paramMap.get('email');
    if (!emailParam) return;

    this.isEdit.set(true);
    this.email = decodeURIComponent(emailParam);
    this.loading.set(true);

    try {
      const all = await this.svc.getAll();
      const user = all.find(u => u.email.toLowerCase() === this.email.toLowerCase());
      if (!user) {
        this.formError.set('Admin user not found.');
        return;
      }

      this.form.patchValue({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
      this.form.get('email')!.disable();

      const isSelf = user.email.toLowerCase() === (this.auth.currentUser()?.email ?? '').toLowerCase();
      if (isSelf && user.role === 'SuperAdmin') {
        this.lockRole.set(true);
        this.form.get('role')!.disable();
      }
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to load admin user.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);
    const v = this.form.getRawValue();

    try {
      if (this.isEdit()) {
        await this.svc.update(this.email, { name: v.name!.trim(), role: v.role!, isActive: !!v.isActive });
      } else {
        await this.svc.create({ name: v.name!.trim(), email: v.email!.trim(), role: v.role! });
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save admin user.');
      this.saving.set(false);
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
