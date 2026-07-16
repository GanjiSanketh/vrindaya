import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HomepageAdminService, HomepageConfigInput } from '../../../../../core/services/homepage-admin.service';
import { ProductPickerComponent } from '../../../components/product-picker/product-picker.component';
import { SingleImageUploadComponent } from '../../../components/single-image-upload/single-image-upload.component';
import { ApiCollection } from '../../../../../core/models/collection.model';

type SettingsTab = 'featured' | 'trending' | 'newArrivals' | 'announcement' | 'instagram' | 'footer' | 'seo';
type NewArrivalsMode = 'automatic' | 'manual';

interface InstagramImageState {
  url: string;
  publicId: string;
  linkUrl?: string;
}

@Component({
  selector:    'app-homepage-settings',
  standalone:  true,
  imports:     [ReactiveFormsModule, ProductPickerComponent, SingleImageUploadComponent],
  templateUrl: './homepage-settings.component.html',
  styleUrl:    './homepage-settings.component.css',
})
export class HomepageSettingsComponent implements OnInit {
  private readonly admin = inject(HomepageAdminService);
  private readonly fb    = inject(FormBuilder);

  readonly tabs: { key: SettingsTab; label: string }[] = [
    { key: 'featured',     label: 'Featured Collection' },
    { key: 'trending',     label: 'Trending Collection' },
    { key: 'newArrivals',  label: 'New Arrivals' },
    { key: 'announcement', label: 'Announcement' },
    { key: 'instagram',    label: 'Instagram' },
    { key: 'footer',       label: 'Footer Banner' },
    { key: 'seo',          label: 'SEO' },
  ];

  readonly activeTab = signal<SettingsTab>('featured');
  readonly loading   = signal(true);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly error     = signal<string | null>(null);

  readonly collections            = signal<ApiCollection[]>([]);
  readonly featuredCollectionSlug = signal('featured');
  readonly trendingCollectionSlug = signal('trending');
  readonly newArrivalsMode        = signal<NewArrivalsMode>('automatic');
  readonly newArrivalsOverrideIds = signal<string[]>([]);
  readonly instagramImages        = signal<InstagramImageState[]>([]);
  readonly footerImage            = signal<{ url: string; publicId: string } | null>(null);

  readonly announcementForm = this.fb.group({
    enabled: [false], message: [''], linkText: [''], linkUrl: [''],
  });

  readonly instagramForm = this.fb.group({
    enabled: [false], heading: [''], handle: [''], profileUrl: [''],
  });

  readonly footerForm = this.fb.group({
    active: [false], title: [''], subtitle: [''], buttonText: [''], buttonUrl: [''],
  });

  readonly seoForm = this.fb.group({
    metaTitle: [''], metaDescription: [''], metaKeywords: [''], ogImage: [''], canonicalUrl: [''],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [config, collections] = await Promise.all([
        this.admin.getConfig(),
        this.admin.getAllCollections(),
      ]);

      this.collections.set([...collections].sort((a, b) => a.displayOrder - b.displayOrder));
      this.featuredCollectionSlug.set(config.featuredCollectionSlug);
      this.trendingCollectionSlug.set(config.trendingCollectionSlug);
      this.newArrivalsOverrideIds.set(config.newArrivalsOverrideIds);
      this.newArrivalsMode.set(config.newArrivalsOverrideIds.length > 0 ? 'manual' : 'automatic');

      this.announcementForm.patchValue({
        enabled: config.announcement.enabled,
        message: config.announcement.message ?? '',
        linkText: config.announcement.linkText ?? '',
        linkUrl: config.announcement.linkUrl ?? '',
      });

      this.instagramForm.patchValue({
        enabled: config.instagram.enabled,
        heading: config.instagram.heading ?? '',
        handle: config.instagram.handle ?? '',
        profileUrl: config.instagram.profileUrl ?? '',
      });
      this.instagramImages.set(config.instagram.images.map(i => ({ url: i.url, publicId: i.publicId, linkUrl: i.linkUrl })));

      this.footerForm.patchValue({
        active: config.footerBanner.active,
        title: config.footerBanner.title ?? '',
        subtitle: config.footerBanner.subtitle ?? '',
        buttonText: config.footerBanner.buttonText ?? '',
        buttonUrl: config.footerBanner.buttonUrl ?? '',
      });
      if (config.footerBanner.imageUrl) {
        this.footerImage.set({ url: config.footerBanner.imageUrl, publicId: config.footerBanner.imagePublicId ?? '' });
      }

      this.seoForm.patchValue({
        metaTitle: config.seo.metaTitle ?? '',
        metaDescription: config.seo.metaDescription ?? '',
        metaKeywords: config.seo.metaKeywords.join(', '),
        ogImage: config.seo.ogImage ?? '',
        canonicalUrl: config.seo.canonicalUrl ?? '',
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load homepage settings.');
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: SettingsTab): void { this.activeTab.set(tab); }

  addInstagramImage(result: { url: string; publicId: string }): void {
    this.instagramImages.update(list => [...list, { url: result.url, publicId: result.publicId }]);
  }

  removeInstagramImage(publicId: string): void {
    this.instagramImages.update(list => list.filter(i => i.publicId !== publicId));
  }

  onFooterImageUploaded(result: { url: string; publicId: string }): void { this.footerImage.set(result); }
  onFooterImageRemoved(): void { this.footerImage.set(null); }

  async saveAll(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const av = this.announcementForm.getRawValue();
    const iv = this.instagramForm.getRawValue();
    const fv = this.footerForm.getRawValue();
    const sv = this.seoForm.getRawValue();
    const footerImg = this.footerImage();

    const input: HomepageConfigInput = {
      featuredCollectionSlug: this.featuredCollectionSlug(),
      trendingCollectionSlug: this.trendingCollectionSlug(),
      newArrivalsOverrideIds: this.newArrivalsMode() === 'manual' ? this.newArrivalsOverrideIds() : [],
      announcement: {
        enabled: !!av.enabled,
        message: av.message?.trim() || undefined,
        linkText: av.linkText?.trim() || undefined,
        linkUrl: av.linkUrl?.trim() || undefined,
      },
      instagram: {
        enabled: !!iv.enabled,
        heading: iv.heading?.trim() || undefined,
        handle: iv.handle?.trim() || undefined,
        profileUrl: iv.profileUrl?.trim() || undefined,
        images: this.instagramImages(),
      },
      footerBanner: {
        active: !!fv.active,
        title: fv.title?.trim() || undefined,
        subtitle: fv.subtitle?.trim() || undefined,
        imageUrl: footerImg?.url,
        imagePublicId: footerImg?.publicId,
        buttonText: fv.buttonText?.trim() || undefined,
        buttonUrl: fv.buttonUrl?.trim() || undefined,
      },
      seo: {
        metaTitle: sv.metaTitle?.trim() || undefined,
        metaDescription: sv.metaDescription?.trim() || undefined,
        metaKeywords: (sv.metaKeywords ?? '').split(',').map(s => s.trim()).filter(Boolean),
        ogImage: sv.ogImage?.trim() || undefined,
        canonicalUrl: sv.canonicalUrl?.trim() || undefined,
      },
    };

    try {
      await this.admin.updateConfig(input);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
