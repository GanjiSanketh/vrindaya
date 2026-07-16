/** Wire shapes returned by GET/PUT /brand-config (System.Text.Json camelCase). */

export interface ApiAboutUs {
  heading?: string;
  body?: string;
  imageUrl?: string;
  imagePublicId?: string;
}

export interface ApiContact {
  email?: string;
  phone?: string;
  whatsApp?: string;
  address?: string;
  mapEmbedUrl?: string;
  businessHours?: string;
}

export interface ApiStoreInformation {
  legalName?: string;
  gstin?: string;
  registeredAddress?: string;
  establishedYear?: string;
}

export interface ApiSocialLinks {
  instagram?: string;
  flipkart?: string;
}

export interface ApiFaq {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface ApiPolicy {
  id: string;
  title: string;
  content: string;
  displayOrder: number;
  updatedAt: string;
}

export interface ApiFooterSettings {
  showSocialLinks: boolean;
  showPolicyLinks: boolean;
  copyrightText?: string;
}

export interface ApiBrandConfig {
  aboutUs: ApiAboutUs;
  contact: ApiContact;
  storeInformation: ApiStoreInformation;
  socialLinks: ApiSocialLinks;
  faqs: ApiFaq[];
  policies: ApiPolicy[];
  footer: ApiFooterSettings;
  updatedAt: string;
}

/** Domain shape — identical to the wire shape today (no product-id resolution needed, unlike Homepage), kept as its own type for consistency with every other *.model.ts in this app. */
export type BrandConfig = ApiBrandConfig;

export function apiBrandConfigToBrandConfig(dto: ApiBrandConfig): BrandConfig {
  return dto;
}
