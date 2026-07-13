import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignTemplateService } from '../../services/campaign-template.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-template-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './template-list.component.html',
  styleUrl:    './template-list.component.css',
})
export class TemplateListComponent implements OnInit, OnDestroy {
  readonly svc  = inject(CampaignTemplateService);
  private readonly toast = inject(ToastService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaign-templates`;

  ngOnInit(): void { this.svc.getTemplates(); }
  ngOnDestroy(): void { this.svc.stopListening(); }

  async delete(id: string, name: string): Promise<void> {
    if (!confirm(`Delete the "${name}" template? This cannot be undone.`)) return;
    try {
      await this.svc.deleteTemplate(id);
      this.toast.success('Template deleted.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to delete template.');
    }
  }
}
