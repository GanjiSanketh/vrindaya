import {
  Component, HostListener, inject, OnInit, PLATFORM_ID, signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SOCIAL_LINKS } from '../../../core/constants/app.constants';

@Component({
  selector: 'app-floating-instagram',
  standalone: true,
  templateUrl: './floating-instagram.component.html',
  styleUrl:    './floating-instagram.component.css',
})
export class FloatingInstagramComponent implements OnInit {
  private readonly pid = inject(PLATFORM_ID);

  readonly instagramUrl = SOCIAL_LINKS.INSTAGRAM;
  readonly visible      = signal(true);

  private lastScrollY = 0;

  ngOnInit(): void {
    if (isPlatformBrowser(this.pid)) {
      this.lastScrollY = window.scrollY;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.pid)) return;
    const current = window.scrollY;
    this.visible.set(current < this.lastScrollY || current < 80);
    this.lastScrollY = current;
  }
}
