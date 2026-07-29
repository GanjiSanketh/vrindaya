export type AttributeSource = 'system' | 'manual' | 'ai_generated';

export interface MarketplaceAttribute {
  id?: string;
  name: string;
  value: string;
  source: AttributeSource;
  isRequired: boolean;
  isCustom: boolean;
  group?: string;
  order: number;
}

export interface MarketplaceAttributeGroup {
  name: string;
  label: string;
  attributes: MarketplaceAttribute[];
}
