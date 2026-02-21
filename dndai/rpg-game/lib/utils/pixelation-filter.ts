/**
 * Pixelation filter utilities for applying 2D pixel art effects to images
 */

/**
 * Simple pixelation: Downscale then upscale with no smoothing
 * Fast and preserves original colors
 */
export function applySimplePixelation(
  sourceCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pixelSize: number = 4
): void {
  // Create temporary canvas at reduced resolution
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  const scaledWidth = Math.max(1, Math.floor(width / pixelSize));
  const scaledHeight = Math.max(1, Math.floor(height / pixelSize));

  tempCanvas.width = scaledWidth;
  tempCanvas.height = scaledHeight;

  // Draw source canvas scaled down to temp canvas (source already has image at full size)
  tempCtx.drawImage(sourceCanvas, 0, 0, width, height, 0, 0, scaledWidth, scaledHeight);

  // Disable image smoothing for pixelated upscale
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.imageSmoothingQuality = 'low';

  // Draw temp canvas scaled up to target position
  targetCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, x, y, width, height);

  // Re-enable smoothing for other operations
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
}

/**
 * Generate a limited 8-bit color palette (256 colors)
 * Uses a balanced distribution across RGB space
 */
function generate8BitPalette(): number[][] {
  const palette: number[][] = [];
  
  // Generate 6x6x6 = 216 colors (web-safe colors)
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette.push([
          Math.floor((r * 255) / 5),
          Math.floor((g * 255) / 5),
          Math.floor((b * 255) / 5)
        ]);
      }
    }
  }
  
  // Add 40 grayscale values for better monochrome support
  for (let i = 0; i < 40; i++) {
    const gray = Math.floor((i * 255) / 39);
    palette.push([gray, gray, gray]);
  }
  
  return palette;
}

/**
 * Find the closest color in the palette using Euclidean distance
 */
function findClosestColor(r: number, g: number, b: number, palette: number[][]): number[] {
  let minDistance = Infinity;
  let closestColor = palette[0];

  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const distance = dr * dr + dg * dg + db * db;

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

/**
 * 8-bit style pixelation: Color quantization with limited palette
 * Creates authentic retro pixel art look
 */
export function apply8BitPixelation(
  sourceCanvas: HTMLCanvasElement,
  targetCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pixelSize: number = 6
): void {
  // Create temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  // Draw source canvas to temp canvas (source already has image at full size)
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCtx.drawImage(sourceCanvas, 0, 0, width, height, 0, 0, width, height);

  // Get image data
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const palette = generate8BitPalette();

  // Process pixels in blocks
  for (let blockY = 0; blockY < height; blockY += pixelSize) {
    for (let blockX = 0; blockX < width; blockX += pixelSize) {
      // Calculate average color for this pixel block
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let py = 0; py < pixelSize && blockY + py < height; py++) {
        for (let px = 0; px < pixelSize && blockX + px < width; px++) {
          const idx = ((blockY + py) * width + (blockX + px)) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          count++;
        }
      }

      if (count > 0) {
        const avgR = Math.floor(totalR / count);
        const avgG = Math.floor(totalG / count);
        const avgB = Math.floor(totalB / count);

        // Find closest color in palette
        const [r, g, b] = findClosestColor(avgR, avgG, avgB, palette);

        // Apply color to entire pixel block
        for (let py = 0; py < pixelSize && blockY + py < height; py++) {
          for (let px = 0; px < pixelSize && blockX + px < width; px++) {
            const idx = ((blockY + py) * width + (blockX + px)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            // Keep alpha channel unchanged
          }
        }
      }
    }
  }

  // Put processed image data back
  tempCtx.putImageData(imageData, 0, 0);

  // Disable smoothing for pixelated look
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.imageSmoothingQuality = 'low';

  // Draw processed image to target
  targetCtx.drawImage(tempCanvas, 0, 0, width, height, x, y, width, height);

  // Re-enable smoothing
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
}

