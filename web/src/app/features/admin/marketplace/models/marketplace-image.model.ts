export type ImageType = 'primary' | 'gallery' | 'lifestyle' | 'detail' | 'size_chart' | 'other';

export interface MarketplaceImage {
  id?: string;
  url: string;
  altText: string;
  order: number;
  type: ImageType;
  width?: number;
  height?: number;
  fileSize?: number;
  isPrimary: boolean;
  externalUrl?: string;
  createdAt: Date;
}
