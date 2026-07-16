import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandConfig } from '../../core/models/brand.model';
import { BrandService } from '../../core/services/brand.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent implements OnInit {
  private readonly brandSvc = inject(BrandService);

  readonly currentYear = new Date().getFullYear();
  readonly brand = signal<BrandConfig | null>(null);

  ngOnInit(): void {
    // Best-effort — the footer renders its static nav either way; brand
    // content (social links/policies/copyright) simply doesn't appear if
    // this fails, rather than breaking every page's footer.
    void this.brandSvc.getConfig().then(b => this.brand.set(b)).catch(() => {});
  }
}
