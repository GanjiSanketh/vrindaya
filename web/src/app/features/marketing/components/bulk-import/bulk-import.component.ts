import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BulkImportService } from '../../services/bulk-import.service';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { IMPORT_SOURCES, ImportPreview, ImportSource, ImportSummary, ParsedRow } from '../../models/bulk-import.model';

@Component({
  selector:    'app-bulk-import',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './bulk-import.component.html',
  styleUrl:    './bulk-import.component.css',
})
export class BulkImportComponent {
  readonly svc              = inject(BulkImportService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly toast     = inject(ToastService);

  readonly sources = IMPORT_SOURCES;

  readonly source         = signal<ImportSource | null>(null);
  readonly rawText        = signal('');
  readonly selectedFile   = signal<File | null>(null);
  readonly rows           = signal<ParsedRow[]>([]);
  readonly preview        = signal<ImportPreview | null>(null);
  readonly previewLoading = signal(false);
  readonly summary        = signal<ImportSummary | null>(null);

  readonly progressPercent = computed(() => {
    const { done, total } = this.svc.progress();
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  readonly canImport = computed(() =>
    !!this.source() && !!this.preview() && this.preview()!.valid > 0 && !this.svc.importing(),
  );

  onTextChange(value: string): void {
    this.rawText.set(value);
    this.selectedFile.set(null);
    this.clearResults();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    if (file) this.rawText.set('');
    this.clearResults();
  }

  async runPreview(): Promise<void> {
    if (!this.source()) {
      this.toast.error('Please choose an import source first.');
      return;
    }

    let parsed: ParsedRow[];
    try {
      parsed = this.selectedFile()
        ? await this.svc.parseFile(this.selectedFile()!)
        : this.svc.parseLines(this.rawText());
    } catch (err) {
      console.error('[BulkImport]', err);
      this.toast.error('Could not read that file. Please check its format and try again.');
      return;
    }

    if (parsed.length === 0) {
      this.toast.info('Nothing to import — paste some numbers or choose a file.');
      return;
    }

    this.previewLoading.set(true);
    try {
      const { rows, preview } = await this.svc.buildPreview(parsed);
      this.rows.set(rows);
      this.preview.set(preview);
      this.summary.set(null);
    } catch (err) {
      console.error('[BulkImport]', err);
      this.toast.error('Failed to check existing subscribers. Please try again.');
    } finally {
      this.previewLoading.set(false);
    }
  }

  async startImport(): Promise<void> {
    if (!this.canImport()) return;

    const importedBy = this.adminAuth.currentUser()?.email ?? 'unknown-admin';

    try {
      const summary = await this.svc.importRows(this.rows(), this.source()!, importedBy);
      this.summary.set(summary);
      this.toast.success(`Imported ${summary.imported} subscriber(s).`);
    } catch (err) {
      console.error('[BulkImport]', err);
      this.toast.error('Import failed partway through. Check the browser console for details.');
    }
  }

  startOver(): void {
    this.rawText.set('');
    this.selectedFile.set(null);
    this.clearResults();
  }

  private clearResults(): void {
    this.rows.set([]);
    this.preview.set(null);
    this.summary.set(null);
  }
}
