export interface MarketplacePricing {
  mrp: number;
  sellingPrice: number;
  wholesalePrice?: number;
  resellerPrice?: number;
  discountPercent: number;
  taxRate: number;
  taxInclusive: boolean;
  shippingCharge: number;
  freeShippingAbove?: number;
  currency: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}
