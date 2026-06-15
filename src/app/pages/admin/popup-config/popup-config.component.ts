import { Component, inject, OnInit }         from '@angular/core';
import { FormBuilder, ReactiveFormsModule,
         Validators }                          from '@angular/forms';
import { HttpClient }                          from '@angular/common/http';
import { RouterLink }                          from '@angular/router';
import { DecimalPipe }                         from '@angular/common';
import { catchError, of }                      from 'rxjs';

import { PopupService } from '../../../services/popup.service';
import { PopupConfig }  from '../../../models/popup.model';
import { Product }      from '../../../models/product.model';

@Component({
  selector:    'app-popup-config',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './popup-config.component.html',
  styleUrl:    './popup-config.component.css',
})
export class PopupConfigComponent implements OnInit {
  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(PopupService);
  private readonly http = inject(HttpClient);

  products: Product[] = [];
  saveSuccess = false;
  resetSuccess = false;
  configPreview = '';

  form = this.fb.group({
    enabled:            [true],
    productId:          [11, [Validators.required]],
    title:              ['New Arrival',       [Validators.required, Validators.maxLength(60)]],
    subtitle:           ['Limited Time Offer',[Validators.required, Validators.maxLength(80)]],
    showDelay:          [3000, [Validators.required, Validators.min(0), Validators.max(30000)]],
    showOncePerSession: [true],
  });

  ngOnInit(): void {
    this.products = this.svc.allProducts;
    this.loadCurrentConfig();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const config: PopupConfig = {
      enabled:            !!this.form.value.enabled,
      productId:          Number(this.form.value.productId),
      title:              this.form.value.title!,
      subtitle:           this.form.value.subtitle!,
      showDelay:          Number(this.form.value.showDelay),
      showOncePerSession: !!this.form.value.showOncePerSession,
    };

    this.svc.saveConfig(config);
    this.configPreview = JSON.stringify(config, null, 2);
    this.saveSuccess   = true;
    setTimeout(() => (this.saveSuccess = false), 3500);
  }

  resetToFile(): void {
    this.svc.resetToFile();
    this.configPreview = '';
    this.loadCurrentConfig();
    this.resetSuccess  = true;
    setTimeout(() => (this.resetSuccess = false), 3500);
  }

  getSelectedProduct(): Product | undefined {
    const id = Number(this.form.value.productId);
    return this.products.find(p => p.id === id);
  }

  private loadCurrentConfig(): void {
    const local = this.svc.getLocalConfig();
    if (local) {
      this.form.patchValue(local);
      return;
    }
    this.http
      .get<PopupConfig>('assets/config/popup-config.json')
      .pipe(catchError(() => of(null)))
      .subscribe(cfg => { if (cfg) this.form.patchValue(cfg); });
  }
}
