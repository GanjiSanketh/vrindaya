import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CampaignTemplateService } from '../../services/campaign-template.service';
import { CampaignService } from '../../services/campaign.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { CAMPAIGN_PLACEHOLDERS } from '../../models/campaign.model';
import { CampaignTemplate, CampaignTemplateInput } from '../../models/campaign-template.model';

@Component({
  selector:    'app-template-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './template-form.component.html',
  styleUrl:    './template-form.component.css',
})
export class TemplateFormComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly router    = inject(Router);
  private readonly route     = inject(ActivatedRoute);
  private readonly toast     = inject(ToastService);
  private readonly campaignSvc = inject(CampaignService);
  readonly templateSvc          = inject(CampaignTemplateService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaign-templates`;
  readonly placeholders = CAMPAIGN_PLACEHOLDERS;

  readonly isEdit          = signal(false);
  readonly editId          = signal('');
  readonly loadingTemplate = signal(false);
  readonly imageUrl        = signal<string | undefined>(undefined);
  readonly uploadingImage  = signal(false);

  @ViewChild('messageInput') private messageInputRef?: ElementRef<HTMLTextAreaElement>;

  readonly form = this.fb.group({
    name:      ['', [Validators.required, Validators.minLength(2)]],
    message:   ['', [Validators.required, Validators.minLength(5)]],
    buttonUrl: [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.isEdit.set(true);
    this.editId.set(idParam);
    this.loadingTemplate.set(true);

    try {
      const template = this.templateSvc.getCachedTemplate(idParam) ?? await this.templateSvc.fetchTemplate(idParam);
      if (!template) {
        this.toast.error('Template not found.');
        this.router.navigate([this.BASE]);
        return;
      }
      this.populateForm(template);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to load template.');
    } finally {
      this.loadingTemplate.set(false);
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  insertPlaceholder(token: string): void {
    const ctrl = this.form.get('message');
    const el = this.messageInputRef?.nativeElement;
    const current = ctrl?.value ?? '';

    if (!el) {
      ctrl?.setValue(current + token);
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end   = el.selectionEnd ?? current.length;
    ctrl?.setValue(current.slice(0, start) + token + current.slice(end));

    setTimeout(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingImage.set(true);
    try {
      this.imageUrl.set(await this.campaignSvc.uploadCampaignImage(file));
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      this.uploadingImage.set(false);
      input.value = '';
    }
  }

  removeImage(): void {
    this.imageUrl.set(undefined);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const input: CampaignTemplateInput = {
      name:      v.name!.trim(),
      message:   v.message!.trim(),
      imageUrl:  this.imageUrl(),
      buttonUrl: v.buttonUrl?.trim() || undefined,
    };

    try {
      if (this.isEdit()) {
        await this.templateSvc.updateTemplate(this.editId(), input);
        this.toast.success('Template updated.');
      } else {
        await this.templateSvc.createTemplate(input);
        this.toast.success('Template created.');
      }
      this.router.navigate([this.BASE]);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    }
  }

  private populateForm(t: CampaignTemplate): void {
    this.form.patchValue({
      name:      t.name,
      message:   t.message,
      buttonUrl: t.buttonUrl ?? '',
    });
    this.imageUrl.set(t.imageUrl);
  }
}
