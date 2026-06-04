import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Navbar }               from '../../components/navbar/navbar';
import { Hero }                 from '../../components/hero/hero';
import { Categories }           from '../../components/categories/categories';
// import { TrendingProducts }     from '../../components/trending-products/trending-products';
// import { VrindayaLook }         from '../../components/vrindaya-look/vrindaya-look';
// import { WhyVrindaya }          from '../../components/why-vrindaya/why-vrindaya';
import { CustomerLove }         from '../../components/customer-love/customer-love';
// import { InstagramCommunity }   from '../../components/instagram-community/instagram-community';
import { NewArrivals }          from '../../components/new-arrivals/new-arrivals';
import { NewArrivalsBanner }    from '../../components/new-arrivals-banner/new-arrivals-banner.component';
import { Footer }               from '../../components/footer/footer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    Navbar, Hero, NewArrivalsBanner, Categories,
    CustomerLove, NewArrivals, Footer,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private platformId = inject(PLATFORM_ID);
  readonly showScrollTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showScrollTop.set(window.scrollY > 600);
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
