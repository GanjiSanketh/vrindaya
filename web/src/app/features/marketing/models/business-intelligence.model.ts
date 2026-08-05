export type InsightCategory =
  | 'sales-decline'
  | 'trending-category'
  | 'promotion-candidate'
  | 'campaign-opportunity'
  | 'general';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface Insight {
  id: string;
  question: string;
  answer: string;
  category: InsightCategory;
  severity: InsightSeverity;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  dataPoints: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
  recommendations: string[];
  relatedMetrics: string[];
  generatedAt: string;
}

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  previousValue: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
}

export interface ProductPerformance {
  sku: string;
  name: string;
  category: string;
  revenue: number;
  orders: number;
  conversionRate: number;
  roas: number;
  inventory: number;
  recommendation: 'promote' | 'maintain' | 'discount' | 'discontinue';
}

export const INSIGHT_CATEGORIES: { value: InsightCategory; label: string; icon: string; color: string }[] = [
  { value: 'sales-decline', label: 'Sales Decline', icon: 'bi-graph-down-arrow', color: '#b91c1c' },
  { value: 'trending-category', label: 'Trending Category', icon: 'bi-trending-up', color: '#059669' },
  { value: 'promotion-candidate', label: 'Promotion Candidate', icon: 'bi-star', color: '#c9a54c' },
  { value: 'campaign-opportunity', label: 'Campaign Opportunity', icon: 'bi-megaphone', color: '#7c3aed' },
  { value: 'general', label: 'General Insight', icon: 'bi-lightbulb', color: '#0f6f84' },
];

