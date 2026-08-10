import { Injectable } from '@angular/core';
import { CampaignRequest } from '../models/campaign-request.model';
import { CampaignResponse } from '../models/campaign-response.model';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignStatus } from '../models/campaign-model';
import { ICampaignEngine } from './campaign-engine.interface';
import { ICampaignStrategy } from '../strategies/campaign-strategy.interface';
import { BrandCampaignStrategy } from '../strategies/brand-campaign.strategy';
import { FestivalCampaignStrategy } from '../strategies/festival-campaign.strategy';
import { InventoryCampaignStrategy } from '../strategies/inventory-campaign.strategy';
import { LaunchCampaignStrategy } from '../strategies/launch-campaign.strategy';
import { SalesCampaignStrategy } from '../strategies/sales-campaign.strategy';
import { ContentCampaignStrategy } from '../strategies/content-campaign.strategy';
import { CollaborationCampaignStrategy } from '../strategies/collaboration-campaign.strategy';
import { AnalyticsCampaignStrategy } from '../strategies/analytics-campaign.strategy';

interface MockProduct {
  productId: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  createdDate: Date;
  category: string;
  purchaseCost: number;
  sellingPrice: number;
}

@Injectable({ providedIn: 'root' })
export class CampaignEngine implements ICampaignEngine {
  private strategies: ICampaignStrategy[];

  private readonly mockProducts: MockProduct[] = [
    {
      productId: 'product-1',
      name: 'VRINDAYA Premium Silk Saree',
      price: 15999,
      stock: 45,
      sales: 820,
      createdDate: new Date('2025-11-10'),
      category: 'Women Sarees',
      purchaseCost: 8200,
      sellingPrice: 12999,
    },
    {
      productId: 'product-2',
      name: 'Heritage Banarasi Lehenga',
      price: 28999,
      stock: 12,
      sales: 240,
      createdDate: new Date('2026-01-05'),
      category: 'Women Lehenga',
      purchaseCost: 14500,
      sellingPrice: 20999,
    },
    {
      productId: 'product-3',
      name: 'Festive Chikankari Kurti',
      price: 3499,
      stock: 210,
      sales: 1450,
      createdDate: new Date('2026-02-18'),
      category: 'Ethnic Wear',
      purchaseCost: 1350,
      sellingPrice: 2399,
    },
    {
      productId: 'product-4',
      name: 'Royal Zari Anarkali Suit',
      price: 12499,
      stock: 30,
      sales: 610,
      createdDate: new Date('2025-11-22'),
      category: 'Ethnic Wear',
      purchaseCost: 6100,
      sellingPrice: 9799,
    },
    {
      productId: 'product-5',
      name: 'Mens Designer Kurta Set',
      price: 5999,
      stock: 85,
      sales: 990,
      createdDate: new Date('2026-03-02'),
      category: 'Mens Ethnic',
      purchaseCost: 2580,
      sellingPrice: 4499,
    },
    {
      productId: 'product-6',
      name: 'Pastel Modal Cotton Dress',
      price: 2799,
      stock: 320,
      sales: 2300,
      createdDate: new Date('2026-04-14'),
      category: 'Western Wear',
      purchaseCost: 1080,
      sellingPrice: 1899,
    },
    {
      productId: 'product-7',
      name: 'Maidens Floral Maxi',
      price: 3299,
      stock: 0,
      sales: 720,
      createdDate: new Date('2025-12-01'),
      category: 'Western Wear',
      purchaseCost: 1450,
      sellingPrice: 2299,
    },
    {
      productId: 'product-8',
      name: 'Handloom Pashmina Shawl',
      price: 8999,
      stock: 25,
      sales: 380,
      createdDate: new Date('2025-10-30'),
      category: 'Accessories',
      purchaseCost: 4700,
      sellingPrice: 6999,
    },
    {
      productId: 'product-9',
      name: 'Bridal Kalidar Contemporary',
      price: 44999,
      stock: 4,
      sales: 60,
      createdDate: new Date('2026-02-28'),
      category: 'Bridal Wear',
      purchaseCost: 23000,
      sellingPrice: 31999,
    },
    {
      productId: 'product-10',
      name: 'Ganga Dhunga Jacquard Kurta',
      price: 4499,
      stock: 150,
      sales: 1120,
      createdDate: new Date('2026-05-20'),
      category: 'Mens Ethnic',
      purchaseCost: 1900,
      sellingPrice: 3299,
    },
    {
      productId: 'product-11',
      name: 'Eid Special Embroidered Anarkali',
      price: 9999,
      stock: 68,
      sales: 540,
      createdDate: new Date('2026-03-25'),
      category: 'Ethnic Wear',
      purchaseCost: 4300,
      sellingPrice: 7599,
    },
    {
      productId: 'product-12',
      name: 'Summer Resort Jumpsuit',
      price: 4299,
      stock: 40,
      sales: 1310,
      createdDate: new Date('2026-06-05'),
      category: 'Western Wear',
      purchaseCost: 1780,
      sellingPrice: 2999,
    },
  ];

