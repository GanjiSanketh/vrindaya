import type { Timestamp } from 'firebase/firestore';

export const CAMPAIGN_TYPES = ['WhatsApp', 'SMS', 'Email'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

/** Types beyond WhatsApp are schema/UI-ready but not yet sendable — see CampaignService. */
export const ACTIVE_CAMPAIGN_TYPES: readonly CampaignType[] = ['WhatsApp'];

export const CAMPAIGN_AUDIENCES = ['ALL_ACTIVE_SUBSCRIBERS'] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

/**
 * The kind of media this campaign sends — deliberately a SEPARATE concept
 * from `campaignType` (the channel: WhatsApp/SMS/Email). Do not conflate
 * the two; `mediaType` only ever controls which media upload field(s) the
 * form shows and which Meta message type CampaignDeliveryWorker sends.
 */
export const CAMPAIGN_MEDIA_TYPES = ['Text', 'Image', 'Video', 'PDF', 'Mixed'] as const;
export type CampaignMediaType = (typeof CAMPAIGN_MEDIA_TYPES)[number];

/** Single source of truth for the icon shown for each media type — used by Campaign List badges and the Analytics breakdown. */
export const CAMPAIGN_MEDIA_TYPE_ICONS: Record<CampaignMediaType, string> = {
  Text:  'bi-chat-text',
  Image: 'bi-image',
  Video: 'bi-camera-video',
  PDF:   'bi-file-earmark-pdf',
  Mixed: 'bi-collection',
};

/**
 * READY_TO_SEND is the terminal state this phase can produce when an admin
 * clicks "Send Now" — no message is actually dispatched yet. SENT is
 * reserved for when the future WhatsApp Business API integration confirms
 * delivery; nothing in this app sets it today.
 */
export const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'READY_TO_SEND', 'SENT', 'CANCELLED'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface Campaign {
  id: string;
  campaignName: string;
  campaignType: CampaignType;
  mediaType: CampaignMediaType;
  status: CampaignStatus;
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
  /** A separate, smaller preview image — e.g. a poster frame for a video. Never sent to Meta; display-only. */
  thumbnailUrl?: string;
  /** Accompanies image/video/document messages (Meta's own "caption" field) — not used for Text campaigns, which use `message` instead. */
  caption?: string;
  /** Small gray text shown below the message bubble in the Live Preview. Not part of any Meta message type CampaignDeliveryWorker currently sends — display-only, same as buttonUrl was before it. */
  footer?: string;
  /** Label for the preview's call-to-action button, paired with buttonUrl. Display-only, same caveat as footer. */
  buttonText?: string;
  buttonUrl?: string;
  audience: CampaignAudience;
  subscriberCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledAt: Timestamp | null;
}

export interface CampaignInput {
  campaignName: string;
  campaignType: CampaignType;
  mediaType: CampaignMediaType;
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  footer?: string;
  buttonText?: string;
  buttonUrl?: string;
  audience: CampaignAudience;
}

/** Available placeholder variables admins can insert into a campaign message. */
export const CAMPAIGN_PLACEHOLDERS = ['{{name}}', '{{mobile}}', '{{product}}', '{{link}}', '{{date}}'] as const;
