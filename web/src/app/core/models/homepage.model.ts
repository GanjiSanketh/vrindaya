import { Product } from './product.model';
import { ApiProductSummary, apiSummaryToProduct } from './product-api.model';

/** Wire shapes returned by GET /homepage (System.Text.Json camelCase). */

export interface ApiHeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundImageUrl: string;
  backgroundImagePublicId: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
}

export interface ApiPromotionalBanner {
  id: string;
  desktopImageUrl: string;
  desktopImagePublicId: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  buttonText?: string;
  buttonUrl?: string;
  displayOrder: number;
  active: boolean;
}

export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  code?: string;
  subtitle?: string;
  description?: string;
  image: string;
  imagePublicId?: string;
  bannerImage?: string;
  bannerImagePublicId?: string;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
}

export interface ApiAnnouncement {
  enabled: boolean;
  message?: string;
  linkText?: string;
  linkUrl?: string;
}

export interface ApiInstagramImage {
  url: string;
  publicId: string;
  linkUrl?: string;
}

export interface ApiInstagramSection {
  enabled: boolean;
  heading?: string;
  handle?: string;
  profileUrl?: string;
  images: ApiInstagramImage[];
}

export interface ApiFooterBanner {
  active: boolean;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  imagePublicId?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface ApiHomepageSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

export interface ApiHomepage {
  hero: ApiHeroBanner | null;
  featuredProducts: ApiProductSummary[];
  newArrivals: ApiProductSummary[];
  trendingProducts: ApiProductSummary[];
  bestSellers: ApiProductSummary[];
  categories: ApiCategory[];
  promotionalBanners: ApiPromotionalBanner[];
  announcement: ApiAnnouncement | null;
  instagram: ApiInstagramSection | null;
  footerBanner: ApiFooterBanner | null;
  seo: ApiHomepageSeo;
}

/** Domain shapes consumed by the public homepage components. */

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundImageUrl: string;
  mobileImageUrl?: string;
}

export interface PromotionalBanner {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface HomepageCategory {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
}

export interface Announcement {
  message?: string;
  linkText?: string;
  linkUrl?: string;
}

export interface InstagramImage {
  url: string;
  linkUrl?: string;
}

export interface InstagramSection {
  heading?: string;
  handle?: string;
  profileUrl?: string;
  images: InstagramImage[];
}

export interface FooterBanner {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface HomepageSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

export interface Homepage {
  hero: HeroBanner | null;
  featuredProducts: Product[];
  newArrivals: Product[];
  trendingProducts: Product[];
  bestSellers: Product[];
  categories: HomepageCategory[];
  promotionalBanners: PromotionalBanner[];
  announcement: Announcement | null;
  instagram: InstagramSection | null;
  footerBanner: FooterBanner | null;
  seo: HomepageSeo;
}

export function apiHomepageToHomepage(dto: ApiHomepage): Homepage {
  return {
    hero: dto.hero ? {
      id: dto.hero.id,
      title: dto.hero.title,
      subtitle: dto.hero.subtitle,
      buttonText: dto.hero.buttonText,
      buttonUrl: dto.hero.buttonUrl,
      backgroundImageUrl: dto.hero.backgroundImageUrl,
      mobileImageUrl: dto.hero.mobileImageUrl,
    } : null,
    featuredProducts: dto.featuredProducts.map(apiSummaryToProduct),
    newArrivals: dto.newArrivals.map(apiSummaryToProduct),
    trendingProducts: dto.trendingProducts.map(apiSummaryToProduct),
    bestSellers: dto.bestSellers.map(apiSummaryToProduct),
    categories: dto.categories.map(c => ({ id: c.id, name: c.name, subtitle: c.subtitle, image: c.image })),
    promotionalBanners: dto.promotionalBanners.map(b => ({
      id: b.id, desktopImageUrl: b.desktopImageUrl, mobileImageUrl: b.mobileImageUrl,
      buttonText: b.buttonText, buttonUrl: b.buttonUrl,
    })),
    announcement: dto.announcement ? {
      message: dto.announcement.message, linkText: dto.announcement.linkText, linkUrl: dto.announcement.linkUrl,
    } : null,
    instagram: dto.instagram ? {
      heading: dto.instagram.heading, handle: dto.instagram.handle, profileUrl: dto.instagram.profileUrl,
      images: dto.instagram.images.map(i => ({ url: i.url, linkUrl: i.linkUrl })),
    } : null,
    footerBanner: dto.footerBanner ? {
      title: dto.footerBanner.title, subtitle: dto.footerBanner.subtitle, imageUrl: dto.footerBanner.imageUrl,
      buttonText: dto.footerBanner.buttonText, buttonUrl: dto.footerBanner.buttonUrl,
    } : null,
    seo: {
      metaTitle: dto.seo.metaTitle, metaDescription: dto.seo.metaDescription,
      metaKeywords: dto.seo.metaKeywords, ogImage: dto.seo.ogImage, canonicalUrl: dto.seo.canonicalUrl,
    },
  };
}