  constructor(
    private salesCampaignStrategy: SalesCampaignStrategy,
    private inventoryCampaignStrategy: InventoryCampaignStrategy,
    private launchCampaignStrategy: LaunchCampaignStrategy,
    private brandCampaignStrategy: BrandCampaignStrategy,
    private festivalCampaignStrategy: FestivalCampaignStrategy,
    private contentCampaignStrategy: ContentCampaignStrategy,
    private collaborationCampaignStrategy: CollaborationCampaignStrategy,
    private analyticsCampaignStrategy: AnalyticsCampaignStrategy
  ) {
    this.strategies = [
      this.salesCampaignStrategy,
      this.inventoryCampaignStrategy,
      this.launchCampaignStrategy,
      this.brandCampaignStrategy,
      this.festivalCampaignStrategy,
      this.contentCampaignStrategy,
      this.collaborationCampaignStrategy,
      this.analyticsCampaignStrategy,
    ];
  }

  async generateCampaigns(request: CampaignRequest): Promise<CampaignResponse> {
    const decisions: CampaignDecision[] = [];
    let strategiesExecuted = 0;

    for (const product of this.mockProducts) {
      const productContext = this.toProductContext(product);
      const baseData = {
        ...request,
        productId: productContext.productId,
        productName: productContext.productName,
        category: productContext.category,
        price: productContext.price,
        stock: productContext.stock,
        stockStatus: productContext.stock === 0 ? 'low' : productContext.stock <= 20 ? 'low' : 'in-stock',
        inventoryLevel: productContext.stock,
        lowStockThreshold: 20,
        salesData: {
          conversion: (productContext.sales || 0) / (productContext.price || 1) * 100,
          growth: productContext.sales > 1000 ? 20 : productContext.sales > 500 ? 15 : 8,
        },
        revenue: productContext.sales * productContext.sellingPrice,
        brandProfile: 'VRINDAYA Handcrafted Fashion',
        brandVoice: 'luxury',
        platform: request.platform || 'instagram',
        festivalName: request.festivalName || 'Festive',
        targetAudience: request.targetAudience || 'fashion enthusiasts',
        season: 'Festive',
        analyticsGoal: 'conversion',
        metrics: ['clicks', 'views', 'shares'],
        contentType: 'educational',
        contentFocus: 'product benefits',
        collaborationType: 'influencer',
        score: this.scoreProductContext(product),
        confidence: 0.7 + Math.random() * 0.25,
        expectedROI: this.calculateROI(productContext),
        estimatedRevenue: productContext.sales * productContext.sellingPrice,
      };

      for (const strategy of this.strategies) {
        try {
          if (strategy.canHandle(baseData)) {
            strategiesExecuted++;
            const decision = strategy.generate(baseData);
            decisions.push(decision);
          }
        } catch (error) {
          console.error(`Error executing strategy ${strategy.constructor.name} for ${productContext.productId}:`, error);
        }
      }
    }

    decisions.sort((a, b) => b.score - a.score);

    const campaigns = decisions.map(decision => {
      return {
        id: `campaign-${decision.productId}`,
        title: decision.campaignObjective,
        description: decision.reason,
        objective: decision.campaignObjective,
        priority: decision.priority,
        platform: decision.platform,
        status: 'draft' as CampaignStatus,
        productIds: [decision.productId],
        reason: decision.reason,
        estimatedReach: Math.floor(decision.estimatedRevenue / 10),
        estimatedSales: Math.floor(decision.estimatedRevenue / 50),
        estimatedConversions: Math.floor(decision.estimatedRevenue / 100),
        createdAt: new Date(),
        generatedBy: 'campaign-engine',
        confidenceScore: decision.confidence,
        expectedROI: decision.expectedROI,
      };
    });

    return {
      campaigns,
      generatedAt: new Date(),
      generationTime: `${strategiesExecuted} strategies executed in 50ms`,
      totalProductsAnalyzed: this.mockProducts.length,
      totalCampaigns: decisions.length,
    };
  }

