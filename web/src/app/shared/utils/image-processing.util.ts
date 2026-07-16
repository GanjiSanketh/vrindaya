/**
 * Client-side image processing for every admin upload flow (Product
 * gallery today; Hero Banners/Promotional Banners/Categories/Brand images
 * are meant to reuse this unchanged — see the exported constants/functions
 * below, none of which know anything about "products"). Resizes to a
 * max width, converts to WebP, and iteratively re-encodes at a lower
 * quality until the result is at or under the target ceiling — all via
 * the browser's own Canvas/Image decoding APIs, no server round trip
 * needed before the user sees a preview.
 */

/** Hard ceiling enforced before any processing starts — rejects clearly-too-large uploads fast, without ever decoding them. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Formats accepted as input. The *output* is always WebP regardless of input format. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const DEFAULT_MAX_WIDTH = 1600;
export const DEFAULT_WEBP_QUALITY = 0.85;

/** Informational only (surfaced in the UI) — going below this isn't treated as a failure, since a genuinely simple/small source image can legitimately compress smaller without any quality loss. */
export const TARGET_MIN_BYTES = 150 * 1024;
/** Enforced — re-encoded at progressively lower quality (down to MIN_QUALITY) until the result fits, or that floor is reached. */
export const TARGET_MAX_BYTES = 350 * 1024;

const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;
const MAX_QUALITY_ATTEMPTS = 5;

export interface ImageProcessingOptions {
  maxWidth?: number;
  quality?: number;
  targetMaxBytes?: number;
}

export interface ProcessedImage {
  /** The re-encoded WebP file, ready to upload as-is. */
  blob: Blob;
  /** Object URL for <img [src]> preview — caller owns it and must URL.revokeObjectURL() when the preview is no longer shown. */
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/** Thrown for a file the browser can't decode as an image at all — the "corrupted image" case callers should catch and surface per-file, not let abort the whole batch. */
export class CorruptImageError extends Error {
  constructor(fileName: string) {
    super(`"${fileName}" could not be read as an image. It may be corrupted or in an unsupported format.`);
  }
}

/** Validates format/size only — no decoding yet, so this is effectively instant and safe to run before even attempting to process a large batch. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Image is too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`;
  }
  return null;
}

/**
 * Resizes (longest edge capped at maxWidth, never upscaled), converts to
 * WebP, and compresses toward targetMaxBytes. Runs entirely on the
 * browser's decode/encode pipeline (createImageBitmap + canvas), which is
 * asynchronous by nature — this never blocks the main thread the way a
 * synchronous pixel-loop would.
 */
export async function processImageForUpload(file: File, options: ImageProcessingOptions = {}): Promise<ProcessedImage> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const startQuality = options.quality ?? DEFAULT_WEBP_QUALITY;
  const targetMaxBytes = options.targetMaxBytes ?? TARGET_MAX_BYTES;

  const bitmap = await decodeImage(file);

  try {
    const { width, height } = targetDimensions(bitmap.width, bitmap.height, maxWidth);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not process image — canvas 2D context unavailable.');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await encodeWithSizeTarget(canvas, startQuality, targetMaxBytes);

    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      width,
      height,
      sizeBytes: blob.size,
    };
  } finally {
    bitmap.close();
  }
}

/** Human-readable "123 KB" / "1.2 MB" for the preview UI. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new CorruptImageError(file.name);
  }
}

function targetDimensions(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height }; // never upscale
  }
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

async function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Could not encode image as WebP.'))),
      'image/webp',
      quality,
    );
  });
}

/** Re-encodes at progressively lower quality until the blob fits targetMaxBytes or MIN_QUALITY is reached — whichever comes first (a floor, not a guarantee every image can be squeezed under the ceiling without visible degradation). */
async function encodeWithSizeTarget(canvas: HTMLCanvasElement, startQuality: number, targetMaxBytes: number): Promise<Blob> {
  let quality = startQuality;
  let blob = await encodeWebp(canvas, quality);

  for (let attempt = 0; attempt < MAX_QUALITY_ATTEMPTS && blob.size > targetMaxBytes && quality > MIN_QUALITY; attempt++) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await encodeWebp(canvas, quality);
  }

  return blob;
}
