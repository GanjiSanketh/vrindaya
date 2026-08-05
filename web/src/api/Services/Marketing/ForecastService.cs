using System.Collections.Generic;
using Api.DTOs.Marketing;

namespace Api.Services.Marketing
{
    public class ForecastService
    {
        public DashboardResponse GetDashboard()
        {
            return new DashboardResponse
            {
                RevenueForecast = new RevenueForecast
                {
                    WeeklyForecast = 12000000,
                    MonthlyForecast = 48000000,
                    QuarterlyForecast = 142000000,
                },
                GrowthForecast = new GrowthForecast
                {
                    ExpectedRevenue = 185000000,
                    ExpectedGrowth = 24.8,
                },
                ConfidenceScore = new ConfidenceScore
                {
                    Score = 85,
                    ModelAccuracy = "85%",
                },
                TopRecommendations = new List<RecommendationCard>
                {
                    new RecommendationCard
                    {
                        Title = "Promote Best Seller",
                        Description = "Silk Anarkali Set has 94% sell-through rate. Boost visibility across Instagram and Facebook to capture festive demand.",
                        Priority = "high",
                        Impact = "+2300000",
                        Category = "Promotion",
                        Action = "Increase ad spend on top-performing products",
                        Confidence = 94,
                    },
                    new RecommendationCard
                    {
                        Title = "Generate Instagram Reel",
                        Description = "Create 3 Reels showcasing Banarasi Saree draping styles. AI predicts 180K+ views and 12% engagement rate.",
                        Priority = "high",
                        Impact = "+15000",
                        Category = "Content",
                        Action = "Schedule 3 Reels for this week",
                        Confidence = 88,
                    },
                    new RecommendationCard
                    {
                        Title = "Launch Weekend Offer",
                        Description = "Limited-time 20% off on Chikankari Sets. Target WhatsApp broadcast list of 45K opted-in customers.",
                        Priority = "medium",
                        Impact = "+850000",
                        Category = "Pricing",
                        Action = "Create weekend discount campaign",
                        Confidence = 76,
                    },
                    new RecommendationCard
                    {
                        Title = "Improve Product SEO",
                        Description = "Optimize 50+ product pages with long-tail keywords. Current organic traffic at 35K/month with 2.1% conversion.",
                        Priority = "medium",
                        Impact = "+40",
                        Category = "SEO",
                        Action = "Update meta tags and descriptions",
                        Confidence = 72,
                    },
                    new RecommendationCard
                    {
                        Title = "Send Email Campaign",
                        Description = "Drip campaign for cart abandoners. 3-email sequence with personalized product recommendations and 10% incentive.",
                        Priority = "low",
                        Impact = "+12",
                        Category = "Email",
                        Action = "Set up abandoned cart automation",
                        Confidence = 68,
                    },
                },
            };
        }

        public List<RecommendationCard> GenerateRecommendations()
        {
            return new List<RecommendationCard>
            {
                new RecommendationCard
                {
                    Title = "Promote Best Seller",
                    Description = "Silk Anarkali Set has 94% sell-through rate. Boost visibility across Instagram and Facebook to capture festive demand.",
                    Priority = "high",
                    Impact = "+2300000",
                    Category = "Promotion",
                    Action = "Increase ad spend on top-performing products",
                    Confidence = 94,
                },
                new RecommendationCard
                {
                    Title = "Generate Instagram Reel",
                    Description = "Create 3 Reels showcasing Banarasi Saree draping styles. AI predicts 180K+ views and 12% engagement rate.",
                    Priority = "high",
                    Impact = "+15000",
                    Category = "Content",
                    Action = "Schedule 3 Reels for this week",
                    Confidence = 88,
                },
                new RecommendationCard
                {
                    Title = "Launch Weekend Offer",
                    Description = "Limited-time 20% off on Chikankari Sets. Target WhatsApp broadcast list of 45K opted-in customers.",
                    Priority = "medium",
                    Impact = "+850000",
                    Category = "Pricing",
                    Action = "Create weekend discount campaign",
                    Confidence = 76,
                },
                new RecommendationCard
                {
                    Title = "Improve Product SEO",
                    Description = "Optimize 50+ product pages with long-tail keywords. Current organic traffic at 35K/month with 2.1% conversion.",
                    Priority = "medium",
                    Impact = "+40",
                    Category = "SEO",
                    Action = "Update meta tags and descriptions",
                    Confidence = 72,
                },
                new RecommendationCard
                {
                    Title = "Send Email Campaign",
                    Description = "Drip campaign for cart abandoners. 3-email sequence with personalized product recommendations and 10% incentive.",
                    Priority = "low",
                    Impact = "+12",
                    Category = "Email",
                    Action = "Set up abandoned cart automation",
                    Confidence = 68,
                },
            };
        }