export function generateMockInsights(): Insight[] {
  const now = Date.now();
  return [
    {
      id: 'ins-1',
      question: 'Why are sales decreasing?',
      answer: 'Sales dropped 18% MoM primarily due to post-festival seasonality (-12%) and reduced ad spend (-6%). Weekend flash sale in Week 2 partially offset the decline.',
      category: 'sales-decline',
      severity: 'critical',
      confidence: 92,
      impact: 'high',
      dataPoints: [
        { label: 'Current Month Revenue', value: '₹2.1Cr', trend: 'down' },
        { label: 'Previous Month Revenue', value: '₹2.56Cr', trend: 'neutral' },
        { label: 'MoM Change', value: '-18%', trend: 'down' },
        { label: 'Seasonality Impact', value: '-12%', trend: 'down' },
        { label: 'Ad Spend Reduction', value: '-6%', trend: 'down' },
        { label: 'Flash Sale Contribution', value: '+2.3%', trend: 'up' },
      ],
      recommendations: [
        'Launch 15-day "New Season Collection" campaign to bridge seasonal gap',
        'Increase ad spend by 20% on top-performing creatives',
        'Activate WhatsApp win-back flow for dormant customers',
        'Introduce limited-time "Early Bird" offer for spring collection',
      ],
      relatedMetrics: ['Revenue', 'Ad Spend', 'Conversion Rate', 'AOV', 'New vs Returning'],
      generatedAt: new Date(now - 3600000).toISOString(),
    },
    {
      id: 'ins-2',
      question: 'Which category is trending?',
      answer: 'Office Wear (Kurtas & Suits) is the fastest-growing category at +34% MoM, driven by return-to-office trends and new cotton/linen arrivals. Sarees declining -8% post-festival.',
      category: 'trending-category',
      severity: 'success',
      confidence: 88,
      impact: 'high',
      dataPoints: [
        { label: 'Office Wear Growth', value: '+34%', trend: 'up' },
        { label: 'Office Wear Revenue', value: '₹68L', trend: 'up' },
        { label: 'Cotton/Linen Share', value: '62%', trend: 'up' },
        { label: 'Sarees MoM', value: '-8%', trend: 'down' },
        { label: 'Lehengas MoM', value: '-15%', trend: 'down' },
        { label: 'Accessories MoM', value: '+12%', trend: 'up' },
      ],
      recommendations: [
        'Double ad budget for Office Wear category',
        'Launch "9-to-9 Styling" content series',
        'Expand cotton/linen inventory by 40%',
        'Partner with 10 career/lifestyle influencers',
      ],
      relatedMetrics: ['Category Revenue', 'Growth Rate', 'Inventory Turn', 'New Customer %'],
      generatedAt: new Date(now - 7200000).toISOString(),
    },
    {
      id: 'ins-3',
      question: 'Which product should be promoted?',
      answer: 'Chanderi Cotton Kurta Set (SKU: CCK-042) — 6.8% CVR, 5.4x ROAS, 94% sell-through. High demand, low competition, perfect for Office Wear push.',
      category: 'promotion-candidate',
      severity: 'info',
      confidence: 95,
      impact: 'high',
      dataPoints: [
        { label: 'Conversion Rate', value: '6.8%', trend: 'up' },
        { label: 'Site Avg CVR', value: '3.1%', trend: 'neutral' },
        { label: 'ROAS', value: '5.4x', trend: 'up' },
        { label: 'Sell-Through Rate', value: '94%', trend: 'up' },
        { label: 'Avg Order Value', value: '₹3,850', trend: 'up' },
        { label: 'Inventory Remaining', value: '187 units', trend: 'neutral' },
      ],
      recommendations: [
        'Allocate ₹40K/day ad budget to this SKU',
        'Feature in "Office Wear Edit" landing page',
        'Create 3 Reels showing office-to-evening styling',
        'Add to WhatsApp VIP early access',
      ],
      relatedMetrics: ['CVR', 'ROAS', 'Sell-Through', 'AOV', 'Inventory'],
      generatedAt: new Date(now - 10800000).toISOString(),
    },
    {
      id: 'ins-4',
      question: 'What campaign should be launched?',
      answer: '30-day "Spring Office Edit" campaign targeting Working Women 25-35. Projected ₹45-60L revenue, 4.2x ROAS. Leverage cotton/linen trend + return-to-office momentum.',
      category: 'campaign-opportunity',
      severity: 'success',
      confidence: 85,
      impact: 'high',
      dataPoints: [
        { label: 'Projected Revenue', value: '₹45-60L', trend: 'up' },
        { label: 'Target ROAS', value: '4.2x', trend: 'up' },
        { label: 'Target Audience Size', value: '2.4M', trend: 'neutral' },
        { label: 'Budget Required', value: '₹12L', trend: 'neutral' },
        { label: 'Duration', value: '30 days', trend: 'neutral' },
        { label: 'Expected New Customers', value: '1,800', trend: 'up' },
      ],
      recommendations: [
        'Launch Week 1: Teaser + influencer seeding (15 micro-influencers)',
        'Launch Week 2: Lookbook Reel + WhatsApp catalog drop',
        'Launch Week 3: UGC contest "My Office Look" + ₹50K prize',
        'Launch Week 4: Retargeting + "Last Chance" urgency',
      ],
      relatedMetrics: ['Campaign Revenue', 'ROAS', 'CAC', 'New Customers', 'Engagement'],
      generatedAt: new Date(now - 14400000).toISOString(),
    },
    {
      id: 'ins-5',
      question: 'Why is cart abandonment high?',
      answer: 'Cart abandonment at 72% (vs 68% industry). Top reasons: shipping costs shown late (34%), no guest checkout (28%), slow page load on mobile (18%).',
      category: 'general',
      severity: 'warning',
      confidence: 90,
      impact: 'medium',
      dataPoints: [
        { label: 'Cart Abandonment Rate', value: '72%', trend: 'up' },
        { label: 'Industry Benchmark', value: '68%', trend: 'neutral' },
        { label: 'Shipping Cost Surprise', value: '34%', trend: 'neutral' },
        { label: 'No Guest Checkout', value: '28%', trend: 'neutral' },
        { label: 'Mobile Page Speed', value: '18%', trend: 'down' },
        { label: 'Recovery Email Open Rate', value: '38%', trend: 'up' },
      ],
      recommendations: [
        'Show estimated shipping on product page',
        'Enable guest checkout option',
        'Optimize mobile checkout (target <3s load)',
        'Add 2nd recovery email with 10% incentive',
      ],
      relatedMetrics: ['Abandonment Rate', 'Checkout Completion', 'Mobile Speed', 'Recovery Revenue'],
      generatedAt: new Date(now - 18000000).toISOString(),
    },
    {
      id: 'ins-6',
      question: 'Which channel drives best LTV?',
      answer: 'Email-driven customers have 2.3x higher LTV (₹18,400) vs paid social (₹7,900). Organic search 2nd at ₹14,200. Invest in email capture & nurture.',
      category: 'general',
      severity: 'info',
      confidence: 87,
      impact: 'medium',
      dataPoints: [
        { label: 'Email LTV', value: '₹18,400', trend: 'up' },
        { label: 'Organic Search LTV', value: '₹14,200', trend: 'neutral' },
        { label: 'Paid Social LTV', value: '₹7,900', trend: 'down' },
        { label: 'WhatsApp LTV', value: '₹11,600', trend: 'up' },
        { label: 'Direct LTV', value: '₹15,800', trend: 'neutral' },
        { label: 'Avg Orders/Customer (Email)', value: '4.2', trend: 'up' },
      ],
      recommendations: [
        'Increase email capture popups + lead magnets',
        'Launch post-purchase nurture sequence (5 emails)',
        'Segment WhatsApp by LTV tier',
        'Reduce paid social prospecting budget by 15%',
      ],
      relatedMetrics: ['LTV by Channel', 'Repeat Rate', 'Email Capture Rate', 'Nurture Revenue'],
      generatedAt: new Date(now - 21600000).toISOString(),
    },
  ];
}

