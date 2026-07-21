export interface HeroConfig {
  frames: {
    count: number;
    path: string;
    ext: string;
    getUrl: (index: number) => string;
  };
  scale: {
    start: number;
    end: number;
  };
  pinDuration: number;
  parallaxSpeed: number;
  lightSweepSpeed: number;
  floatingDistance: number;
  fadeDuration: number;
  mobile: {
    frames: number;
    scale: { start: number; end: number };
    pinDuration: number;
  };
  tablet: {
    pinDuration: number;
  };
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

export const HERO_CONFIG: HeroConfig = {
  frames: {
    count: 36,
    path: 'assets/hero-sequence/frame',
    ext: '.webp',
    getUrl: (i: number) => `assets/hero-sequence/frame${pad(i)}.webp`,
  },
  scale: {
    start: 1.35,
    end: 1.0,
  },
  pinDuration: 300,
  parallaxSpeed: 0.3,
  lightSweepSpeed: 0.5,
  floatingDistance: 4,
  fadeDuration: 0.8,
  mobile: {
    frames: 18,
    scale: { start: 1.2, end: 1.0 },
    pinDuration: 200,
  },
  tablet: {
    pinDuration: 250,
  },
};
