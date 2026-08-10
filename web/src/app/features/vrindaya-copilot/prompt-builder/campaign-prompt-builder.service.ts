import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CampaignPromptBuilder {
  BuildCampaignPrompt(data: any): string {
    return 'Building campaign prompt...';
  }

  BuildInstagramPrompt(data: any): string {
    const { productName, tone, productDescription, season, price } = data || {};
    
    const template = `
You are a VRINDAYA marketing assistant creating Instagram promotional content.

PRODUCT CONTEXT:
- Product Name: ${productName}
- Description: ${productDescription}
- Season: ${season || 'Festive'}
- Price: ₹${price}

TONE GUIDELINES:
${tone === 'luxury' ? '- Use sophisticated, luxurious language emphasizing exclusivity and premium craftsmanship' : 
  tone === 'trendy' ? '- Use energetic, contemporary language with modern slang and emoji usage' : 
  tone === 'heritage' ? '- Use traditional, cultural language highlighting heritage and legacy' : 
  '- Use balanced, professional language'}

INSTRUMENTS:
1. Create an engaging caption (maximum 125 characters for best engagement)
2. Generate 3 relevant hashtags (brand-specific)
3. Create a "shop the look" call-to-action with link in bio
4. Add cultural/emotional hook relevant to ${season || 'festive'} season

OUTPUT FORMAT:
Caption: [your caption here]
Hashtags: [#VRINDAYA, #${productName.toLowerCase().replace(/\s+/g, '')}, #FestiveEdit]
CallToAction: [link text here]
Hook: [emotional/cultural hook here]

Constraints:
- Keep caption under 125 characters
- Use 2-3 relevant emojis
- Make it sound natural and authentic
- Include ${season || 'festive'} keywords if available
- Reference VRINDAYA heritage if tone is heritage
    `;
    
    return template;
  }

  BuildWebsitePrompt(data: any): string {
    const { 
      productName, 
      tone, 
      productDescription, 
      season, 
      price,
      features = [],
      useCases = [],
      targetAudience
    } = data || {};
    
    const template = `
You are a VRINDAYA e-commerce SEO/content strategist creating comprehensive website marketing copy.

PRODUCT CONTEXT:
- Product Name: ${productName}
- Description: ${productDescription}
- Price: ₹${price}
- Season: ${season || 'Festive'}
- Target Audience: ${targetAudience}
- Features: ${features.join(', ')}
- Use Cases: ${useCases.join(', ')}

TONE GUIDELINES:
${tone === 'luxury' ? '- Use sophisticated language emphasizing craftsmanship, exclusivity, and heritage' : 
  tone === 'heritage' ? '- Use traditional, culturally rich language highlighting legacy and authenticity' : 
  tone === 'modern' ? '- Use contemporary, clean language focusing on functionality and trends' : 
  tone === 'minimalist' ? '- Use concise, elegant language focusing on purity and simplicity' : 
  '- Use balanced, professional language'}

CONTENT STRATEGY:
Generate comprehensive marketing content for the website including:

1. HERO SECTION:
   - Compelling headline (max 10 words)
   - Subheadline (2-3 sentences)
   - Primary CTA button text

2. FEATURES SECTION:
   - Each feature described with VRINDAYA quality language
   - Cultural relevance for ${season || 'festive'} season
   - Customer benefit-focused language

3. USE CASES SECTION:
   - Real-life scenarios where the product excels
   - Emotional connection with target audience

4. SEO OPTIMIZED:
   - Meta title (60 chars max)
   - Meta description (160 chars max)
   - Primary keywords: vrindaya, ${productName.toLowerCase().replace(/\s+/g, '')}, ethnic wear, handmade, festive
   - Semantic keywords: craftsmanship, heritage, traditional, luxury

5. TRUST ELEMENTS:
   - Authenticity messaging
   - Quality assurance
   - Customer testimonials placeholder

OUTPUT FORMAT:
HERO:
Headline: [your headline]
Subheadline: [your subheadline]
CTA: [button text]

FEATURES:
[Feature 1]: [description]
[Feature 2]: [description]

USE CASES:
[Use Case 1]: [scenario]
[Use Case 2]: [scenario]

SEO:
Title: [meta title]
Description: [meta description]

TRUST:
[authenticity point]
[quality point]

CONSTRAINTS:
- All copy must reflect VRINDAYA brand values
- Include seasonal relevance for ${season || 'festive'}
- Use tone-appropriate language
- Include cultural elements where relevant
- Keep paragraphs under 3 lines for readability
    `;
    
    return template;
  }

  BuildFlipkartPrompt(data: any): string {
    const { 
      productName, 
      tone, 
      productDescription, 
      season, 
      price,
      productSpecifications = [],
      discountInfo,
      returnPolicy
    } = data || {};
    
    const template = `
You are a VRINDAYA e-commerce specialist creating Flipkart-optimized product listings.

PRODUCT CONTEXT:
- Product Name: ${productName}
- Description: ${productDescription}
- Price: ₹${price}
- Season: ${season || 'Festive'}
- Specifications: ${productSpecifications.join(', ')}
- Discount Info: ${discountInfo}
- Return Policy: ${returnPolicy}

TONE GUIDELINES:
${tone === 'luxury' ? '- Use premium language emphasizing exclusivity, craftsmanship, and status' : 
  tone === 'heritage' ? '- Use culturally rich language highlighting tradition, authenticity, and legacy' : 
  tone === 'modern' ? '- Use contemporary language focusing on trends, style, and relevance' : 
  '- Use clear, benefit-driven language optimized for conversion'
}

FLIPKART OPTIMIZATION:

1. PRODUCT TITLE (Required):
   - Max 60 characters
   - Include keywords: VRINDAYA, ${productName.toLowerCase().replace(/\s+/g, '')}, ethnic wear
   - Include season: ${season || 'festive'}
   - Include material if relevant

2. HIGHLIGHTS SECTION:
   - Must have minimum 5 bullet points
   - Use power words: Premium, Exclusive, Authentic, Handmade, Heritage
   - Include cultural/religious symbols if seasonal: ${season === 'Diwali' ? '✨🎆' : season === 'Eid' ? '🎉🕌' : season === 'Christmas' ? '✨🎄' : '🎊'}
   - Emphasize VRINDAYA's unique value proposition

3. DESCRIPTION:
   - 250-500 characters optimal
   - HTML formatting allowed: <br>, <ul>, <li>
   - Include product dimensions, care instructions
   - Add comparison with traditional alternatives

4. SPECIFICATIONS:
   - Material composition
   - Workmanship details
   - Size/chart information
   - Care instructions

5. ADDITIONAL IMAGES:
   - Lifestyle shots with models
   - Close-up of detailing/craftsmanship
   - Packaging/unboxing

OUTPUT FORMAT:
TITLE:
[Optimized Flipkart title]

HIGHLIGHTS:
- [Highlight 1]
- [Highlight 2]
- [Highlight 3]
- [Highlight 4]
- [Highlight 5]

DESCRIPTION:
[Product description with HTML formatting]

SPECIFICATIONS:
[Key specifications]

CULTURAL RELEVANCE:
[${season || 'festive'}] ${productName} celebrations - perfect for ${season === 'Diwali' ? 'diwali parties and ceremonies' : season === 'Eid' ? 'eid gatherings and prayers' : season === 'Christmas' ? 'christmas celebrations' : 'festive occasions'}

CONVERSION ELEMENTS:
- Free shipping above ₹2,999
- Easy returns and COD available
- Limited stock - grab before it's gone!
- COD available for secure checkout

CONSTRAINTS:
- Must be Flipkart policy compliant
- Include all mandatory fields
- Use keyword-rich but not spammy language
- Optimize for mobile viewing
- Include trust signals prominently
    `;
    
    return template;
  }
}