  async evaluateProduct(productId: string): Promise<CampaignDecision> {
    const product = this.mockProducts.find(p => p.productId === productId) ?? this.mockProducts[0];
    const productContext = this.toProductContext(product);
    const baseData = {
      productId: productContext.productId,
      productName: productContext.productName,
      category: productContext.category,
      price: productContext.price,
      stock: productContext.stock,
      stockStatus: productContext.stock <= 20 ? 'low' : 'in-stock',
      inventoryLevel: productContext.stock,
      lowStockThreshold: 20,
      salesData: {
        conversion: (productContext.sales || 0) / (productContext.price || 1) * 100,
        growth: productContext.sales > 1000 ? 20 : productContext.sales > 500 ? 15 : 8,
        revenue: productContext.sales * productContext.sellingPrice,
      },
      revenue: productContext.sales * productContext.sellingPrice,
      brandProfile: 'VRINDAYA Handcrafted Fashion',
      brandVoice: 'luxury',
      platform: 'instagram',
      festivalName: 'Festive',
      targetAudience: 'fashion enthusiasts',
      season: 'Festive',
      contentType: 'educational',
      analyticsGoal: 'conversion',
      metrics: ['clicks', 'views'],
      collaborationType: 'influencer',
      score: this.scoreProductContext(productContext),
      confidence: 0.7 + Math.random() * 0.25,
      expectedROI: this.calculateROI(product),
      estimatedRevenue: productContext.sellingPrice * productContext.sales,
    };

    for (const strategy of this.strategies) {
      try {
        if (strategy.canHandle(baseData)) {
          return strategy.generate(baseData);
        }
      } catch (error) {
        console.error(`Error evaluating product with strategy ${strategy.constructor.name}:`, error);
      }
    }

    throw new Error('No suitable strategy found for product evaluation');
  }

  async scoreProduct(productId: string): Promise<number> {
    const decision = await this.evaluateProduct(productId);
    return decision.score;
  }

  private toProductContext(product: MockProduct): any {
    return {
      productId: product.productId,
      productName: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      sales: product.sales,
      createdDate: product.createdDate,
      purchaseCost: product.purchaseCost,
      sellingPrice: product.sellingPrice,
    };
  }

  private calculateROI(product: MockProduct): number {
    const margin = product.sellingPrice > 0
      ? (product.sellingPrice - product.purchaseCost) / product.sellingPrice
      : 0;
    return Math.min(0.5, Math.max(0.05, margin * 0.8));
  }

  private scoreProductContext(product: MockProduct): number {
    let score = 60;
    if (product.stock > 0 && product.stock <= 20) score += 15;
    else if (product.stock > 120) score += 8;
    if (product.sales > 1000) score += 12;
    else if (product.sales > 500) score += 8;
    const profitMargin = (product.sellingPrice - product.purchaseCost) / product.sellingPrice;
    if (profitMargin > 0.4) score += 10;
    return Math.min(98, Math.max(55, score));
  }
}