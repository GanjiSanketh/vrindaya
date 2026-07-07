export const IMPORT_SOURCES = ['Offline Store', 'Flipkart', 'Instagram', 'WhatsApp', 'Manual Import'] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export type ParsedRowStatus = 'valid' | 'duplicate' | 'invalid';

export interface ParsedRow {
  lineNumber: number;
  raw: string;
  mobileNumber: string;
  firstName?: string;
  status: ParsedRowStatus;
  reason?: string;
}

export interface ImportPreview {
  totalRows: number;
  valid: number;
  duplicates: number;
  invalid: number;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  invalid: number;
}
