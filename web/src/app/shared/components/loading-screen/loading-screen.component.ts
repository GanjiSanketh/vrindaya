import {
  Component, OnInit, signal, output, inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'vrindaya_visited';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  templateUrl: './loading-screen.component.html',
  styleUrl: './loading-screen.component.css',
})
export class LoadingScreenComponent implements OnInit {
  private readonly pid = inject(PLATFORM_ID);

  readonly letters  = ['V','R','I','N','D','A','Y','A'];
  readonly visible  = signal(false);
  readonly hiding   = signal(false);
  readonly done     = output<void>();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid)) return;

    // Show only once per browser session
    if (sessionStorage.getItem(STORAGE_KEY)) {
      this.done.emit();
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(true);

    setTimeout(() => this.dismiss(), 2600);
  }

  dismiss(): void {
    if (!this.visible() || this.hiding()) return;
    this.hiding.set(true);
    setTimeout(() => {
      this.visible.set(false);
      this.done.emit();
    }, 550);
  }
}
