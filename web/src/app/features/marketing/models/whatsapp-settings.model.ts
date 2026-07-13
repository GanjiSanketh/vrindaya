import type { Timestamp } from 'firebase/firestore';

export interface WhatsAppSettings {
  businessName: string;
  whatsappNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  updatedBy: string;
  updatedAt: Timestamp | null;
}

export interface WhatsAppSettingsInput {
  businessName: string;
  whatsappNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}
