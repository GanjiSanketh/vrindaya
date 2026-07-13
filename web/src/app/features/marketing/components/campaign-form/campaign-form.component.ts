import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import { CampaignTemplateService } from '../../services/campaign-template.service';
import { CampaignQueueService } from '../../services/campaign-queue.service';
import { CampaignExecutionService } from '../../services/campaign-execution.service';
import { CampaignRecipientService } from '../../services/campaign-recipient.service';
import { WhatsAppSettingsService } from '../../services/whatsapp-settings.service';
import { TestMessageService } from '../../services/test-message.service';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import {
  ACTIVE_CAMPAIGN_TYPES, CAMPAIGN_MEDIA_TYPES, CAMPAIGN_PLACEHOLDERS, CAMPAIGN_TYPES,
  Campaign, CampaignAudience, CampaignInput, CampaignMediaType, CampaignStatus, CampaignType,
} from '../../models/campaign.model';
import { MOBILE_NUMBER_PATTERN } from '../../models/marketing-subscriber.model';
import { WhatsAppPreviewComponent } from '../whatsapp-preview/whatsapp-preview.component';
import { MediaPreviewComponent } from '../media-preview/media-preview.component';

@Component({
  selector:    'app-campaign-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, WhatsAppPreviewComponent, MediaPreviewComponent],
  templateUrl: './campaign-form.component.html',
  styleUrl:    './campaign-form.component.css',
})
export class CampaignFormComponent implements OnInit, OnDestroy {
  private readonly fb           = inject(FormBuilder);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly adminAuth    = inject(AdminAuthService);
  private readonly toast        = inject(ToastService);
  private readonly testMsgSvc   = inject(TestMessageService);
  readonly campaignSvc           = inject(CampaignService);
  readonly templateSvc           = inject(CampaignTemplateService);
  readonly queueSvc               = inject(CampaignQueueService);
  readonly executionSvc           = inject(CampaignExecutionService);
  readonly recipientSvc           = inject(CampaignRecipientService);
  readonly whatsappSvc            = inject(WhatsAppSettingsService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;

  readonly campaignTypes       = CAMPAIGN_TYPES;
  readonly activeCampaignTypes = ACTIVE_CAMPAIGN_TYPES;
  readonly mediaTypes          = CAMPAIGN_MEDIA_TYPES;
  readonly placeholders        = CAMPAIGN_PLACEHOLDERS;

  readonly isEdit           = signal(false);
  readonly editId           = signal('');
  readonly saving           = signal(false);
  readonly sendingTest      = signal(false);
  readonly loadingCampaign  = signal(false);
  readonly scheduleEnabled  = signal(false);
  readonly subscriberPreview = signal<number | null>(null);
  readonly imageUrl          = signal<string | undefined>(undefined);
  readonly videoUrl          = signal<string | undefined>(undefined);
  readonly documentUrl       = signal<string | undefined>(undefined);
  readonly thumbnailUrl      = signal<string | undefined>(undefined);
  readonly uploadingImage     = signal(false);
  readonly uploadingVideo     = signal(false);
  readonly uploadingDocument  = signal(false);
  readonly uploadingThumbnail = signal(false);
  readonly testRecipient     = signal('');

  @ViewChild('messageInput') private messageInputRef?: ElementRef<HTMLTextAreaElement>;

  readonly form = this.fb.group({
    campaignName: ['', [Validators.required, Validators.minLength(3)]],
    campaignType: ['WhatsApp' as CampaignType, Validators.required],
    mediaType:    ['Text' as CampaignMediaType, Validators.required],
    audience:     ['ALL_ACTIVE_SUBSCRIBERS' as CampaignAudience, Validators.required],
    templateId:   [''],
    message:      ['', [Validators.required, Validators.minLength(5)]],
    caption:      [''],
    footer:       [''],
    buttonText:   [''],
    buttonUrl:    [''],
    scheduledAt:  [''],
  });

  private testRecipientPrefilled = false;

  constructor() {
    // Pre-fill the test-send recipient with the configured WhatsApp number once, editable afterwards.
    effect(() => {
      const s = this.whatsappSvc.settings();
      if (s?.whatsappNumber && !this.testRecipientPrefilled) {
        this.testRecipientPrefilled = true;
        this.testRecipient.set(s.whatsappNumber.replace(/\D/g, '').slice(-10));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.templateSvc.getTemplates();
    this.whatsappSvc.loadSettings();
    this.campaignSvc.getActiveSubscriberCount()
      .then(n => this.subscriberPreview.set(n))
      .catch(() => this.subscriberPreview.set(null));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.isEdit.set(true);
    this.editId.set(idParam);
    this.loadingCampaign.set(true);

    try {
      const campaign = this.campaignSvc.getCachedCampaign(idParam) ?? await this.campaignSvc.fetchCampaign(idParam);
      if (!campaign) {
        this.toast.error('Campaign not found.');
        this.router.navigate([this.BASE]);
        return;
      }
      this.populateForm(campaign);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to load campaign.');
    } finally {
      this.loadingCampaign.set(false);
    }
  }

  ngOnDestroy(): void {
    this.templateSvc.stopListening();
    this.whatsappSvc.stopListening();
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  onTemplateChange(templateId: string): void {
    const template = this.templateSvc.templates().find(t => t.id === templateId);
    if (!template) return;

    this.form.patchValue({ message: template.message, buttonUrl: template.buttonUrl ?? '' });
    this.imageUrl.set(template.imageUrl);
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

  async onVideoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingVideo.set(true);
    try {
      this.videoUrl.set(await this.campaignSvc.uploadCampaignVideo(file));
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to upload video.');
    } finally {
      this.uploadingVideo.set(false);
      input.value = '';
    }
  }

  removeVideo(): void {
    this.videoUrl.set(undefined);
  }

  async onDocumentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingDocument.set(true);
    try {
      this.documentUrl.set(await this.campaignSvc.uploadCampaignDocument(file));
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      this.uploadingDocument.set(false);
      input.value = '';
    }
  }

  removeDocument(): void {
    this.documentUrl.set(undefined);
  }

  async onThumbnailSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingThumbnail.set(true);
    try {
      this.thumbnailUrl.set(await this.campaignSvc.uploadCampaignThumbnail(file));
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to upload thumbnail.');
    } finally {
      this.uploadingThumbnail.set(false);
      input.value = '';
    }
  }

  removeThumbnail(): void {
    this.thumbnailUrl.set(undefined);
  }

  onTestRecipientInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digitsOnly;
    this.testRecipient.set(digitsOnly);
  }

  async saveDraft(): Promise<void> {
    const id = await this.save('DRAFT');
    if (id) {
      this.toast.success('Draft saved.');
      this.router.navigate([this.BASE]);
    }
  }

  async schedule(): Promise<void> {
    const scheduledAt = this.form.getRawValue().scheduledAt;
    if (!this.scheduleEnabled() || !scheduledAt) {
      this.toast.error('Please choose a date and time to schedule this campaign.');
      return;
    }
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      this.toast.error('Please choose a time in the future.');
      return;
    }
    const id = await this.save('SCHEDULED');
    if (id) {
      this.toast.success('Campaign scheduled.');
      this.router.navigate([this.BASE]);
    }
  }

  /** Queues a test-send record for a single recipient — never calls Meta, just records intent. */
  async sendTest(): Promise<void> {
    if (!this.whatsappSvc.isConfigured()) return;

    const recipient = this.testRecipient().trim();
    if (!MOBILE_NUMBER_PATTERN.test(recipient)) {
      this.toast.error('Enter a valid 10-digit mobile number to send the test to.');
      return;
    }
    if (!this.form.get('message')?.value?.trim()) {
      this.toast.error('Write a message before sending a test.');
      return;
    }

    this.sendingTest.set(true);
    const v = this.form.getRawValue();

    try {
      await this.testMsgSvc.sendTestMessage({
        campaignId:   this.isEdit() ? this.editId() : undefined,
        mobileNumber: recipient,
        message:      v.message!.trim(),
        imageUrl:     this.imageUrl(),
        buttonUrl:    v.buttonUrl?.trim() || undefined,
      }, this.adminAuth.currentUser()?.email ?? 'unknown-admin');
      this.toast.success(`Test message queued for +91 ${recipient}.`);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to queue test message.');
    } finally {
      this.sendingTest.set(false);
    }
  }

  /**
   * Marks the campaign READY_TO_SEND, fans it out into campaignQueue — one
   * PENDING record per active subscriber — creates the QUEUED
   * CampaignExecution record, then snapshots one campaignRecipient per
   * subscriber for that execution (Execution Details page) and syncs the
   * execution's stats from those recipients' statuses. No message is
   * dispatched; this is the entire pipeline until the batch-sending worker
   * (next phase) actually drives the queue.
   */
  async sendCampaign(): Promise<void> {
    if (!this.whatsappSvc.isConfigured()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!confirm('This will queue the campaign for every active subscriber. No message is dispatched yet — continue?')) return;

    const id = await this.save('READY_TO_SEND');
    if (!id) return;

    try {
      const campaign = await this.campaignSvc.fetchCampaign(id);
      if (campaign) {
        const count = await this.queueSvc.enqueueForCampaign(campaign);
        const executionId = await this.executionSvc.createExecution(
          campaign, count, this.adminAuth.currentUser()?.email ?? 'unknown-admin',
        );
        await this.recipientSvc.createRecipientsForExecution(executionId, campaign.id);
        await this.syncExecutionStats(executionId);
        this.toast.success(`Campaign queued for ${count} subscriber(s).`);
      }
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Campaign saved, but queuing failed.');
    }
    this.router.navigate([this.BASE]);
  }

  /** Derives totalRecipients/processedRecipients/successfulRecipients/failedRecipients from actual recipient statuses. */
  private async syncExecutionStats(executionId: string): Promise<void> {
    const counts = await this.recipientSvc.getStatusCounts(executionId);
    await this.executionSvc.updateExecutionStats(executionId, {
      totalRecipients:      counts.total,
      processedRecipients:  counts.total - counts.QUEUED - counts.SENDING,
      successfulRecipients: counts.SENT + counts.DELIVERED + counts.READ,
      failedRecipients:     counts.FAILED,
    });
  }

  private async save(status: CampaignStatus): Promise<string | null> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }

