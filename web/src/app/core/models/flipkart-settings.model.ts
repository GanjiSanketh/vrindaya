export interface ApiFlipkartSettings {
  marketplaceName: string;
  marketplaceEnabled: boolean;
  sellerDisplayName: string;
  sellerId: string;
  defaultShippingCharge: number;
  defaultPackagingCharge: number;
  defaultAdvertisementPercentage: number;
  defaultFlipkartCommissionPercentage: number;
  defaultPaymentGatewayCharges: number;
  defaultMiscellaneousCharges: number;
  gstPercentage: number;
  defaultProfitMargin: number;
  updatedAt: string;
}

export type FlipkartSettings = ApiFlipkartSettings;
