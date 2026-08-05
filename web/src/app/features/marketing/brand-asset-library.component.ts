import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BrandAsset {
  id: string;
  name: string;
  category: string;
  folder: string;
  type: 'logo' | 'photo' | 'background' | 'icon' | 'font' | 'color';
  thumbnailUrl: string;
  uploadedAt: string;
  size: string;
}

@Component({
  selector: 'app-brand-asset-library',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bal-page">
      <div class="bal-header">
        <h1 class="bal-title">Brand Asset Library</h1>
        <p class="bal-desc">Manage logos, photos, backgrounds, icons, fonts, and brand colors.</p>
      </div>

      <div class="bal-layout">
        <div class="bal-sidebar">
          <div class="bal-search">
            <i class="bi bi-search"></i>
            <input type="text" class="bal-search-input" placeholder="Search assets..." [(ngModel)]="searchQuery" name="balSearch" />
          </div>

          <div class="bal-folders">
            <h3 class="bal-sidebar-title">Categories</h3>
            <ul class="bal-folder-list">
              <li class="bal-folder-item" [class.bal-folder-active]="activeCategory() === 'All'">
                <a (click)="onSelectCategory('All')" class="bal-folder-link">
                  <i class="bi bi-grid"></i> All Assets
                  <span class="bal-folder-count">{{ allCount() }}</span>
                </a>
              </li>
              @for (cat of categories(); track cat) {
                <li class="bal-folder-item" [class.bal-folder-active]="activeCategory() === cat">
                  <a (click)="onSelectCategory(cat)" class="bal-folder-link">
                    <i class="bi {{ folderIcon(cat) }}"></i> {{ cat }}
                    <span class="bal-folder-count">{{ categoryCount(cat) }}</span>
                  </a>
                </li>
              }
            </ul>
          </div>

          <div class="bal-folders">
            <h3 class="bal-sidebar-title">Folders</h3>
            <ul class="bal-folder-list">
              <li class="bal-folder-item" [class.bal-folder-active]="activeFolder() === 'All'">
                <a (click)="onSelectFolder('All')" class="bal-folder-link">
                  <i class="bi bi-folder"></i> All
                </a>
              </li>
              @for (folder of folders(); track folder) {
                <li class="bal-folder-item" [class.bal-folder-active]="activeFolder() === folder">
                  <a (click)="onSelectFolder(folder)" class="bal-folder-link">
                    <i class="bi bi-folder"></i> {{ folder }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <button class="bal-add-btn" (click)="onAddAsset()">
            <i class="bi bi-plus-lg"></i> Add Asset
          </button>
        </div>

        <div class="bal-main">
          <div class="bal-toolbar">
            <span class="bal-result-count">{{ filteredAssets().length }} assets</span>
            <div class="bal-view-toggle">
              <button class="bal-toggle-btn" [class.bal-toggle-active]="viewMode() === 'grid'" (click)="viewMode.set('grid')">
                <i class="bi bi-grid-3x3-gap"></i>
              </button>
              <button class="bal-toggle-btn" [class.bal-toggle-active]="viewMode() === 'list'" (click)="viewMode.set('list')">
                <i class="bi bi-list"></i>
              </button>
            </div>
          </div>

          @if (viewMode() === 'grid') {
            <div class="bal-grid">
              @for (asset of filteredAssets(); track asset.id) {
                <div class="bal-asset-card">
                  <div class="bal-asset-thumb">
                    @if (asset.type === 'color') {
                      <div class="bal-color-swatch" [style.background-color]="asset.thumbnailUrl"></div>
                    } @else {
                      <img [src]="asset.thumbnailUrl" [alt]="asset.name" loading="lazy" />
                    }
                  </div>
                  <div class="bal-asset-info">
                    <span class="bal-asset-name">{{ asset.name }}</span>
                    <span class="bal-asset-meta">{{ asset.type }} &middot; {{ asset.size }}</span>
                  </div>
                  <div class="bal-asset-actions">
                    <button class="bal-icon-btn" title="Download"><i class="bi bi-download"></i></button>
                    <button class="bal-icon-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="bal-icon-btn bal-icon-danger" title="Delete"><i class="bi bi-trash"></i></button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="bal-list">
              @for (asset of filteredAssets(); track asset.id) {
                <div class="bal-list-item">
                  <div class="bal-list-thumb">
                    @if (asset.type === 'color') {
                      <div class="bal-color-swatch" [style.background-color]="asset.thumbnailUrl"></div>
                    } @else {
                      <img [src]="asset.thumbnailUrl" [alt]="asset.name" loading="lazy" />
                    }
                  </div>
                  <div class="bal-list-info">
                    <span class="bal-list-name">{{ asset.name }}</span>
                    <span class="bal-list-meta">{{ asset.category }} &middot; {{ asset.folder }} &middot; {{ asset.size }}</span>
                  </div>
                  <div class="bal-list-actions">
                    <button class="bal-icon-btn" title="Download"><i class="bi bi-download"></i></button>
                    <button class="bal-icon-btn" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="bal-icon-btn bal-icon-danger" title="Delete"><i class="bi bi-trash"></i></button>
                  </div>
                </div>
              }
            </div>
          }

          @if (filteredAssets().length === 0) {
            <div class="bal-empty">
              <i class="bi bi-folder-open"></i>
              <p>No assets found.</p>
            </div>
          }
        </div>
      </div>

      @if (showModal()) {
        <div class="bal-modal-overlay" (click)="onCloseModal()">
          <div class="bal-modal" (click)="$event.stopPropagation()">
            <h2 class="bal-modal-title">{{ editingAsset() ? 'Edit Asset' : 'Add Asset' }}</h2>
            <div class="bal-field">
              <label class="bal-label">Name</label>
              <input type="text" class="bal-input" [(ngModel)]="formName" name="balName" placeholder="Asset name" />
            </div>
            <div class="bal-field">
              <label class="bal-label">Category</label>
              <select class="bal-input" [(ngModel)]="formCategory" name="balCategory">
                @for (cat of categories(); track cat) {
                  <option value="{{ cat }}">{{ cat }}</option>
                }
              </select>
            </div>
            <div class="bal-field">
              <label class="bal-label">Folder</label>
              <input type="text" class="bal-input" [(ngModel)]="formFolder" name="balFolder" placeholder="e.g., Q3 Campaign" />
            </div>
            <div class="bal-field">
              <label class="bal-label">Type</label>
              <select class="bal-input" [(ngModel)]="formType" name="balType">
                <option value="logo">Logo</option>
                <option value="photo">Photo</option>
                <option value="background">Background</option>
                <option value="icon">Icon</option>
                <option value="font">Font</option>
                <option value="color">Color</option>
              </select>
            </div>
            <div class="bal-field">
              <label class="bal-label">Color Value</label>
              <input type="text" class="bal-input" [(ngModel)]="formColor" name="balColor" placeholder="#0c4a58" />
            </div>
            <div class="bal-modal-actions">
              <button class="bal-btn bal-btn-secondary" (click)="onCloseModal()">Cancel</button>
              <button class="bal-btn bal-btn-primary" (click)="onSave()">Save</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './brand-asset-library.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandAssetLibraryComponent {
  categories = signal<string[]>([
    'Logos',
    'Product Photos',
    'Lifestyle Photos',
    'Backgrounds',
    'Icons',
    'Fonts',
    'Brand Colors',
  ]);

  folders = signal<string[]>([
    'Q3 Campaign',
    'Q4 Campaign',
    'Product Launch',
    'Social Media',
    'Website',
    'Email Templates',
  ]);

  assets = signal<BrandAsset[]>([
    { id: '1', name: 'Primary Logo', category: 'Logos', folder: 'Website', type: 'logo', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-01', size: '24 KB' },
    { id: '2', name: 'Secondary Logo', category: 'Logos', folder: 'Website', type: 'logo', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-01', size: '18 KB' },
    { id: '3', name: 'Kurta Product Shot', category: 'Product Photos', folder: 'Q3 Campaign', type: 'photo', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-15', size: '156 KB' },
    { id: '4', name: 'Model Lifestyle 1', category: 'Lifestyle Photos', folder: 'Social Media', type: 'photo', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-20', size: '210 KB' },
    { id: '5', name: 'Festival Background', category: 'Backgrounds', folder: 'Q4 Campaign', type: 'background', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-25', size: '89 KB' },
    { id: '6', name: 'Instagram Icon Set', category: 'Icons', folder: 'Social Media', type: 'icon', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-10', size: '32 KB' },
    { id: '7', name: 'DM Sans', category: 'Fonts', folder: 'Website', type: 'font', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-06-01', size: '120 KB' },
    { id: '8', name: 'Cormorant Garamond', category: 'Fonts', folder: 'Website', type: 'font', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-06-01', size: '98 KB' },
    { id: '9', name: 'Primary Teal', category: 'Brand Colors', folder: 'Brand Guidelines', type: 'color', thumbnailUrl: '#0c4a58', uploadedAt: '2026-06-15', size: '—' },
    { id: '10', name: 'Accent Gold', category: 'Brand Colors', folder: 'Brand Guidelines', type: 'color', thumbnailUrl: '#d4a017', uploadedAt: '2026-06-15', size: '—' },
    { id: '11', name: 'Light Background', category: 'Backgrounds', folder: 'Email Templates', type: 'background', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-07-28', size: '45 KB' },
    { id: '12', name: 'Product Packshot', category: 'Product Photos', folder: 'Product Launch', type: 'photo', thumbnailUrl: 'assets/images/placeholder.png', uploadedAt: '2026-08-01', size: '178 KB' },
  ]);

  searchQuery = signal('');
  activeCategory = signal<string>('All');
  activeFolder = signal<string>('All');
  viewMode = signal<'grid' | 'list'>('grid');
  showModal = signal(false);
  editingAsset = signal<BrandAsset | null>(null);
  formName = signal('');
  formCategory = signal('');
  formFolder = signal('');
  formType = signal('logo');
  formColor = signal('');

  filteredAssets() {
    let result = this.assets();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.folder.toLowerCase().includes(q));
    }
    if (this.activeCategory() !== 'All') {
      result = result.filter(a => a.category === this.activeCategory());
    }
    if (this.activeFolder() !== 'All') {
      result = result.filter(a => a.folder === this.activeFolder());
    }
    return result;
  }

  allCount() {
    return this.assets().length;
  }

  categoryCount(cat: string) {
    return this.assets().filter(a => a.category === cat).length;
  }

  folderIcon(cat: string): string {
    const map: Record<string, string> = {
      'Logos': 'bi-file-earmark-image',
      'Product Photos': 'bi-camera',
      'Lifestyle Photos': 'bi-person',
      'Backgrounds': 'bi-layers',
      'Icons': 'bi-star',
      'Fonts': 'bi-fonts',
      'Brand Colors': 'bi-palette',
    };
    return map[cat] || 'bi-folder';
  }

  onSelectCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  onSelectFolder(folder: string): void {
    this.activeFolder.set(folder);
  }

  onAddAsset(): void {
    this.editingAsset.set(null);
    this.formName.set('');
    this.formCategory.set(this.categories()[0]);
    this.formFolder.set('');
    this.formType.set('logo');
    this.formColor.set('');
    this.showModal.set(true);
  }

  onEdit(asset: BrandAsset): void {
    this.editingAsset.set(asset);
    this.formName.set(asset.name);
    this.formCategory.set(asset.category);
    this.formFolder.set(asset.folder);
    this.formType.set(asset.type);
    this.formColor.set(asset.type === 'color' ? asset.thumbnailUrl : '');
    this.showModal.set(true);
  }

  onDelete(id: string): void {
    this.assets.update(assets => assets.filter(a => a.id !== id));
  }

  onSave(): void {
    const name = this.formName().trim();
    if (!name) return;

    if (this.editingAsset()) {
      this.assets.update(assets =>
        assets.map(a =>
          a.id === this.editingAsset()!.id
            ? { ...a, name, category: this.formCategory(), folder: this.formFolder(), type: this.formType() as BrandAsset['type'] }
            : a
        )
      );
    } else {
      const newAsset: BrandAsset = {
        id: Date.now().toString(),
        name,
        category: this.formCategory(),
        folder: this.formFolder() || 'General',
        type: this.formType() as BrandAsset['type'],
        thumbnailUrl: this.formType() === 'color' ? this.formColor() : 'assets/images/placeholder.png',
        uploadedAt: new Date().toISOString().split('T')[0],
        size: this.formType() === 'color' ? '—' : '10 KB',
      };
      this.assets.update(assets => [newAsset, ...assets]);
    }

    this.showModal.set(false);
    this.editingAsset.set(null);
  }

  onCloseModal(): void {
    this.showModal.set(false);
    this.editingAsset.set(null);
  }
}