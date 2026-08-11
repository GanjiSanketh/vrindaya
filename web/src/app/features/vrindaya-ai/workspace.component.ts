import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { WorkspaceService } from './services/workspace.service';
import { Workspace, WorkspaceSummary, WorkspaceMessage } from './models/workspace.model';

interface SidebarItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly workspaces = signal<WorkspaceSummary[]>([]);
  readonly activeWorkspace = signal<Workspace | null>(null);
  readonly messages = signal<WorkspaceMessage[]>([]);
  readonly isThinking = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedModule = signal('');
  readonly messageInput = signal('');
  readonly sidebarItems = signal<SidebarItem[]>([
    { key: 'campaigns', label: 'Campaigns', icon: 'bi-megaphone' },
    { key: 'knowledge', label: 'Knowledge', icon: 'bi-lightbulb' },
    { key: 'brand', label: 'Brand', icon: 'bi-brush' },
    { key: 'memory', label: 'Memory', icon: 'bi-database' },
    { key: 'assets', label: 'Assets', icon: 'bi-file-earmark' },
    { key: 'templates', label: 'Templates', icon: 'bi-layout-text-window' },
    { key: 'providers', label: 'Providers', icon: 'bi-person-badge' },
    { key: 'history', label: 'History', icon: 'bi-clock-history' },
    { key: 'queue', label: 'Queue', icon: 'bi-list-task' },
    { key: 'settings', label: 'Settings', icon: 'bi-gear' },
  ]);

  readonly userId = signal('local-user');

  readonly hasActiveWorkspace = computed(() => this.activeWorkspace() !== null);
  readonly messageCount = computed(() => this.messages().length);
  readonly lastModule = computed(() => {
    const aiMessages = this.messages().filter(m => m.role === 'ai');
    return aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].module : 'None';
  });

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.workspaceService.list(this.userId()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: workspaces => {
        this.workspaces.set(workspaces);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load workspaces');
        this.isLoading.set(false);
      },
    });
  }

  createWorkspace(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.workspaceService.create({
      name: `Workspace ${new Date().toLocaleString()}`,
      userId: this.userId(),
      currentModule: this.selectedModule() || 'campaigns',
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: workspace => {
        this.activeWorkspace.set(workspace);
        this.messages.set(workspace.messages);
        this.workspaces.update(w => [this.toSummary(workspace), ...w]);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to create workspace');
        this.isLoading.set(false);
      },
    });
  }

  selectWorkspace(workspaceId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.workspaceService.get(workspaceId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: workspace => {
        this.activeWorkspace.set(workspace);
        this.messages.set(workspace.messages);
        this.selectedModule.set(workspace.currentModule);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load workspace');
        this.isLoading.set(false);
      },
    });
  }

  sendMessage(): void {
    const content = this.messageInput().trim();
    if (!content || !this.hasActiveWorkspace()) return;

    this.messageInput.set('');
    this.isThinking.set(true);

    const userMessage: WorkspaceMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      module: this.selectedModule(),
    };

    this.messages.update(msgs => [...msgs, userMessage]);

    const workspaceId = this.activeWorkspace()!.id;
    this.workspaceService.sendMessage(workspaceId, {
      content,
      context: { module: this.selectedModule() },
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: workspace => {
        this.activeWorkspace.set(workspace);
        this.messages.set(workspace.messages);
        this.isThinking.set(false);
      },
      error: () => {
        const errorMessage: WorkspaceMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: 'Failed to get AI response. Please try again.',
          createdAt: new Date().toISOString(),
          module: 'error',
        };
        this.messages.update(msgs => [...msgs, errorMessage]);
        this.isThinking.set(false);
      },
    });
  }

  archiveWorkspace(workspaceId: string): void {
    this.workspaceService.archive(workspaceId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.workspaces.update(w => w.filter(ws => ws.id !== workspaceId));
        if (this.activeWorkspace()?.id === workspaceId) {
          this.activeWorkspace.set(null);
          this.messages.set([]);
        }
      },
    });
  }

  deleteWorkspace(workspaceId: string): void {
    this.workspaceService.delete(workspaceId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.workspaces.update(w => w.filter(ws => ws.id !== workspaceId));
        if (this.activeWorkspace()?.id === workspaceId) {
          this.activeWorkspace.set(null);
          this.messages.set([]);
        }
      },
    });
  }

  onModuleSelect(moduleKey: string): void {
    this.selectedModule.set(moduleKey);
    if (this.hasActiveWorkspace()) {
      const workspaceId = this.activeWorkspace()!.id;
      this.workspaceService.updateContext(workspaceId, { module: moduleKey }).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: workspace => {
          this.activeWorkspace.set(workspace);
        },
      });
    }
  }

  onInputChange(value: string): void {
    this.messageInput.set(value);
  }

  private toSummary(workspace: Workspace): WorkspaceSummary {
    return {
      id: workspace.id,
      name: workspace.name,
      status: workspace.status,
      currentModule: workspace.currentModule,
      messageCount: workspace.messages.length,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }
}
