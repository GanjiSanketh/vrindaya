import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiPolicy } from '../../../../core/models/brand.model';
import { BrandService } from '../../../../core/services/brand.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector:        'app-policy-page',
  standalone:      true,
  imports:         [RouterLink],
  templateUrl:     './policy-page.component.html',
  styleUrl:        './policy-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyPageComponent implements OnInit, OnDestroy {
  private readonly route    = inject(ActivatedRoute);
  private readonly brandSvc = inject(BrandService);
  private readonly seo      = inject(SeoService);
  private paramSub!: Subscription;

  readonly policy  = signal<ApiPolicy | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  /** True once loaded and no matching policy was found — distinct from a network error. */
  readonly notFound = signal(false);

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe(params => {
      void this.load(params.get('slug') ?? '');
    });
  }

  ngOnDestroy(): void { this.paramSub.unsubscribe(); }

  async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    try {
      const brand = await this.brandSvc.getConfig();
      const policy = brand.policies.find(p => p.id === slug) ?? null;

      if (!policy) {
        this.policy.set(null);
        this.notFound.set(true);
        return;
      }

      this.policy.set(policy);
      this.seo.setPage({
        title: policy.title,
        description: policy.content.slice(0, 160),
        url: `/policies/${slug}`,
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this page.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load(this.route.snapshot.paramMap.get('slug') ?? '');
  }
}
