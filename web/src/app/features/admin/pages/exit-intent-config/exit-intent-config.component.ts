import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule }                        from '@angular/forms';
import { ExitIntentService, ExitIntentConfig } from '../../../../core/services/exit-intent.service';

@Component({
  selector: 'app-exit-intent-config',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './exit-intent-config.component.html',
  styleUrl:    './exit-intent-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitIntentConfigComponent implements OnInit {
  private readonly exitSvc = inject(ExitIntentService);

  readonly saved = signal(false);

  form: ExitIntentConfig = {
    enabled: true,
    title:   'Before You Go...',
    message: 'Explore our latest arrivals and best-selling ethnic collections.',
  };

  ngOnInit(): void {
    this.form = { ...this.exitSvc.config() };
  }

  save(): void {
    this.exitSvc.saveConfig({ ...this.form });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
