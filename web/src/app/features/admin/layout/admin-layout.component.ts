import { Component, inject, signal, isDevMode, PLATFORM_ID, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constants';
import { KeyboardShortcutService } from '../../../shared/services/ux/keyboard-shortcut.service';
import { GlobalSearchService } from '../../../shared/services/ux/global-search.service';
import { UndoRedoService } from '../../../shared/services/ux/undo-redo.service';
import { AutosaveService } from '../../../shared/services/ux/autosave.service';
import { DraftRecoveryService } from '../../../shared/services/ux/draft-recovery.service';
import { RecentlyOpenedService } from '../../../shared/services/ux/recently-opened.service';

export interface NavLeaf {
  label: string;
  path?: string;
  icon: string;
  exact?: boolean;
  comingSoon?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  items: NavLeaf[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'catalog', label: 'Catalog', icon: 'bi-grid-3x3-gap',
    items: [
      { label: 'Products', path: 'products', icon: 'bi-box-seam' },
      { label: 'Inventory', path: 'inventory', icon: 'bi-boxes' },
      { label: 'Pricing', path: 'pricing', icon: 'bi-currency-rupee' },
      { label: 'Categories', path: 'categories', icon: 'bi-tags' },
    ],
  },
  {
    key: 'flipkart', label: 'Flipkart Operations', icon: 'bi-shop',
    items: [
      { label: 'Flipkart Ops', path: 'flipkart-ops', icon: 'bi-cart' },
    ],
  },
  {
    key: 'sales', label: 'Sales', icon: 'bi-graph-up-arrow',
    items: [
      { label: 'Sales Orders', path: 'sales/orders', icon: 'bi-cart-check' },
      { label: 'Record Sale', path: 'sales/record', icon: 'bi-plus-circle' },
    ],
  },
  {
    key: 'analytics', label: 'Analytics', icon: 'bi-graph-up-arrow',
    items: [
      { label: 'Dashboard', path: 'analytics', icon: 'bi-speedometer2', exact: false },
    ],
  },
  {
    key: 'marketplace', label: 'Marketplace', icon: 'bi-shop-window',
    items: [
      { label: 'Dashboard',   path: 'marketplace/dashboard',   icon: 'bi-speedometer2' },
      { label: 'Products',    path: 'marketplace/products',    icon: 'bi-box-seam' },
      { label: 'Listings',    path: 'marketplace/listings',    icon: 'bi-card-list' },
      { label: 'Sync Centre', path: 'marketplace/sync-centre', icon: 'bi-arrow-repeat' },
      { label: 'Marketing AI', path: 'marketplace/marketing', icon: 'bi-megaphone' },
      { label: 'Settings',    path: 'marketplace/settings',    icon: 'bi-gear' },
    ],
  },
];

const EXPANDED_STORAGE_KEY = 'vrindaya_admin_nav_expanded';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly pid = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly auth = inject(AdminAuthService);
  readonly BASE = `/${APP_ROUTES.ADMIN}`;
  readonly sideOpen = signal(false);
  readonly sections = NAV_SECTIONS;

  readonly expandedSection = signal<string | null>(this.loadExpanded());

  readonly kbd = inject(KeyboardShortcutService);
  readonly search = inject(GlobalSearchService);
  readonly undoRedo = inject(UndoRedoService);
  readonly autosave = inject(AutosaveService);
  readonly drafts = inject(DraftRecoveryService);
  readonly recent = inject(RecentlyOpenedService);

  readonly showRecent = signal(false);

  searchQuery = '';

  constructor() {
    const currentUrl = this.router.url;
    const active = this.sections.find(section =>
      section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`)),
    );
    if (active && this.expandedSection() !== active.key) {
      this.expandedSection.set(active.key);
      this.persistExpanded(active.key);
    }
  }

  toggleSide(): void { this.sideOpen.update(v => !v); }
  closeSide(): void { this.sideOpen.set(false); }

  toggleSection(key: string): void {
    const next = this.expandedSection() === key ? null : key;
    this.expandedSection.set(next);
    this.persistExpanded(next);
  }

  isExpanded(key: string): boolean {
    return this.expandedSection() === key;
  }

  isSectionActive(section: NavSection): boolean {
    const currentUrl = this.router.url;
    return section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`));
  }

  isChildActive(item: NavLeaf): boolean {
    if (!item.path) return false;
    const currentUrl = this.router.url;
    const target = `${this.BASE}/${item.path}`;
    return item.exact ? currentUrl === target : currentUrl.startsWith(target);
  }

  async signOut(): Promise<void> { await this.auth.signOut(); }

  handleKeydown(event: KeyboardEvent, key: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleSection(key);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      if (this.search.isOpen()) { this.search.close(); this.kbd.showSearch.set(false); e.preventDefault(); return; }
      if (this.kbd.showCommandPalette()) { this.kbd.showCommandPalette.set(false); e.preventDefault(); return; }
      if (this.kbd.showHelp()) { this.kbd.showHelp.set(false); e.preventDefault(); return; }
      if (this.showRecent()) { this.showRecent.set(false); return; }
    }

    if (ctrl && key === 'k' && !shift) { this.openSearch(); e.preventDefault(); return; }
    if (ctrl && shift && key === 'p') { this.kbd.showCommandPalette.set(true); e.preventDefault(); return; }
    if (ctrl && key === 'p' && !shift) { this.openQuickNav(); e.preventDefault(); return; }
    if (ctrl && key === 'z' && !shift) { this.handleUndo(); e.preventDefault(); return; }
    if (ctrl && shift && key === 'z') { this.handleRedo(); e.preventDefault(); return; }
    if (ctrl && key === 's') { this.handleSave(); e.preventDefault(); return; }
    if (key === '?' && !ctrl && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      this.kbd.showHelp.set(true); e.preventDefault(); return;
    }
  }

  openSearch(): void {
    if (!isPlatformBrowser(this.pid)) return;
    this.search.open();
    this.kbd.showSearch.set(true);
    this.searchQuery = '';
    this.search.resetResults();
  }

  closeSearch(): void {
    this.search.close();
    this.kbd.showSearch.set(false);
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.search.search(query);
  }

  onSearchKeydown(e: KeyboardEvent): void {
    const results = this.search.results();
    let idx = this.search.selectedIndex();
    if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, results.length - 1); this.search.selectedIndex.set(idx); e.preventDefault(); }
    if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); this.search.selectedIndex.set(idx); e.preventDefault(); }
    if (e.key === 'Enter' && idx >= 0) { this.goToSearchResult(idx); }
  }

  goToSearchResult(index: number): void {
    const nav = this.search.navigate(index);
    if (nav) { this.router.navigate([this.BASE, ...nav.path.split('/')]); this.closeSearch(); }
  }

  openQuickNav(): void {
    this.openSearch();
  }

  handleUndo(): void {
    const state = this.undoRedo.undo();
    if (state && isDevMode()) console.log('[Undo]', state.label);
  }

  handleRedo(): void {
    const state = this.undoRedo.redo();
    if (state && isDevMode()) console.log('[Redo]', state.label);
  }

  handleSave(): void {
    if (isDevMode()) console.log('[Save] Triggered');
  }

  runCommand(cmd: string): void {
    switch (cmd) {
      case 'search': this.openSearch(); break;
      case 'quicknav': this.openQuickNav(); break;
      case 'help': this.kbd.showHelp.set(true); break;
      case 'undo': this.handleUndo(); break;
      case 'redo': this.handleRedo(); break;
      case 'save': this.handleSave(); break;
    }
    this.kbd.showCommandPalette.set(false);
  }

  toggleRecent(): void { this.showRecent.update(v => !v); }
  closeRecent(): void { this.showRecent.set(false); }

  goToRecent(item: { path: string }): void {
    this.router.navigate([this.BASE, ...item.path.split('/')]);
    this.showRecent.set(false);
  }

  handleDismiss(key: string): void { this.drafts.dismiss(key); }

  restoreDraft(key: string): void {
    const entry = this.drafts.restore(key);
    if (entry && isDevMode()) console.log('[Draft Restored]', entry.label);
  }

  dismissAllDrafts(): void { this.drafts.dismissAll(); }

  private loadExpanded(): string | null {
    if (!isPlatformBrowser(this.pid)) return null;
    try { return localStorage.getItem(EXPANDED_STORAGE_KEY); } catch { return null; }
  }

  private persistExpanded(key: string | null): void {
    if (!isPlatformBrowser(this.pid)) return;
    if (key) { localStorage.setItem(EXPANDED_STORAGE_KEY, key); } else { localStorage.removeItem(EXPANDED_STORAGE_KEY); }
  }
}
