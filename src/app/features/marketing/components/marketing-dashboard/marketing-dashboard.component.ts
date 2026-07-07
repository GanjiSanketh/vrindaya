import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MarketingService } from '../../services/marketing.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector:    'app-marketing-dashboard',
  standalone:  true,
  imports:     [],
  templateUrl: './marketing-dashboard.component.html',
  styleUrl:    './marketing-dashboard.component.css',
})
export class MarketingDashboardComponent implements OnInit, OnDestroy {
  readonly marketing = inject(MarketingService);
  private readonly toast = inject(ToastService);

  ngOnInit(): void { this.marketing.getSubscribers(); }
  ngOnDestroy(): void { this.marketing.stopListening(); }

  async delete(mobileNumber: string): Promise<void> {
    if (!confirm(`Remove ${mobileNumber} from the VIP Club subscriber list?`)) return;

    try {
      await this.marketing.deleteSubscriber(mobileNumber);
      this.toast.success('Subscriber removed.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to delete subscriber. Please try again.');
    }
  }

  export(): void {
    if (this.marketing.subscribers().length === 0) {
      this.toast.info('There are no subscribers to export yet.');
      return;
    }
    this.marketing.exportSubscribers();
  }
}
