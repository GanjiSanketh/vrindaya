import { Component, ElementRef, viewChild, input, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export type ChartKind = 'line' | 'bar' | 'horizontalBar' | 'doughnut';

/** Same teal/gold/green/purple/red/amber/blue/pink palette already established by the dashboard's .stat-icon--* classes, extended for multi-slice charts. */
const PALETTE = ['#0f6f84', '#c9a54c', '#22a34a', '#9b4fe0', '#dc2626', '#b45309', '#2563eb', '#db2777'];

/**
 * Thin standalone wrapper around raw Chart.js — no ng2-charts, to avoid an
 * Angular-version-coupled dependency against a very new Angular major.
 * Owns its own Chart instance; re-creates it whenever labels/data change.
 */
@Component({
  selector:   'app-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      @if (labels().length === 0) {
        <div class="chart-empty">No data yet.</div>
      } @else {
        <canvas #canvas></canvas>
      }
    </div>
  `,
  styleUrl: './chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnDestroy {
  readonly type          = input<ChartKind>('bar');
  readonly labels        = input<string[]>([]);
  readonly data          = input<number[]>([]);
  readonly datasetLabel  = input<string>('');
  readonly color         = input<string>('#0f6f84');

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const labels = this.labels();
      const data = this.data();
      const canvasEl = this.canvasRef()?.nativeElement;
      if (!canvasEl || labels.length === 0) return;

      this.chart?.destroy();

      const kind = this.type();
      const isHorizontal = kind === 'horizontalBar';
      const isDoughnut = kind === 'doughnut';
      const chartJsType: 'line' | 'bar' | 'doughnut' = isHorizontal ? 'bar' : (kind as 'line' | 'bar' | 'doughnut');

      this.chart = new Chart(canvasEl, {
        type: chartJsType,
        data: {
          labels,
          datasets: [{
            label: this.datasetLabel(),
            data,
            backgroundColor: isDoughnut ? data.map((_, i) => PALETTE[i % PALETTE.length]) : this.color(),
            borderColor: this.color(),
            borderWidth: kind === 'line' ? 2 : 1,
            tension: 0.35,
            fill: kind === 'line',
          }],
        },
        options: {
          indexAxis: isHorizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: isDoughnut } },
          scales: isDoughnut ? {} : { y: { beginAtZero: true } },
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
