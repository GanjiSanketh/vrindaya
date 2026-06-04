import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-new-arrivals-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './new-arrivals-banner.component.html',
  styleUrl: './new-arrivals-banner.component.css',
})
export class NewArrivalsBanner {}