    this.saving.set(true);
    const v = this.form.getRawValue();
    const scheduledAt = this.scheduleEnabled() && v.scheduledAt ? new Date(v.scheduledAt) : null;

    const input: CampaignInput = {
      campaignName: v.campaignName!.trim(),
      campaignType: v.campaignType!,
      mediaType:    v.mediaType!,
      message:      v.message!.trim(),
      imageUrl:     this.imageUrl(),
      videoUrl:     this.videoUrl(),
      documentUrl:  this.documentUrl(),
      thumbnailUrl: this.thumbnailUrl(),
      caption:      v.caption?.trim() || undefined,
      footer:       v.footer?.trim() || undefined,
      buttonText:   v.buttonText?.trim() || undefined,
      buttonUrl:    v.buttonUrl?.trim() || undefined,
      audience:     v.audience!,
    };

    try {
      if (this.isEdit()) {
        await this.campaignSvc.updateCampaign(this.editId(), input, status, scheduledAt);
        return this.editId();
      }
      const createdBy = this.adminAuth.currentUser()?.email ?? 'unknown-admin';
      return await this.campaignSvc.createCampaign(input, status, scheduledAt, createdBy);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to save campaign.');
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  private populateForm(c: Campaign): void {
    this.form.patchValue({
      campaignName: c.campaignName,
      campaignType: c.campaignType,
      mediaType:    c.mediaType,
      audience:     c.audience,
      message:      c.message,
      caption:      c.caption ?? '',
      footer:       c.footer ?? '',
      buttonText:   c.buttonText ?? '',
      buttonUrl:    c.buttonUrl ?? '',
      scheduledAt:  c.scheduledAt ? this.toLocalDatetimeInput(c.scheduledAt.toDate()) : '',
    });
    this.imageUrl.set(c.imageUrl);
    this.videoUrl.set(c.videoUrl);
    this.documentUrl.set(c.documentUrl);
    this.thumbnailUrl.set(c.thumbnailUrl);
    this.scheduleEnabled.set(!!c.scheduledAt);
  }

  private toLocalDatetimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