export function generateKPIs(): KPIMetric[] {
  return [
    { id: 'kpi-1', label: 'Total Revenue', value: '₹2.1Cr', previousValue: '₹2.56Cr', change: -18, trend: 'down', unit: 'INR', status: 'critical' },
    { id: 'kpi-2', label: 'Orders', value: '4,820', previousValue: '5,640', change: -14.5, trend: 'down', unit: 'count', status: 'warning' },
    { id: 'kpi-3', label: 'Avg Order Value', value: '₹4,350', previousValue: '₹4,540', change: -4.2, trend: 'down', unit: 'INR', status: 'warning' },
    { id: 'kpi-4', label: 'Conversion Rate', value: '2.8%', previousValue: '3.1%', change: -9.7, trend: 'down', unit: '%', status: 'warning' },
    { id: 'kpi-5', label: 'New Customers', value: '1,240', previousValue: '1,480', change: -16.2, trend: 'down', unit: 'count', status: 'warning' },
    { id: 'kpi-6', label: 'Returning Customer %', value: '38%', previousValue: '35%', change: 8.6, trend: 'up', unit: '%', status: 'good' },
    { id: 'kpi-7', label: 'Ad Spend', value: '₹38L', previousValue: '₹45L', change: -15.6, trend: 'down', unit: 'INR', status: 'good' },
    { id: 'kpi-8', label: 'Blended ROAS', value: '4.1x', previousValue: '3.8x', change: 7.9, trend: 'up', unit: 'ratio', status: 'good' },
    { id: 'kpi-9', label: 'Email Revenue', value: '₹28L', previousValue: '₹24L', change: 16.7, trend: 'up', unit: 'INR', status: 'good' },
    { id: 'kpi-10', label: 'WhatsApp Revenue', value: '₹15L', previousValue: '₹12L', change: 25, trend: 'up', unit: 'INR', status: 'good' },
  ];
}

export function generateCategoryPerformance(): CategoryPerformance[] {
  return [
    { category: 'Office Wear (Kurtas/Suits)', revenue: 6800000, orders: 1840, avgOrderValue: 3695, conversionRate: 4.2, trend: 'up', trendValue: 34 },
    { category: 'Sarees', revenue: 5200000, orders: 1120, avgOrderValue: 4642, conversionRate: 2.8, trend: 'down', trendValue: -8 },
    { category: 'Lehengas', revenue: 3100000, orders: 380, avgOrderValue: 8157, conversionRate: 1.9, trend: 'down', trendValue: -15 },
    { category: 'Dupattas', revenue: 1800000, orders: 950, avgOrderValue: 1894, conversionRate: 3.5, trend: 'neutral', trendValue: 2 },
    { category: 'Accessories', revenue: 1400000, orders: 1200, avgOrderValue: 1166, conversionRate: 4.1, trend: 'up', trendValue: 12 },
    { category: 'Blouses', revenue: 900000, orders: 680, avgOrderValue: 1323, conversionRate: 3.8, trend: 'up', trendValue: 8 },
  ];
}

export function generateProductPerformance(): ProductPerformance[] {
  return [
    { sku: 'CCK-042', name: 'Chanderi Cotton Kurta Set', category: 'Office Wear', revenue: 720000, orders: 187, conversionRate: 6.8, roas: 5.4, inventory: 187, recommendation: 'promote' },
    { sku: 'LSK-018', name: 'Linen Saree - Earth Tones', category: 'Sarees', revenue: 580000, orders: 124, conversionRate: 4.2, roas: 4.1, inventory: 89, recommendation: 'promote' },
    { sku: 'OCK-009', name: 'Organic Cotton Kurta', category: 'Office Wear', revenue: 450000, orders: 156, conversionRate: 5.1, roas: 4.8, inventory: 234, recommendation: 'promote' },
    { sku: 'BSL-033', name: 'Banarasi Silk Lehenga', category: 'Lehengas', revenue: 890000, orders: 42, conversionRate: 2.1, roas: 3.2, inventory: 15, recommendation: 'maintain' },
    { sku: 'PDP-007', name: 'Pearl Drop Earrings', category: 'Accessories', revenue: 320000, orders: 280, conversionRate: 4.8, roas: 5.1, inventory: 45, recommendation: 'promote' },
    { sku: 'VLS-012', name: 'Velvet Lehenga - Maroon', category: 'Lehengas', revenue: 180000, orders: 18, conversionRate: 1.2, roas: 1.8, inventory: 34, recommendation: 'discount' },
    { sku: 'HBL-005', name: 'Heavy Banarasi Saree', category: 'Sarees', revenue: 95000, orders: 8, conversionRate: 0.8, roas: 1.2, inventory: 67, recommendation: 'discontinue' },
  ];
}

export function generateRevenueTrend(): ChartDataPoint[] {
  return [
    { label: 'Week 1', value: 5200000, category: 'revenue' },
    { label: 'Week 2', value: 6100000, category: 'revenue' },
    { label: 'Week 3', value: 4800000, category: 'revenue' },
    { label: 'Week 4', value: 4900000, category: 'revenue' },
  ];
}

export function generateChannelPerformance(): ChartDataPoint[] {
  return [
    { label: 'Email', value: 2800000, category: 'revenue' },
    { label: 'Organic Search', value: 2100000, category: 'revenue' },
    { label: 'Paid Social', value: 1800000, category: 'revenue' },
    { label: 'Direct', value: 1500000, category: 'revenue' },
    { label: 'WhatsApp', value: 1500000, category: 'revenue' },
    { label: 'Referral', value: 900000, category: 'revenue' },
  ];
}