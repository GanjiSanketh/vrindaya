import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminAnalyticsService,
  type AnalyticsOverview,
  type ProductAnalyticsDetail,
  type TopProductAnalytics,
} from './admin-analytics.service';

describe('AdminAnalyticsService', () => {
  let svc: AdminAnalyticsService;
  let get: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    get = vi.fn();
    TestBed.configureTestingModule({
      providers: [AdminAnalyticsService, { provide: HttpClient, useValue: { get } }],
    });
    svc = TestBed.inject(AdminAnalyticsService);
  });

  it('fetches the dashboard overview from /analytics/overview', async () => {
    const overview: AnalyticsOverview = {
      totalDetailClicks: 10,
      totalFlipkartClicks: 4,
      todayDetailClicks: 2,
      todayFlipkartClicks: 1,
      totalProductsTracked: 3,
    };
    get.mockReturnValue(of(overview));

    await expect(svc.getOverview()).resolves.toEqual(overview);
    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/analytics/overview`);
  });

  it('fetches top products with the requested sort and limit', async () => {
    const rows: TopProductAnalytics[] = [];
    get.mockReturnValue(of(rows));

    await expect(svc.getTopProducts('flipkart', 5)).resolves.toEqual(rows);
    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/analytics/top`, {
      params: { sort: 'flipkart', limit: '5' },
    });
  });

  it('defaults to detail sort and limit 10', async () => {
    get.mockReturnValue(of([]));

    await svc.getTopProducts();

    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/analytics/top`, {
      params: { sort: 'detail', limit: '10' },
    });
  });

  it('fetches a product analytics detail by id', async () => {
    const detail: ProductAnalyticsDetail = {
      id: 'p1',
      name: 'Embroidered Kurta',
      image: null,
      totalDetailClicks: 7,
      totalFlipkartClicks: 2,
      lastClickedAt: null,
      daily: [],
    };
    get.mockReturnValue(of(detail));

    await expect(svc.getProductAnalytics('p1')).resolves.toEqual(detail);
    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/analytics/products/p1`);
  });
});
