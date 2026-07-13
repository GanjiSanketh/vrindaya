import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);

  iconFor(type: string): string {
    if (type === 'success') return 'bi-check-circle-fill';
    if (type === 'error')   return 'bi-exclamation-circle-fill';
    return 'bi-info-circle-fill';
  }
}
