import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WhatsAppSettingsService } from '../../services/whatsapp-settings.service';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector:    'app-whatsapp-settings',
  standalone:  true,
  imports:     [ReactiveFormsModule],
  templateUrl: './whatsapp-settings.component.html',
  styleUrl:    './whatsapp-settings.component.css',
})
export class WhatsAppSettingsComponent implements OnInit, OnDestroy {
  private readonly fb        = inject(FormBuilder);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly toast     = inject(ToastService);
  readonly svc                = inject(WhatsAppSettingsService);

  readonly showToken = signal(false);

  readonly form = this.fb.group({
    businessName:   ['', [Validators.required]],
    whatsappNumber: ['', [Validators.required]],
    phoneNumberId:  ['', [Validators.required]],
    wabaId:         ['', [Validators.required]],
    accessToken:    ['', [Validators.required]],
  });

  private formPopulated = false;

  constructor() {
    effect(() => {
      const s = this.svc.settings();
      if (s && !this.formPopulated) {
        this.formPopulated = true;
        this.form.patchValue({
          businessName:   s.businessName,
          whatsappNumber: s.whatsappNumber,
          phoneNumberId:  s.phoneNumberId,
          wabaId:         s.wabaId,
          accessToken:    s.accessToken,
        });
      }
    });
  }

  ngOnInit(): void {
    this.svc.loadSettings();
  }

  ngOnDestroy(): void {
    this.svc.stopListening();
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  toggleShowToken(): void {
    this.showToken.update(v => !v);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const updatedBy = this.adminAuth.currentUser()?.email ?? 'unknown-admin';

    try {
      await this.svc.saveSettings({
        businessName:   v.businessName!.trim(),
        whatsappNumber: v.whatsappNumber!.trim(),
        phoneNumberId:  v.phoneNumberId!.trim(),
        wabaId:         v.wabaId!.trim(),
        accessToken:    v.accessToken!.trim(),
      }, updatedBy);
      this.toast.success('WhatsApp settings saved.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  }
}
