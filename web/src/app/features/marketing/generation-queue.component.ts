import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface QueueItem {
  id: string;
  type: 'Post' | 'Reel' | 'Carousel' | 'Image';
  name: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed';
  progress: number;
  estimatedTime: string;
  createdAt: string;
  errorMessage: string;
}

@Component({
  selector: 'app-generation-queue',
  standalone: true,
  imports: [],
  template: `
    <div class="gq-page">
      <div class="gq-header">
        <h1 class="gq-title">Generation Queue</h1>
        <p class="gq-desc">Monitor and manage your content generation jobs.</p>
      </div>

      <div class="gq-stats">
        <div class="gq-stat">
          <span class="gq-stat-value">{{ queuedCount() }}</span>
          <span class="gq-stat-label">Queued</span>
        </div>
        <div class="gq-stat">
          <span class="gq-stat-value">{{ runningCount() }}</span>
          <span class="gq-stat-label">Running</span>
        </div>
        <div class="gq-stat">
          <span class="gq-stat-value">{{ completedCount() }}</span>
          <span class="gq-stat-label">Completed</span>
        </div>
        <div class="gq-stat">
          <span class="gq-stat-value">{{ failedCount() }}</span>
          <span class="gq-stat-label">Failed</span>
        </div>
      </div>

      <div class="gq-list">
        @for (item of queueItems(); track item.id) {
          <div class="gq-card" [class.gq-running]="item.status === 'Running'" [class.gq-completed]="item.status === 'Completed'" [class.gq-failed]="item.status === 'Failed'" [class.gq-queued]="item.status === 'Queued'">
            <div class="gq-card-header">
              <div class="gq-card-info">
                <span class="gq-card-type">{{ item.type }}</span>
                <span class="gq-card-name">{{ item.name }}</span>
              </div>
              <span class="gq-status-badge" [class.gq-status-queued]="item.status === 'Queued'" [class.gq-status-running]="item.status === 'Running'" [class.gq-status-completed]="item.status === 'Completed'" [class.gq-status-failed]="item.status === 'Failed'">
                {{ item.status }}
              </span>
            </div>

            <div class="gq-progress-bar">
              <div class="gq-progress-fill" [style.width.%]="item.progress"></div>
            </div>

            <div class="gq-card-footer">
              <div class="gq-card-meta">
                <span class="gq-meta-item">
                  <i class="bi bi-clock"></i> {{ item.estimatedTime }}
                </span>
                <span class="gq-meta-item">
                  <i class="bi bi-calendar3"></i> {{ item.createdAt }}
                </span>
              </div>
              <div class="gq-card-actions">
                @if (item.status === 'Running') {
                  <button class="gq-btn gq-btn-cancel" (click)="onCancel(item.id)">
                    <i class="bi bi-x-circle"></i> Cancel
                  </button>
                }
                @if (item.status === 'Failed') {
                  <button class="gq-btn gq-btn-retry" (click)="onRetry(item.id)">
                    <i class="bi bi-arrow-repeat"></i> Retry
                  </button>
                }
                @if (item.status === 'Queued') {
                  <button class="gq-btn gq-btn-cancel" (click)="onCancel(item.id)">
                    <i class="bi bi-x-circle"></i> Cancel
                  </button>
                }
                @if (item.status === 'Completed') {
                  <button class="gq-btn gq-btn-view" (click)="onView(item.id)">
                    <i class="bi bi-eye"></i> View
                  </button>
                }
              </div>
            </div>

            @if (item.status === 'Failed' && item.errorMessage) {
              <div class="gq-error">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>{{ item.errorMessage }}</span>
              </div>
            }
          </div>
        }
        @if (queueItems().length === 0) {
          <div class="gq-empty">
            <i class="bi bi-inbox"></i>
            <p>No jobs in the queue.</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './generation-queue.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationQueueComponent {
  queueItems = signal<QueueItem[]>([
    { id: '1', type: 'Post', name: 'Festival Sale Post', status: 'Completed', progress: 100, estimatedTime: '2 min', createdAt: '2026-08-02 10:15', errorMessage: '' },
    { id: '2', type: 'Reel', name: 'Summer Collection Reel', status: 'Running', progress: 65, estimatedTime: '1 min 20 sec', createdAt: '2026-08-02 10:30', errorMessage: '' },
    { id: '3', type: 'Carousel', name: 'Style Guide Carousel', status: 'Queued', progress: 0, estimatedTime: '3 min', createdAt: '2026-08-02 10:35', errorMessage: '' },
    { id: '4', type: 'Image', name: 'Product Hero Image', status: 'Failed', progress: 45, estimatedTime: '—', createdAt: '2026-08-02 10:20', errorMessage: 'Image generation timeout. Please try again.' },
    { id: '5', type: 'Post', name: 'Office Wear Post', status: 'Queued', progress: 0, estimatedTime: '2 min', createdAt: '2026-08-02 10:40', errorMessage: '' },
    { id: '6', type: 'Reel', name: 'Behind the Scenes Reel', status: 'Completed', progress: 100, estimatedTime: '4 min', createdAt: '2026-08-02 09:50', errorMessage: '' },
    { id: '7', type: 'Post', name: 'New Arrival Post', status: 'Failed', progress: 30, estimatedTime: '—', createdAt: '2026-08-02 09:45', errorMessage: 'API rate limit exceeded. Retry later.' },
  ]);

  queuedCount() {
    return this.queueItems().filter(i => i.status === 'Queued').length;
  }

  runningCount() {
    return this.queueItems().filter(i => i.status === 'Running').length;
  }

  completedCount() {
    return this.queueItems().filter(i => i.status === 'Completed').length;
  }

  failedCount() {
    return this.queueItems().filter(i => i.status === 'Failed').length;
  }

  onCancel(id: string): void {
    this.queueItems.update(items =>
      items.map(item =>
        item.id === id && item.status === 'Queued'
          ? { ...item, status: 'Failed', progress: 0, errorMessage: 'Cancelled by user.' }
          : item
      )
    );
  }

  onRetry(id: string): void {
    this.queueItems.update(items =>
      items.map(item =>
        item.id === id && item.status === 'Failed'
          ? { ...item, status: 'Queued', progress: 0, errorMessage: '' }
          : item
      )
    );
  }

  onView(_id: string): void {}
}