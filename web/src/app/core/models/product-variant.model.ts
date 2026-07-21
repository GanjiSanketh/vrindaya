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

export interface VariantImages {
  primary: string | null;
  front: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
  closeup: string | null;
  gallery: string[];
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
