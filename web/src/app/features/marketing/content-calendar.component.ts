import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'Post' | 'Reel' | 'Story' | 'Draft';
  campaign: string;
  color: string;
  day: number;
}

@Component({
  selector: 'app-content-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cc-page">
      <div class="cc-header">
        <h1 class="cc-title">Content Calendar</h1>
        <p class="cc-desc">Drag and drop events between dates to reschedule.</p>
      </div>

      <div class="cc-legend">
        <span class="cc-legend-item"><span class="cc-dot cc-dot-post"></span> Post</span>
        <span class="cc-legend-item"><span class="cc-dot cc-dot-reel"></span> Reel</span>
        <span class="cc-legend-item"><span class="cc-dot cc-dot-story"></span> Story</span>
        <span class="cc-legend-item"><span class="cc-dot cc-dot-draft"></span> Draft</span>
      </div>

      <div class="cc-grid">
        <div class="cc-day-header" *ngFor="let day of days; let i = index">{{ day }}</div>

        @for (event of events(); track event.id) {
          <div class="cc-event" [style.background]="event.color" [style.gridColumn]="event.day" [draggable]="true" (dragstart)="onDragStart($event, event)">
            <span class="cc-event-type">{{ event.type }}</span>
            <span class="cc-event-title">{{ event.title }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './content-calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentCalendarComponent {
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  events = signal<CalendarEvent[]>([
    { id: '1', title: 'Summer Sale Post', type: 'Post', campaign: 'Summer Sale 2026', color: '#0c4a58', day: 1 },
    { id: '2', title: 'Wedding Reel', type: 'Reel', campaign: 'Wedding Collection', color: '#c9a54c', day: 2 },
    { id: '3', title: 'Festival Story', type: 'Story', campaign: 'Festival Special', color: '#22a34a', day: 3 },
    { id: '4', title: 'Office Wear Draft', type: 'Draft', campaign: '', color: '#6b7280', day: 4 },
    { id: '5', title: 'New Arrival Post', type: 'Post', campaign: 'New Arrival', color: '#0f6f84', day: 5 },
    { id: '6', title: 'Luxury Reel', type: 'Reel', campaign: 'Luxury Collection', color: '#c9a54c', day: 6 },
    { id: '7', title: 'Daily Wear Story', type: 'Story', campaign: 'Daily Wear', color: '#22a34a', day: 7 },
    { id: '8', title: 'Festival Sale Post', type: 'Post', campaign: 'Festival Sale', color: '#22a34a', day: 8 },
    { id: '9', title: 'Wedding Draft', type: 'Draft', campaign: '', color: '#6b7280', day: 9 },
    { id: '10', title: 'Summer Reel', type: 'Reel', campaign: 'Summer Sale 2026', color: '#0c4a58', day: 10 },
  ]);

  onDragStart(_event: DragEvent, _eventData: CalendarEvent): void {}
}