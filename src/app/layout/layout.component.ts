import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

/**
 * Shell component wrapping all main-site routes.
 * Admin routes use their own minimal layout (no header/footer).
 *
 *   app.routes.ts
 *   └── LayoutComponent          ← this file
 *       ├── <app-header />
 *       ├── <router-outlet />    ← feature pages render here
 *       └── <app-footer />
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <router-outlet />
    <app-footer />
  `,
})
export class LayoutComponent {}
