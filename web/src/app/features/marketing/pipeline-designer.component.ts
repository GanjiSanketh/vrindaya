import { Component, ChangeDetectionStrategy, signal, computed, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../shared/services/toast.service';
import { PipelineDesignerService } from './pipeline-designer.service';
import {
  NODE_H,
  NODE_W,
  PIPELINE_NODE_TYPES,
  PipelineNode,
  PipelineNodeType,
  nodeTypeDef,
} from './models/pipeline-designer.model';

interface DragState {
  id: string;
  dx: number;
  dy: number;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

@Component({
  selector: 'app-pipeline-designer',
  standalone: true,
  imports: [],
  template: `
    <div class="pd-page">
      <div class="pd-header">
        <div>
          <h1 class="pd-title"><i class="bi bi-diagram-3"></i> Pipeline Designer</h1>
          <p class="pd-desc">Visually configure AI workflows — drag, drop and connect stage nodes, then save the pipeline.</p>
        </div>
        <div class="pd-actions">
          <input class="form-control pd-name-input" [value]="name()" placeholder="Pipeline name" (input)="name.set($any($event.target).value)" />
          <button class="btn pd-btn-primary" (click)="savePipeline()" [disabled]="!name().trim() || nodes().length === 0">
            <i class="bi bi-save"></i> Save Pipeline
          </button>
          <select class="form-select pd-load-select" [value]="savedKey()" (change)="loadFrom($any($event.target).value)">
            <option value="">Load pipeline…</option>
            @for (d of designs(); track d.id) {
              <option [value]="d.id">{{ d.name }}</option>
            }
          </select>
          <button class="btn btn-outline-secondary pd-btn" (click)="deleteSaved()" [disabled]="!savedKey()">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>

      <div class="pd-toolbar">
        <button class="btn btn-outline-secondary pd-btn" (click)="autoLayout()"><i class="bi bi-magic"></i> Auto Layout</button>
        <button class="btn btn-outline-secondary pd-btn" (click)="clearAll()"><i class="bi bi-x-lg"></i> Clear All</button>
        <button class="btn btn-outline-secondary pd-btn" (click)="newPipeline()"><i class="bi bi-file-earmark-plus"></i> New</button>
        <div class="pd-toolbar-spacer"></div>
        <span class="pd-stat">{{ nodes().length }} nodes</span>
        <span class="pd-stat">{{ edges().length }} connections</span>
        <span class="pd-stat">{{ enabledCount() }} enabled</span>
        <span class="pd-stat" [class.pd-stat-warn]="unconnectedCount() > 0">{{ unconnectedCount() }} unconnected</span>
      </div>

      <div class="pd-layout">
        <aside class="pd-palette">
          <div class="pd-palette-head">
            <h3 class="pd-palette-title"><i class="bi bi-boxes"></i> Node Palette</h3>
            <span class="pd-palette-hint">Drag onto canvas</span>
          </div>
          <div class="pd-palette-list">
            @for (t of palette(); track t.key) {
              <div class="pd-pal-item" draggable="true"
                (dragstart)="onPaletteDrag($event, t.key)"
                (click)="addNodeAt(t.key)">
                <span class="pd-pal-ic" [style.background]="t.color"><i class="bi {{ t.icon }}"></i></span>
                <div class="pd-pal-info">
                  <span class="pd-pal-name">{{ t.label }}</span>
                  <span class="pd-pal-desc">{{ t.description }}</span>
                </div>
              </div>
            }
          </div>
        </aside>

        <div class="pd-canvas" [class.pd-dragover]="dragOver()"
          (pointerdown)="canvasDown()"
          (pointermove)="onCanvasMove($event)"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)">
          <svg class="pd-svg">
            @for (e of edgePaths(); track e.id) {
              <path [attr.d]="e.d" class="pd-edge" (pointerdown)="removeEdge(e.id); $event.stopPropagation()"></path>
            }
            @if (tempPath()) {
              <path [attr.d]="tempPath()" class="pd-edge-temp"></path>
            }
          </svg>

          @for (n of nodes(); track n.id) {
            <div class="pd-node" [class.pd-node-disabled]="!n.enabled" [class.pd-node-selected]="selected() === n.id"
              [style.left.px]="n.x" [style.top.px]="n.y"
              (pointerdown)="startDrag($event, n.id)">
              <div class="pd-node-head">
                <span class="pd-node-ic" [style.background]="typeColor(n.type)"><i class="bi {{ typeIcon(n.type) }}"></i></span>
                <span class="pd-node-name">{{ typeLabel(n.type) }}</span>
                <div class="pd-node-btns">
                  <button (pointerdown)="toggleNode(n.id); $event.stopPropagation()" title="Enable / Disable">
                    <i class="bi {{ n.enabled ? 'bi-eye' : 'bi-eye-slash' }}"></i>
                  </button>
                  <button class="pd-node-del" (pointerdown)="deleteNode(n.id); $event.stopPropagation()" title="Delete">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
              <div class="pd-node-status">
                <i class="bi {{ n.enabled ? 'bi-circle-fill pd-dot-on' : 'bi-circle pd-dot-off' }}"></i>
                {{ n.enabled ? 'Enabled' : 'Disabled' }}
              </div>
              <span class="pd-port pd-port-in" (pointerdown)="finishConnect(n.id); $event.stopPropagation()" title="Connect input"></span>
              <span class="pd-port pd-port-out" (pointerdown)="startConnect(n.id); $event.stopPropagation()" title="Connect output"></span>
            </div>
          }

          @if (nodes().length === 0) {
            <div class="pd-empty">
              <i class="bi bi-diagram-3"></i>
              <p>Drag nodes from the palette onto the canvas, then connect output (right) to input (left) ports.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './pipeline-designer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineDesignerComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  private readonly service = inject(PipelineDesignerService);

  readonly palette = computed(() => PIPELINE_NODE_TYPES);
  readonly designs = computed(() => this.service.designs());

  readonly nodes = signal<PipelineNode[]>([]);
  readonly edges = signal<PipelineEdgeSignal[]>([]);
  readonly name = signal('');
  readonly savedKey = signal('');
  readonly selected = signal<string | null>(null);
  readonly connectFrom = signal<string | null>(null);
  readonly dragOver = signal(false);
  readonly mousePos = signal<{ x: number; y: number } | null>(null);

  private canvasRect: DOMRect | null = null;
  private drag: DragState | null = null;

  private readonly onPointerMove = (e: PointerEvent): void => this.handlePointerMove(e);
  private readonly onPointerUp = (): void => this.endDrag();

  readonly enabledCount = computed(() => this.nodes().filter(n => n.enabled).length);

  readonly unconnectedCount = computed(() => {
    const ids = this.nodes().map(n => n.id);
    const connected = new Set<string>();
    for (const e of this.edges()) {
      connected.add(e.from);
      connected.add(e.to);
    }
    return ids.filter(id => !connected.has(id)).length;
  });

  readonly edgePaths = computed(() => {
    const nodes = this.nodes();
    return this.edges()
      .map(e => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const c = Math.max(46, Math.abs(x2 - x1) / 2);
        return { id: e.id, d: `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}` };
      })
      .filter((e): e is { id: string; d: string } => e !== null);
  });

  readonly tempPath = computed(() => {
    const from = this.connectFrom();
    const mouse = this.mousePos();
    if (!from || !mouse) return null;
    const node = this.nodes().find(n => n.id === from);
    if (!node) return null;
    const x1 = node.x + NODE_W;
    const y1 = node.y + NODE_H / 2;
    const c = Math.max(46, Math.abs(mouse.x - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${mouse.x - c} ${mouse.y}, ${mouse.x} ${mouse.y}`;
  });

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  typeLabel(type: PipelineNodeType): string {
    return nodeTypeDef(type).label;
  }

  typeIcon(type: PipelineNodeType): string {
    return nodeTypeDef(type).icon;
  }

  typeColor(type: PipelineNodeType): string {
    return nodeTypeDef(type).color;
  }

  /* ---- Palette ---- */

  onPaletteDrag(event: DragEvent, type: PipelineNodeType): void {
    event.dataTransfer?.setData('text/plain', type);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const type = event.dataTransfer?.getData('text/plain') as PipelineNodeType | undefined;
    if (!type || !PIPELINE_NODE_TYPES.some(t => t.key === type)) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.addNode(type, event.clientX - rect.left - NODE_W / 2, event.clientY - rect.top - NODE_H / 2);
    this.toast.info(`${this.typeLabel(type)} node added`);
  }

  addNodeAt(type: PipelineNodeType): void {
    const offset = this.nodes().length * 18;
    this.addNode(type, 60 + offset, 48 + offset);
    this.toast.info(`${this.typeLabel(type)} node added`);
  }

  /* ---- Canvas ---- */

  canvasDown(): void {
    this.selected.set(null);
    this.connectFrom.set(null);
    this.mousePos.set(null);
  }

  onCanvasMove(event: PointerEvent): void {
    if (!this.connectFrom()) return;
    if (!this.canvasRect) {
      const canvas = (event.currentTarget as HTMLElement);
      this.canvasRect = canvas.getBoundingClientRect();
    }
    this.mousePos.set({
      x: event.clientX - this.canvasRect.left,
      y: event.clientY - this.canvasRect.top,
    });
  }

  /* ---- Nodes ---- */

  startDrag(event: PointerEvent, id: string): void {
    const canvas = (event.currentTarget as HTMLElement).closest('.pd-canvas') as HTMLElement | null;
    if (!canvas) return;
    this.canvasRect = canvas.getBoundingClientRect();
    const node = this.nodes().find(n => n.id === id);
    if (!node) return;
    this.drag = { id, dx: event.clientX - this.canvasRect.left - node.x, dy: event.clientY - this.canvasRect.top - node.y };
    this.selected.set(id);
    this.connectFrom.set(null);
    this.mousePos.set(null);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.drag && this.canvasRect) {
      const nx = Math.max(8, event.clientX - this.canvasRect.left - this.drag.dx);
      const ny = Math.max(8, event.clientY - this.canvasRect.top - this.drag.dy);
      this.moveNode(this.drag.id, nx, ny);
    }
    if (this.connectFrom()) {
      const x = (event.clientX - (this.canvasRect?.left ?? 0));
      const y = (event.clientY - (this.canvasRect?.top ?? 0));
      this.mousePos.set({ x, y });
    }
  }

  private endDrag(): void {
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private moveNode(id: string, x: number, y: number): void {
    this.nodes.update(list => list.map(n => (n.id === id ? { ...n, x, y } : n)));
  }

  addNode(type: PipelineNodeType, x: number, y: number): void {
    const node: PipelineNode = { id: uid(), type, x: Math.max(8, x), y: Math.max(8, y), enabled: true };
    this.nodes.update(list => [...list, node]);
    this.selected.set(node.id);
  }

  toggleNode(id: string): void {
    this.nodes.update(list => list.map(n => (n.id === id ? { ...n, enabled: !n.enabled } : n)));
  }

  deleteNode(id: string): void {
    this.nodes.update(list => list.filter(n => n.id !== id));
    this.edges.update(list => list.filter(e => e.from !== id && e.to !== id));
    if (this.connectFrom() === id) this.connectFrom.set(null);
    if (this.selected() === id) this.selected.set(null);
  }

  /* ---- Connections ---- */

  startConnect(id: string): void {
    if (this.connectFrom() === id) {
      this.connectFrom.set(null);
      this.mousePos.set(null);
      return;
    }
    this.connectFrom.set(id);
    this.selected.set(id);
    this.mousePos.set(null);
  }

  finishConnect(toId: string): void {
    const from = this.connectFrom();
    if (!from || from === toId) return;
    const dup = this.edges().some(e => e.from === from && e.to === toId);
    if (dup) {
      this.toast.info('Connection already exists');
      return;
    }
    this.edges.update(list => [...list, { id: uid(), from, to: toId }]);
    this.connectFrom.set(null);
    this.mousePos.set(null);
  }

  removeEdge(id: string): void {
    this.edges.update(list => list.filter(e => e.id !== id));
  }

  /* ---- Layout / lifecycle ---- */

  autoLayout(): void {
    this.nodes.update(list => {
      const sorted = [...list].sort((a, b) => typeIndex(a.type) - typeIndex(b.type));
      return sorted.map((n, i) => {
        const col = Math.floor(i / 4);
        const row = i % 4;
        return { ...n, x: 24 + col * (NODE_W + 64), y: 24 + row * (NODE_H + 56) };
      });
    });
  }

  clearAll(): void {
    if (confirm('Clear all nodes and connections?')) {
      this.nodes.set([]);
      this.edges.set([]);
      this.connectFrom.set(null);
      this.selected.set(null);
    }
  }

  newPipeline(): void {
    if (this.nodes().length && !confirm('Start a new pipeline? Unsaved changes will be lost.')) return;
    this.nodes.set([]);
    this.edges.set([]);
    this.name.set('');
    this.savedKey.set('');
    this.selected.set(null);
    this.connectFrom.set(null);
  }

  savePipeline(): void {
    const name = this.name().trim();
    if (!name) return;
    const saved = this.service.save(name, this.nodes(), this.edges());
    this.savedKey.set(saved.id);
    this.toast.success(`Pipeline "${saved.name}" saved`);
  }

  loadFrom(id: string): void {
    if (!id) return;
    const design = this.service.designs().find(d => d.id === id);
    if (!design) return;
    this.nodes.set(design.nodes.map(n => ({ ...n })));
    this.edges.set(design.edges.map(e => ({ ...e })));
    this.name.set(design.name);
    this.savedKey.set(design.id);
    this.selected.set(null);
    this.connectFrom.set(null);
    this.toast.info(`Loaded pipeline "${design.name}"`);
  }

  deleteSaved(): void {
    const id = this.savedKey();
    const design = this.service.designs().find(d => d.id === id);
    if (!design) return;
    if (confirm(`Delete saved pipeline "${design.name}"?`)) {
      this.service.remove(id);
      this.savedKey.set('');
      this.toast.info(`Pipeline "${design.name}" deleted`);
    }
  }
}

type PipelineEdgeSignal = import('./models/pipeline-designer.model').PipelineEdge;

function typeIndex(type: PipelineNodeType): number {
  return PIPELINE_NODE_TYPES.findIndex(t => t.key === type);
}