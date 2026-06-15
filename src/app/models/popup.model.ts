export type TriggerType  = 'SCROLL_OR_TIME' | 'TIME_ONLY' | 'SCROLL_ONLY';
export type CampaignType = 'BEST_SELLER' | 'TRENDING' | 'NEW_ARRIVAL' | 'FESTIVE_SALE' | 'MANUAL_PRODUCT';

export interface PopupConfig {
  enabled:            boolean;
  productId:          number;
  triggerType:        TriggerType;
  scrollPercentage:   number;
  timeDelaySeconds:   number;
  showOncePerSession: boolean;
  title:              string;
  subtitle:           string;
  campaignType:       CampaignType;
  /* kept only for backward-compat with old localStorage entries */
  showDelay?:         number;
}
