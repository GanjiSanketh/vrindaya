import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BrandAdminService } from '../../../../core/services/brand-admin.service';
import { SingleImageUploadComponent } from '../../components/single-image-upload/single-image-upload.component';
import { ApiFaq, ApiPolicy } from '../../../../core/models/brand.model';
import { slugify } from '../../../../shared/utils/slugify.util';

type SettingsTab = 'aboutUs' | 'contact' | 'storeInfo' | 'socialLinks' | 'faqs' | 'policies' | 'footer';

@Component({
  selector:    'app-brand-settings',
  standalone:  true,
  imports:     [ReactiveFormsModule, SingleImageUploadComponent],
  templateUrl: './brand-settings.component.html',
  styleUrl:    './brand-settings.component.css',
})
export class BrandSettingsComponent implements OnInit {
  private readonly admin = inject(BrandAdminService);
  private readonly fb    = inject(FormBuilder);

  readonly tabs: { key: SettingsTab; label: string }[] = [
    { key: 'aboutUs',     label: 'About Us' },
    { key: 'contact',     label: 'Contact' },
    { key: 'storeInfo',   label: 'Store Information' },
    { key: 'socialLinks', label: 'Social Links' },
    { key: 'faqs',        label: 'FAQs' },
    { key: 'policies',    label: 'Policies' },
    { key: 'footer',      label: 'Footer' },
  ];

  readonly activeTab = signal<SettingsTab>('aboutUs');
  readonly loading    = signal(true);
  readonly saving     = signal(false);
  readonly saved      = signal(false);
  readonly error      = signal<string | null>(null);

  readonly aboutImage = signal<{ url: string; publicId: string } | null>(null);
  readonly faqs       = signal<ApiFaq[]>([]);
  readonly policies   = signal<ApiPolicy[]>([]);

  readonly aboutUsForm = this.fb.group({
    heading: [''], body: [''],
  });

  readonly contactForm = this.fb.group({
    email: [''], phone: [''], whatsApp: [''], address: [''], mapEmbedUrl: [''], businessHours: [''],
  });

  readonly storeInfoForm = this.fb.group({
    legalName: [''], gstin: [''], registeredAddress: [''], establishedYear: [''],
  });

  readonly socialLinksForm = this.fb.group({
    instagram: [''], flipkart: [''],
  });

  readonly footerForm = this.fb.group({
    showSocialLinks: [true], showPolicyLinks: [true], copyrightText: [''],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const config = await this.admin.getConfig();

      this.aboutUsForm.patchValue({
        heading: config.aboutUs.heading ?? '',
        body: config.aboutUs.body ?? '',
      });
      if (config.aboutUs.imageUrl) {
        this.aboutImage.set({ url: config.aboutUs.imageUrl, publicId: config.aboutUs.imagePublicId ?? '' });
      }

      this.contactForm.patchValue({
        email: config.contact.email ?? '',
        phone: config.contact.phone ?? '',
        whatsApp: config.contact.whatsApp ?? '',
        address: config.contact.address ?? '',
        mapEmbedUrl: config.contact.mapEmbedUrl ?? '',
        businessHours: config.contact.businessHours ?? '',
      });

      this.storeInfoForm.patchValue({
        legalName: config.storeInformation.legalName ?? '',
        gstin: config.storeInformation.gstin ?? '',
        registeredAddress: config.storeInformation.registeredAddress ?? '',
        establishedYear: config.storeInformation.establishedYear ?? '',
      });

      this.socialLinksForm.patchValue({
        instagram: config.socialLinks.instagram ?? '',
        flipkart: config.socialLinks.flipkart ?? '',
      });

      this.faqs.set([...config.faqs].sort((a, b) => a.displayOrder - b.displayOrder));
      this.policies.set([...config.policies].sort((a, b) => a.displayOrder - b.displayOrder));

      this.footerForm.patchValue({
        showSocialLinks: config.footer.showSocialLinks,
        showPolicyLinks: config.footer.showPolicyLinks,
        copyrightText: config.footer.copyrightText ?? '',
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load brand settings.');
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: SettingsTab): void { this.activeTab.set(tab); }

  onAboutImageUploaded(result: { url: string; publicId: string }): void { this.aboutImage.set(result); }
  onAboutImageRemoved(): void { this.aboutImage.set(null); }

  /* ── FAQs — targeted by index, not id, since new rows can collide on other fields ── */

  addFaq(): void {
    this.faqs.update(list => [...list, { id: crypto.randomUUID(), question: '', answer: '', displayOrder: list.length }]);
  }

  removeFaq(index: number): void {
    this.faqs.update(list => list.filter((_, i) => i !== index));
  }

  updateFaq(index: number, field: 'question' | 'answer', value: string): void {
    this.faqs.update(list => list.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  moveFaq(index: number, dir: -1 | 1): void {
    this.faqs.update(list => moveItem(list, index, index + dir));
  }

  /* ── Policies — targeted by index; slug is admin-editable/blank-until-save, so it can't be a stable key ── */

  addPolicy(): void {
    this.policies.update(list => [...list, {
      id: '', title: '', content: '', displayOrder: list.length, updatedAt: new Date().toISOString(),
    }]);
  }

  removePolicy(index: number): void {
    this.policies.update(list => list.filter((_, i) => i !== index));
  }

  updatePolicy(index: number, field: 'id' | 'title' | 'content', value: string): void {
    this.policies.update(list => list.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  movePolicy(index: number, dir: -1 | 1): void {
    this.policies.update(list => moveItem(list, index, index + dir));
  }

  async saveAll(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const av = this.aboutUsForm.getRawValue();
    const cv = this.contactForm.getRawValue();
    const sv = this.storeInfoForm.getRawValue();
    const lv = this.socialLinksForm.getRawValue();
    const fv = this.footerForm.getRawValue();
    const image = this.aboutImage();

    try {
      await this.admin.updateConfig({
        aboutUs: {
          heading: av.heading?.trim() || undefined,
          body: av.body?.trim() || undefined,
          imageUrl: image?.url,
          imagePublicId: image?.publicId,
        },
        contact: {
          email: cv.email?.trim() || undefined,
          phone: cv.phone?.trim() || undefined,
          whatsApp: cv.whatsApp?.trim() || undefined,
          address: cv.address?.trim() || undefined,
          mapEmbedUrl: cv.mapEmbedUrl?.trim() || undefined,
          businessHours: cv.businessHours?.trim() || undefined,
        },
        storeInformation: {
          legalName: sv.legalName?.trim() || undefined,
          gstin: sv.gstin?.trim() || undefined,
          registeredAddress: sv.registeredAddress?.trim() || undefined,
          establishedYear: sv.establishedYear?.trim() || undefined,
        },
        socialLinks: {
          instagram: lv.instagram?.trim() || undefined,
          flipkart: lv.flipkart?.trim() || undefined,
        },
        faqs: this.faqs().map((f, i) => ({ ...f, displayOrder: i })),
        policies: this.policies()
          .map(p => ({ ...p, id: p.id.trim() || slugify(p.title) }))
          .map((p, i) => ({ ...p, displayOrder: i })),
        footer: {
          showSocialLinks: !!fv.showSocialLinks,
          showPolicyLinks: !!fv.showPolicyLinks,
          copyrightText: fv.copyrightText?.trim() || undefined,
        },
      });
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save brand settings.');
    } finally {
      this.saving.set(false);
    }
  }
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
