export interface ProductVariant {
  id: string;
  productId: string;
  colourName: string;
  colourHex: string | null;
  sku: string;
  sellingPrice: number | null;
  mrp: number | null;
  flipkartUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  images: VariantImages;
  sizes: VariantSize[];
  createdAt: string;
  updatedAt: string;
}

export interface VariantImageSlot {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface VariantImages {
  primary: VariantImageSlot | null;
  front: VariantImageSlot | null;
  back: VariantImageSlot | null;
  left: VariantImageSlot | null;
  right: VariantImageSlot | null;
  closeup: VariantImageSlot | null;
  gallery: VariantImageSlot[];
}

export interface VariantSize {
  size: string;
  stock: number;
}

export interface CreateVariantRequest {
  colourName: string;
  colourHex: string | null;
  sku: string;
  sellingPrice: number | null;
  mrp: number | null;
  flipkartUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  sizes: { size: string; stock: number }[];
}

export interface UpdateVariantRequest {
  colourName: string;
  colourHex: string | null;
  sku: string;
  sellingPrice: number | null;
  mrp: number | null;
  flipkartUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  sizes: { size: string; stock: number }[];
  images: {
    primary: string | null;
    front: string | null;
    back: string | null;
    left: string | null;
    right: string | null;
    closeup: string | null;
    gallery: string[];
  } | null;
}
