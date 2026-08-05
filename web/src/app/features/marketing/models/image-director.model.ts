export type ImageSettingKey =
  | 'camera'
  | 'lens'
  | 'lighting'
  | 'background'
  | 'pose'
  | 'props'
  | 'accessories'
  | 'model'
  | 'composition'
  | 'negativePrompt'
  | 'aspectRatio'
  | 'colorPalette'
  | 'imageStyle'
  | 'typography'
  | 'brandElements'
  | 'outputQuality';

export type ImageSettingType = 'select' | 'text' | 'textarea';

export interface ImageSettingDef {
  key: ImageSettingKey;
  label: string;
  icon: string;
  type: ImageSettingType;
  section: ImageSection;
  placeholder?: string;
  options?: string[];
}

export type ImageSection = 'Camera Setup' | 'Lighting & Background' | 'Subject' | 'Composition & Output' | 'Typography & Branding' | 'Output Quality';

export const IMAGE_SECTIONS: ImageSection[] = ['Camera Setup', 'Lighting & Background', 'Subject', 'Composition & Output', 'Typography & Branding', 'Output Quality'];

export const IMAGE_SETTINGS: ImageSettingDef[] = [
  { key: 'camera', label: 'Camera', icon: 'bi-camera', type: 'select', section: 'Camera Setup', options: ['Canon EOS R5', 'Sony A7 IV', 'Fujifilm GFX100', 'Hasselblad X2D', 'iPhone 15 Pro'] },
  { key: 'lens', label: 'Lens', icon: 'bi-aperture', type: 'select', section: 'Camera Setup', options: ['50mm f/1.2', '85mm f/1.4', '35mm f/1.8', '24-70mm f/2.8', 'Macro 100mm'] },
  { key: 'lighting', label: 'Lighting', icon: 'bi-brightness-high', type: 'select', section: 'Lighting & Background', options: ['Soft Daylight', 'Golden Hour', 'Studio Softbox', 'Rembrandt', 'Ring Light', 'Moody Low-light'] },
  { key: 'background', label: 'Background', icon: 'bi-image-alt', type: 'select', section: 'Lighting & Background', options: ['Studio White', 'Earth Tone Wall', 'Greenery', 'Urban Brick', 'Minimal Beige', 'Heritage Arch'] },
  { key: 'pose', label: 'Pose', icon: 'bi-person-standing', type: 'select', section: 'Subject', options: ['Standing Editorial', 'Sitting Graceful', 'Walking Candid', 'Twirling Detail', 'Close-up Portrait'] },
  { key: 'model', label: 'Model', icon: 'bi-person', type: 'select', section: 'Subject', options: ['South Asian Woman 25-35', 'Editorial Model', 'Curvy Model', 'No Model (Flat Lay)'] },
  { key: 'props', label: 'Props', icon: 'bi-box-seam', type: 'text', section: 'Subject', placeholder: 'e.g. brass tray, dried flowers' },
  { key: 'accessories', label: 'Accessories', icon: 'bi-gem', type: 'text', section: 'Subject', placeholder: 'e.g. jhumkas, potli bag, bangles' },
  { key: 'composition', label: 'Composition', icon: 'bi-grid-3x3', type: 'select', section: 'Composition & Output', options: ['Rule of Thirds', 'Center Symmetry', 'Leading Lines', 'Negative Space', 'Diptych'] },
  { key: 'aspectRatio', label: 'Aspect Ratio', icon: 'bi-aspect-ratio', type: 'select', section: 'Composition & Output', options: ['1:1 (Square)', '4:5 (Portrait)', '3:4 (Feed)', '9:16 (Story/Reel)', '16:9 (Landscape)'] },
  { key: 'colorPalette', label: 'Color Palette', icon: 'bi-palette2', type: 'select', section: 'Composition & Output', options: ['Earth Tones', 'Pastel', 'Jewel Tones', 'Monochrome Ivory', 'Deep Teal & Gold', 'Festival Vibrancy'] },
  { key: 'imageStyle', label: 'Image Style', icon: 'bi-stars', type: 'select', section: 'Composition & Output', options: ['Editorial Minimal', 'Lifestyle', 'Flat Lay', 'Studio Catalog', 'Cinematic', 'Heritage Editorial'] },
  { key: 'negativePrompt', label: 'Negative Prompt', icon: 'bi-slash-circle', type: 'textarea', section: 'Composition & Output', placeholder: 'What to avoid — e.g. distorted hands, cluttered background, oversaturated' },
  { key: 'typography', label: 'Typography', icon: 'bi-type', type: 'select', section: 'Typography & Branding', options: ['Cormorant Garamond / DM Sans', 'Playfair Display / Inter', 'Merriweather / Source Sans', 'Libre Baskerville / Lato', 'Custom Brand Font'] },
  { key: 'brandElements', label: 'Brand Elements', icon: 'bi-tag', type: 'text', section: 'Typography & Branding', placeholder: 'e.g. logo placement top-right, gold foil border, watermark opacity 10%' },
  { key: 'outputQuality', label: 'Output Quality', icon: 'bi-sliders', type: 'select', section: 'Output Quality', options: ['Standard (1024x1024)', 'High (2048x2048)', 'Ultra (4096x4096)', 'Print Ready (300 DPI)', 'Web Optimized (72 DPI)'] },
];

export type ImageDirectorSettings = Record<ImageSettingKey, string>;

export interface ImageDirectorPreset {
  id: string;
  name: string;
  favorite: boolean;
  settings: ImageDirectorSettings;
  createdAt: string;
  updatedAt: string;
}

export type ImageDirectorPresetDraft = Omit<ImageDirectorPreset, 'id' | 'createdAt' | 'updatedAt'>;

export function defaultSettings(): ImageDirectorSettings {
  return {
    camera: 'Canon EOS R5',
    lens: '85mm f/1.4',
    lighting: 'Soft Daylight',
    background: 'Minimal Beige',
    pose: 'Standing Editorial',
    props: 'brass tray, dried flowers',
    accessories: 'jhumkas, potli bag, bangles',
    model: 'South Asian Woman 25-35',
    composition: 'Rule of Thirds',
    negativePrompt: 'distorted hands, cluttered background, oversaturated colors, watermarks, text',
    aspectRatio: '4:5 (Portrait)',
    colorPalette: 'Earth Tones',
    imageStyle: 'Editorial Minimal',
    typography: 'Cormorant Garamond / DM Sans',
    brandElements: 'logo top-right, gold foil accent',
    outputQuality: 'High (2048x2048)',
  };
}