import { Injectable, signal } from '@angular/core';

export interface UndoableState {
  id: string;
  label: string;
  data: unknown;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class UndoRedoService {
  private maxStack = 50;
  private undoStack: UndoableState[] = [];
  private redoStack: UndoableState[] = [];

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly currentLabel = signal('');

  push(id: string, label: string, data: unknown): void {
    this.undoStack.push({ id, label, data, timestamp: Date.now() });
    if (this.undoStack.length > this.maxStack) this.undoStack.shift();
    this.redoStack = [];
    this.canUndo.set(true);
    this.canRedo.set(false);
  }

  undo(): UndoableState | null {
    if (this.undoStack.length === 0) return null;
    const state = this.undoStack.pop()!;
    this.redoStack.push(state);
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(true);
    return state;
  }

  redo(): UndoableState | null {
    if (this.redoStack.length === 0) return null;
    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    this.canUndo.set(true);
    this.canRedo.set(this.redoStack.length > 0);
    return state;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
  }
}
