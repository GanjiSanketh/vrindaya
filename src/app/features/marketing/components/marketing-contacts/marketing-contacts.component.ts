import { Component, signal } from '@angular/core';
import { MarketingDashboardComponent } from '../marketing-dashboard/marketing-dashboard.component';
import { BulkImportComponent } from '../bulk-import/bulk-import.component';

type ContactsTab = 'subscribers' | 'bulk-import' | 'history';

@Component({
  selector:    'app-marketing-contacts',
  standalone:  true,
  imports:     [MarketingDashboardComponent, BulkImportComponent],
  templateUrl: './marketing-contacts.component.html',
  styleUrl:    './marketing-contacts.component.css',
})
export class MarketingContactsComponent {
  readonly activeTab = signal<ContactsTab>('subscribers');

  selectTab(tab: ContactsTab): void {
    this.activeTab.set(tab);
  }
}