        public List<TrendDataResponse> GetTrendAnalysis()
        {
            return new List<TrendDataResponse>
            {
                new TrendDataResponse
                {
                    Period = "Weekly",
                    Revenue = 12000000,
                    Orders = 3847,
                    Customers = 1250,
                    GrowthPercentage = 12.4,
                },
                new TrendDataResponse
                {
                    Period = "Monthly",
                    Revenue = 48000000,
                    Orders = 15200,
                    Customers = 4800,
                    GrowthPercentage = 18.7,
                },
                new TrendDataResponse
                {
                    Period = "Quarterly",
                    Revenue = 142000000,
                    Orders = 44000,
                    Customers = 13500,
                    GrowthPercentage = 22.3,
                },
            };
        }

        public List<ContentIdeaResponse> GenerateContentIdeas()
        {
            return new List<ContentIdeaResponse>
            {
                new ContentIdeaResponse
                {
                    Title = "Silk Anarkali Unboxing",
                    Description = "Showcase the hand-embroidered details of the Silk Anarkali Set in a 30-second reel.",
                    Platform = "Instagram",
                    ContentType = "Reel",
                    SuggestedCaption = "Handcrafted elegance for every occasion. #Vrindaya #SilkAnarkali #FestiveEdit",
                    SuggestedHashtags = "#vrindaya #silk #anarkali #handcrafted #festive #ethnicwear",
                    TargetAudience = "Women 25-40, festive shoppers",
                    Confidence = 92,
                },
                new ContentIdeaResponse
                {
                    Title = "Banarasi Draping Tutorial",
                    Description = "Create a step-by-step carousel showing 3 ways to drape the Banarasi Saree.",
                    Platform = "Instagram",
                    ContentType = "Carousel",
                    SuggestedCaption = "3 ways to style your Banarasi Saree. Which look is your favorite? #Vrindaya #Banarasi",
                    SuggestedHashtags = "#vrindaya #banarasi #saree #draping #tutorial #ethnicfashion",
                    TargetAudience = "Women 22-45, saree enthusiasts",
                    Confidence = 88,
                },
                new ContentIdeaResponse
                {
                    Title = "Chikankari Embroidery Close-Up",
                    Description = "Produce a short video highlighting the intricate Chikankari embroidery craftsmanship.",
                    Platform = "YouTube",
                    ContentType = "Short",
                    SuggestedCaption = "Every stitch tells a story. Discover the art of Chikankari. #Vrindaya #Chikankari",
                    SuggestedHashtags = "#vrindaya #chikankari #embroidery #craftsmanship #handmade #luxury",
                    TargetAudience = "Art lovers, premium fashion buyers",
                    Confidence = 85,
                },
                new ContentIdeaResponse
                {
                    Title = "Weekend Sale Announcement",
                    Description = "Design a punchy graphic card announcing the 20% off weekend special on Chikankari Sets.",
                    Platform = "WhatsApp",
                    ContentType = "Graphic",
                    SuggestedCaption = "Weekend Special! 20% off on Chikankari Sets. Limited stock. Tap to shop! #Vrindaya",
                    SuggestedHashtags = "#vrindaya #weekendsale #chikankari #discount #shopping #limitedoffer",
                    TargetAudience = "Existing customers, WhatsApp subscribers",
                    Confidence = 78,
                },
                new ContentIdeaResponse
                {
                    Title = "Customer Testimonial Reel",
                    Description = "Compile 5 customer testimonials into a 60-second reel showcasing real styling experiences.",
                    Platform = "Instagram",
                    ContentType = "Reel",
                    SuggestedCaption = "Real women, real stories. See how they style Vrindaya. #Vrindaya #RealStories",
                    SuggestedHashtags = "#vrindaya #testimonial #realwomen #styled #customerlove #ethnicwear",
                    TargetAudience = "Prospective buyers, social proof seekers",
                    Confidence = 81,
                },
            };
        }
    }
}