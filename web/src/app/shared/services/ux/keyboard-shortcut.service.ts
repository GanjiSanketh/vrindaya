import { Injectable, signal } from '@angular/core';

export interface ShortcutDef {
  keys: string;
  label: string;
  description: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  readonly showHelp = signal(false);
  readonly showSearch = signal(false);
  readonly showCommandPalette = signal(false);

  readonly shortcuts = signal<ShortcutDef[]>([
    { keys: 'Ctrl+K', label: 'Global Search', description: 'Search across all entities', category: 'Navigation' },
    { keys: 'Ctrl+Shift+P', label: 'Command Palette', description: 'Run commands and actions', category: 'Navigation' },
    { keys: 'Ctrl+P', label: 'Quick Navigation', description: 'Jump to a section', category: 'Navigation' },
    { keys: 'Ctrl+Z', label: 'Undo', description: 'Undo last action', category: 'Editing' },
    { keys: 'Ctrl+Shift+Z', label: 'Redo', description: 'Redo last undone action', category: 'Editing' },
    { keys: 'Ctrl+S', label: 'Save', description: 'Trigger save / autosave', category: 'Editing' },
    { keys: 'Escape', label: 'Close', description: 'Close active overlay or dialog', category: 'General' },
    { keys: '?', label: 'Keyboard Shortcuts', description: 'Show this help', category: 'General' },
  ]);

  toggleHelp(): void { this.showHelp.update(v => !v); }
}
