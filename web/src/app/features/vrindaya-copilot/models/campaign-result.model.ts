export interface CarouselSlide {
  title?: string;
  content?: string;
}

export interface CampaignWarning {
  code?: string;
  message?: string;
  severity?: string;
}

export interface CampaignResult {
  caption?: string;
  hashtags?: string;
  reelScript?: string;
  carouselSlides?: CarouselSlide[];
  storyText?: string;
  imagePrompt?: string;
  negativePrompt?: string;
  coverText?: string;
  callToAction?: string;
  musicSuggestion?: string;
  postingTime?: string;
  platform?: string;
  language?: string;
  reviewScore?: number;
  warnings?: CampaignWarning[];
}