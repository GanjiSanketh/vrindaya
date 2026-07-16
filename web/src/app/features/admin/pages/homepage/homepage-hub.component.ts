import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

interface HubCard {
  icon: string;
  title: string;
  desc: string;
  link: string;
}

@Component({
  selector:    'app-homepage-hub',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './homepage-hub.component.html',
  styleUrl:    './homepage-hub.component.css',
})
export class HomepageHubComponent {
  private readonly base = `/${APP_ROUTES.ADMIN}/homepage`;

  readonly cards: HubCard[] = [
    { icon: 'bi-images',        title: 'Hero Banners',        desc: 'Title, subtitle, CTA, images, scheduling.',            link: `${this.base}/hero-banners` },
    { icon: 'bi-megaphone',     title: 'Promotional Banners',  desc: 'Desktop/mobile images, CTA, active toggle.',           link: `${this.base}/promotional-banners` },
    { icon: 'bi-sliders',       title: 'Homepage Settings',    desc: 'Featured & Trending collections, New Arrivals, Announcement, Instagram, Footer Banner, SEO.', link: `${this.base}/settings` },
  ];
}
