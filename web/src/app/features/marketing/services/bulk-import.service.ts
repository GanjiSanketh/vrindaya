import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { MOBILE_NUMBER_PATTERN } from '../models/marketing-subscriber.model';
import { ImportPreview, ImportSource, ImportSummary, ParsedRow } from '../models/bulk-import.model';

/** Must match MarketingService's own COLLECTION constant — kept separate deliberately (see note below). */
const COLLECTION = 'marketingSubscribers';

/** Firestore's `in` query operator accepts at most 30 values per call. */
const EXISTENCE_CHECK_CHUNK = 30;

/** Comfortably under Firestore's 500-operation writeBatch limit. */
const WRITE_BATCH_CHUNK = 400;

/**
 * Bulk Import for Marketing Contacts — deliberately a separate service from
 * MarketingService rather than an extension of it, so the existing
 * subscribe()/getSubscribers()/deleteSubscriber() flow is never touched.
 *
 * Unlike the public sign-up flow (which infers "duplicate" from a denied
 * write, since public callers can't read), this service is admin-only and
 * explicitly checks existence via getDoc-equivalent `in` queries before
 * writing — admins hold `update` rights in firestore.rules, so a blind
 * setDoc() against an existing document would silently succeed as an
 * overwrite instead of failing.
 */
@Injectable({ providedIn: 'root' })
export class BulkImportService {
  private readonly pid = inject(PLATFORM_ID);

  readonly importing = signal(false);
  readonly progress  = signal<{ done: number; total: number }>({ done: 0, total: 0 });

  // ── Parsing ──────────────────────────────────────────────────────────────

  /**
   * Parses "mobileNumber" or "mobileNumber,firstName" lines (from a pasted
   * textarea or a raw CSV file's text content — both use this same parser).
   * Flags malformed numbers as invalid and repeated numbers within the same
   * input as duplicates; Firestore-existence duplicates are resolved later
   * by buildPreview().
   */
  parseLines(text: string): ParsedRow[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const seen = new Set<string>();

    return lines.map((raw, i): ParsedRow => {
      const lineNumber = i + 1;
      const [rawMobile, rawFirstName] = raw.split(',').map(part => part?.trim() ?? '');
      const mobileNumber = (rawMobile ?? '').replace(/\D/g, '');
      const firstName = rawFirstName || undefined;

      if (!MOBILE_NUMBER_PATTERN.test(mobileNumber)) {
        return { lineNumber, raw, mobileNumber, firstName, status: 'invalid', reason: 'Invalid mobile number' };
      }
      if (seen.has(mobileNumber)) {
        return { lineNumber, raw, mobileNumber, firstName, status: 'duplicate', reason: 'Duplicate within this import' };
      }
      seen.add(mobileNumber);
      return { lineNumber, raw, mobileNumber, firstName, status: 'valid' };
    });
  }

  /** Reads a CSV or XLSX file and parses it with the same line-based rules as parseLines(). */
  async parseFile(file: File): Promise<ParsedRow[]> {
    const isXlsx = /\.xlsx?$/i.test(file.name);
    const text = isXlsx ? await this.xlsxToCsvText(file) : await file.text();
    return this.parseLines(text);
  }

  private async xlsxToCsvText(file: File): Promise<string> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }

  // ── Preview (resolves Firestore-existence duplicates) ───────────────────

  /**
   * Takes the locally-parsed rows and checks the still-`valid` ones against
   * Firestore, reclassifying any that already exist as `duplicate`. Returns
   * the updated rows (reused directly by importRows(), so existence is
   * never queried twice) plus the four preview counts.
   */
  async buildPreview(rows: ParsedRow[]): Promise<{ rows: ParsedRow[]; preview: ImportPreview }> {
    const candidates = rows.filter(r => r.status === 'valid');
    const existing = await this.checkExisting(candidates.map(r => r.mobileNumber));

    const resolved = rows.map(r =>
      r.status === 'valid' && existing.has(r.mobileNumber)
        ? { ...r, status: 'duplicate' as const, reason: 'Already a subscriber' }
        : r,
    );

    const preview: ImportPreview = {
      totalRows:  resolved.length,
      valid:      resolved.filter(r => r.status === 'valid').length,
      duplicates: resolved.filter(r => r.status === 'duplicate').length,
      invalid:    resolved.filter(r => r.status === 'invalid').length,
    };

    return { rows: resolved, preview };
  }

  private async checkExisting(mobileNumbers: string[]): Promise<Set<string>> {
    const existing = new Set<string>();
    if (!isPlatformBrowser(this.pid) || mobileNumbers.length === 0) return existing;

    const { getApps, getApp, initializeApp } = await import('firebase/app');
    const { getFirestore, collection, query, where, documentId, getDocs } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    const db  = getFirestore(app);

    for (let i = 0; i < mobileNumbers.length; i += EXISTENCE_CHECK_CHUNK) {
      const chunk = mobileNumbers.slice(i, i + EXISTENCE_CHECK_CHUNK);
      const q = query(collection(db, COLLECTION), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => existing.add(d.id));
    }

    return existing;
  }

  // ── Import ───────────────────────────────────────────────────────────────

  /**
   * Writes every `valid` row (post-preview) in batches, reporting progress
   * via the `progress` signal. Rows already marked `duplicate`/`invalid` are
   * never written — they're only reflected in the returned summary.
   */
  async importRows(rows: ParsedRow[], source: ImportSource, importedBy: string): Promise<ImportSummary> {
    const validRows = rows.filter(r => r.status === 'valid');
    const summary: ImportSummary = {
      imported: 0,
      skipped:  rows.filter(r => r.status === 'duplicate').length,
      invalid:  rows.filter(r => r.status === 'invalid').length,
    };

    if (!isPlatformBrowser(this.pid) || validRows.length === 0) return summary;

    this.importing.set(true);
    this.progress.set({ done: 0, total: validRows.length });

    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, writeBatch, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      for (let i = 0; i < validRows.length; i += WRITE_BATCH_CHUNK) {
        const chunk = validRows.slice(i, i + WRITE_BATCH_CHUNK);
        const batch = writeBatch(db);

        for (const row of chunk) {
          const ref = doc(db, COLLECTION, row.mobileNumber);
          const payload: Record<string, unknown> = {
            mobileNumber: row.mobileNumber,
            status:       'ACTIVE',
            source,
            consent:      true,
            importedBy,
            importedAt:   serverTimestamp(),
            createdAt:    serverTimestamp(),
            updatedAt:    serverTimestamp(),
          };
          if (row.firstName) payload['firstName'] = row.firstName;
          batch.set(ref, payload);
        }

        await batch.commit();
        summary.imported += chunk.length;
        this.progress.set({ done: Math.min(i + WRITE_BATCH_CHUNK, validRows.length), total: validRows.length });
      }
    } finally {
      this.importing.set(false);
    }

    return summary;
  }
}
