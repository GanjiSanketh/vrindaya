import { Component } from '@angular/core';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-trust-bar',
  imports: [ScrollRevealDirective],
  templateUrl: './trust-bar.html',
  styleUrl: './trust-bar.css',
})
export class TrustBar {}
