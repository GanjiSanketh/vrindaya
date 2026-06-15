import { Component, inject, afterNextRender } from '@angular/core';
import { RouterOutlet }                        from '@angular/router';

import { PopupComponent } from './components/popup/popup.component';
import { PopupService }   from './services/popup.service';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet, PopupComponent],
  template:   `<router-outlet /><app-popup />`,
})
export class App {
  private readonly popupService = inject(PopupService);

  constructor() {
    // afterNextRender only runs in the browser (never on SSR),
    // so no isPlatformBrowser guard is needed here.
    afterNextRender(() => {
      this.popupService.loadAndSchedule();
    });
  }
}
