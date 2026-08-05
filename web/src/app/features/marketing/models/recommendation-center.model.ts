export type RecommendationType =
  | 'content'
  | 'promotion'
  | 'campaign'
  | 'seo'
  | 'platform'
  | 'creative';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedReach: string;
  estimatedRevenue: string;
  timeframe: string;
  tags: string[];
  actionItems: string[];
  reasoning: string;
  dataPoints: { label: string; value: string }[];
  createdAt: string;
  dismissed: boolean;
}

export interface RecommendationFilter {
  types: RecommendationType[];
  priorities: RecommendationPriority[];
  search: string;
}

export const RECOMMENDATION_TYPES: { value: RecommendationType; label: string; icon: string; color: string }[] = [
  { value: 'content', label: 'Content', icon: 'bi-file-earmark-text', color: '#0f6f84' },
  { value: 'promotion', label: 'Promotion', icon: 'bi-tag', color: '#c9a54c' },
  { value: 'campaign', label: 'Campaign', icon: 'bi-megaphone', color: '#b91c1c' },
  { value: 'seo', label: 'SEO', icon: 'bi-search', color: '#7c3aed' },
  { value: 'platform', label: 'Platform', icon: 'bi-grid-1x2', color: '#059669' },
  { value: 'creative', label: 'Creative', icon: 'bi-palette', color: '#db2777' },
];

export const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#b91c1c', bg: '#fef2f2' },
  medium: { label: 'Medium', color: '#c9a54c', bg: '#fdf6e8' },
  low: { label: 'Low', color: '#0f6f84', bg: '#eef6f8' },
};

