export interface VisionAnalysisResult {
  id?: string;
  productId?: string;
  imageUrls: string[];
  category: string;
  fabric: string;
  colour: string;
  sleeve: string;
  neck: string;
  fit: string;
  length: string;
  occasion: string;
  season: string;
  embroidery: string;
  print: string;
  mirrorWork: string;
  lace: string;
  buttons: string;
  pockets: string;
  bottom: string;
  dupatta: string;
  confidenceScore: number;
  rawResponse?: string;
  approved?: boolean;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_VISION_RESULT: VisionAnalysisResult = {
  imageUrls: [],
  category: '', fabric: '', colour: '', sleeve: '', neck: '', fit: '',
  length: '', occasion: '', season: '', embroidery: '', print: '',
  mirrorWork: '', lace: '', buttons: '', pockets: '', bottom: '',
  dupatta: '', confidenceScore: 0,
  createdAt: '', updatedAt: '',
};