export function generateMockRecommendations(): Recommendation[] {
  const now = Date.now();
  const base = [
    {
      id: 'rec-1',
      title: 'Generate More Reels',
      description: 'Reels drive 3.2x more reach than static posts. Increase Reels frequency to 5/week focusing on product showcases and styling tips.',
      type: 'content' as RecommendationType,
      priority: 'high' as RecommendationPriority,
      impact: 'High reach & engagement boost',
      effort: 'medium' as const,
      estimatedReach: '+150K monthly',
      estimatedRevenue: '₹8-12L potential',
      timeframe: '2 weeks to implement',
      tags: ['Instagram', 'Reels', 'Organic Growth'],
      actionItems: [
        'Create Reels content calendar (15 concepts)',
        'Batch shoot 10 Reels in one session',
        'Set up trending audio monitoring',
        'Schedule 5 Reels/week for 4 weeks',
      ],
      reasoning: 'Analysis of last 90 days shows Reels average 45K views vs 14K for carousels. Competitors posting 7 Reels/week see 2.8x follower growth.',
      dataPoints: [
        { label: 'Current Reels/week', value: '2' },
        { label: 'Avg Reels Views', value: '45K' },
        { label: 'Avg Carousel Views', value: '14K' },
        { label: 'Competitor Frequency', value: '7/week' },
      ],
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-2',
      title: 'Promote Heritage Banarasi Saree',
      description: 'Top-performing product with 8.2% conversion rate. Allocate ₹50K ad spend to scale winning creative.',
      type: 'promotion' as RecommendationType,
      priority: 'high' as RecommendationPriority,
      impact: 'High revenue potential',
      effort: 'low' as const,
      estimatedReach: '+80K targeted',
      estimatedRevenue: '₹15-20L projected',
      timeframe: '1 week to launch',
      tags: ['Paid Ads', 'Best Seller', 'High Conversion'],
      actionItems: [
        'Duplicate winning ad creative (ID: AD-847)',
        'Increase daily budget to ₹7,000',
        'Target "Festival Shoppers" + "Luxury Buyers"',
        'Add UGC testimonial carousel',
      ],
      reasoning: 'Heritage Banarasi Saree (SKU: HBN-001) has 8.2% CVR vs 3.1% site average. Current ad spend only ₹15K/day with ROAS 5.2x. Scaling budget maintains efficiency.',
      dataPoints: [
        { label: 'Conversion Rate', value: '8.2%' },
        { label: 'Site Avg CVR', value: '3.1%' },
        { label: 'Current ROAS', value: '5.2x' },
        { label: 'Current Daily Spend', value: '₹15K' },
      ],
      createdAt: new Date(now - 86400000 * 5).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-3',
      title: 'Run Weekend Flash Sale',
      description: 'Weekend traffic spikes 40% but conversion drops. 48-hour flash sale with 20% off captures intent.',
      type: 'campaign' as RecommendationType,
      priority: 'high' as RecommendationPriority,
      impact: 'Revenue spike + new customer acquisition',
      effort: 'medium' as const,
      estimatedReach: '+200K impressions',
      estimatedRevenue: '₹25-35L in 48hrs',
      timeframe: '3 days to prepare',
      tags: ['Flash Sale', 'Weekend', 'Urgency'],
      actionItems: [
        'Select 30 SKUs with >60% margin',
        'Create countdown timer landing page',
        'Set up WhatsApp broadcast list (12K subs)',
        'Schedule 3x Story reminders/day',
        'Prepare abandoned cart email sequence',
      ],
      reasoning: 'Saturday/Sunday sessions 40% higher but CVR 2.1% vs 3.5% weekdays. Flash sales convert 3.8x baseline. Last flash sale: ₹28L in 48hrs, 1,200 orders, 35% new customers.',
      dataPoints: [
        { label: 'Weekend Traffic Lift', value: '+40%' },
        { label: 'Weekend CVR', value: '2.1%' },
        { label: 'Weekday CVR', value: '3.5%' },
        { label: 'Last Flash Sale Revenue', value: '₹28L' },
      ],
      createdAt: new Date(now - 86400000 * 1).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-4',
      title: 'Improve Product Page SEO',
      description: '12 high-traffic product pages missing schema markup, meta descriptions, and alt text. Fix to capture organic search demand.',
      type: 'seo' as RecommendationType,
      priority: 'medium' as RecommendationPriority,
      impact: 'Long-term organic traffic growth',
      effort: 'high' as const,
      estimatedReach: '+25K monthly organic',
      estimatedRevenue: '₹5-8L over 6 months',
      timeframe: '2-3 weeks',
      tags: ['SEO', 'Schema', 'Product Pages', 'Technical'],
      actionItems: [
        'Audit 12 priority pages with Screaming Frog',
        'Add Product schema markup (JSON-LD)',
        'Write unique meta titles (60 chars) & descriptions (155 chars)',
        'Add alt text to all product images',
        'Implement breadcrumb schema',
        'Submit updated sitemap to Search Console',
      ],
      reasoning: 'Top 12 product pages get 18K monthly searches but rank #8-15. Adding schema + optimized meta can move to #3-5. Competitors with schema capture 35% more organic clicks.',
      dataPoints: [
        { label: 'Priority Pages', value: '12' },
        { label: 'Monthly Search Volume', value: '18K' },
        { label: 'Current Avg Position', value: '11.2' },
        { label: 'Target Position', value: 'Top 5' },
      ],
      createdAt: new Date(now - 86400000 * 7).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-5',
      title: 'Generate Pinterest Pins',
      description: 'Pinterest drives 22% of referral traffic with 4.5x longer session duration. Create 50 pins/month for evergreen discovery.',
      type: 'platform' as RecommendationType,
      priority: 'medium' as RecommendationPriority,
      impact: 'Evergreen traffic & high-intent audience',
      effort: 'medium' as const,
      estimatedReach: '+40K monthly viewers',
      estimatedRevenue: '₹3-5L over 3 months',
      timeframe: '1 week setup, then ongoing',
      tags: ['Pinterest', 'Evergreen', 'Referral Traffic'],
      actionItems: [
        'Claim website & verify merchant account',
        'Create 5 boards: Sarees, Lehengas, Styling, Occasions, Fabrics',
        'Design 50 vertical pins (1000x1500) from existing assets',
        'Add rich pins with pricing & availability',
        'Schedule 3-5 pins/day via Tailwind',
        'Enable Pinterest Ads for top performers',
      ],
      reasoning: 'Pinterest referral sessions last 4:32 vs 1:12 Instagram. Users actively search for "wedding saree", "office kurta" - high purchase intent. Current presence: 12 pins, 0 boards.',
      dataPoints: [
        { label: 'Referral Traffic Share', value: '22%' },
        { label: 'Avg Session Duration', value: '4:32' },
        { label: 'Instagram Session', value: '1:12' },
        { label: 'Current Pins', value: '12' },
      ],
      createdAt: new Date(now - 86400000 * 3).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-6',
      title: 'Create Styling Carousels',
      description: 'Carousels with "3 ways to style" format get 2.4x saves. Produce weekly for each category to build saveable content library.',
      type: 'creative' as RecommendationType,
      priority: 'medium' as RecommendationPriority,
      impact: 'High saves = algorithm boost + UGC seed',
      effort: 'low' as const,
      estimatedReach: '+60K monthly',
      estimatedRevenue: 'Indirect (brand affinity)',
      timeframe: '1 week to start',
      tags: ['Carousel', 'Styling', 'Saves', 'Educational'],
      actionItems: [
        'Define 12 styling themes (office, festive, wedding, casual, etc.)',
        'Shoot flat-lays for 3 outfits per theme',
        'Design carousel template in Figma',
        'Publish 2 carousels/week (Tue/Thu)',
        'Add "Save for later" CTA on slide 1',
      ],
      reasoning: 'Carousel saves rate 4.8% vs 1.2% for single images. Saves signal quality to algorithm. Competitors with weekly styling carousels see 35% higher profile visits.',
      dataPoints: [
        { label: 'Carousel Save Rate', value: '4.8%' },
        { label: 'Single Image Save Rate', value: '1.2%' },
        { label: 'Save-to-Reach Multiplier', value: '2.4x' },
        { label: 'Competitor Frequency', value: '2/week' },
      ],
      createdAt: new Date(now - 86400000 * 4).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-7',
      title: 'Launch Office Wear Campaign',
      description: 'Working women segment growing 28% YoY. Dedicated 30-day campaign targeting office-appropriate ethnic wear.',
      type: 'campaign' as RecommendationType,
      priority: 'high' as RecommendationPriority,
      impact: 'New segment penetration + LTV increase',
      effort: 'high' as const,
      estimatedReach: '+500K targeted',
      estimatedRevenue: '₹40-60L over quarter',
      timeframe: '2 weeks to launch',
      tags: ['Office Wear', 'Working Women', 'New Segment', 'Q3'],
      actionItems: [
        'Curate 25-piece office wear edit (cotton, linen, chanderi)',
        'Shoot lookbook: 5 office outfits + transition to evening',
        'Partner with 10 micro-influencers (career/lifestyle)',
        'Create "9-to-9" Reel series (5 episodes)',
        'Launch WhatsApp "Office Style Guide" PDF',
        'Run LinkedIn ads targeting corporate women 25-40',
      ],
      reasoning: 'Working women segment: 28% YoY growth, ₹4,200 AOV vs ₹3,100 overall. No dedicated campaign yet. Survey: 68% want "comfortable yet polished" ethnic for office.',
      dataPoints: [
        { label: 'Segment Growth (YoY)', value: '28%' },
        { label: 'Segment AOV', value: '₹4,200' },
        { label: 'Overall AOV', value: '₹3,100' },
        { label: 'Survey Interest', value: '68%' },
      ],
      createdAt: new Date(now - 86400000 * 6).toISOString(),
      dismissed: false,
    },
    {
      id: 'rec-8',
      title: 'Optimize WhatsApp Broadcast Segments',
      description: 'Current broadcast list 12K but 65% never open. Segment by purchase history & engagement for 3x CTR.',
      type: 'platform' as RecommendationType,
      priority: 'medium' as RecommendationPriority,
      impact: 'Higher WhatsApp conversion & retention',
      effort: 'low' as const,
      estimatedReach: 'Same list, better engagement',
      estimatedRevenue: '₹10-15L incremental',
      timeframe: '3 days',
      tags: ['WhatsApp', 'Segmentation', 'Retention', 'CRM'],
      actionItems: [
        'Export WhatsApp contacts with tags',
        'Create segments: VIP (3+ orders), Active (1-2 orders), Dormant (0 orders, 90d)',
        'VIP: Early access + exclusive offers (2x/week)',
        'Active: New arrivals + styling tips (3x/week)',
        'Dormant: Win-back with 15% off (1x/week)',
        'Track open/click/revenue per segment',
      ],
      reasoning: 'Overall WhatsApp open rate 18%, CTR 2.1%. Segmented campaigns average 45% open, 6.8% CTR. Dormant segment 40% of list but 0 revenue. Win-back campaigns recover 12% of dormant.',
      dataPoints: [
        { label: 'Total Subscribers', value: '12K' },
        { label: 'Overall Open Rate', value: '18%' },
        { label: 'Overall CTR', value: '2.1%' },
        { label: 'Segmented Open Rate', value: '45%' },
      ],
      createdAt: new Date(now - 86400000 * 8).toISOString(),
      dismissed: false,
    },
  ];

  return base.map((r, i) => ({ ...r, id: `rec-${i + 1}` }));
}