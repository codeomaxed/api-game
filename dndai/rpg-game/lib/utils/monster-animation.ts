/**
 * Monster Breathing Animation Utility
 * Ports the Python breathing animation logic to TypeScript for client-side animation
 */

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface CharacterSection {
  image: HTMLImageElement;
  canvas: HTMLCanvasElement;
  yOffset: number;
  cropOffset: number;
  amplitude: number;
  phaseOffset: number;
}

export interface CharacterSections {
  headChest: CharacterSection;
  torso: CharacterSection;
  pelvis: CharacterSection;
}

/**
 * Find the bounding box of non-transparent pixels in an image
 */
export function findCharacterBounds(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): Bounds | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Set canvas size to match image
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  // Draw image to canvas
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let foundPixels = false;

  // Find bounds of non-transparent pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > 0) {
        foundPixels = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!foundPixels) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Segment character into sections for breathing animation
 * Uses proportional divisions that work for any character size
 */
export function segmentCharacter(
  img: HTMLImageElement,
  bounds: Bounds,
  canvas: HTMLCanvasElement
): CharacterSections | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const characterWidth = bounds.width;
  const characterHeight = bounds.height;
  const overlap = 12; // Overlap to prevent gaps during movement

  // Natural boundaries (proportional divisions)
  // Head+Chest combined: 0% - 45%
  const headChestEndNatural = Math.floor(characterHeight * 0.45);
  const torsoStartNatural = Math.floor(characterHeight * 0.45);
  const torsoEndNatural = Math.floor(characterHeight * 0.65);
  const pelvisStartNatural = Math.floor(characterHeight * 0.65);
  const pelvisEndNatural = characterHeight;

  // Crop boundaries (with overlap)
  const headChestEndCrop = headChestEndNatural + overlap;
  const torsoStartCrop = Math.max(0, torsoStartNatural - overlap);
  const torsoEndCrop = torsoEndNatural + overlap;
  const pelvisStartCrop = Math.max(0, pelvisStartNatural - overlap);

  // Create character canvas (cropped to bounds)
  const characterCanvas = document.createElement('canvas');
  characterCanvas.width = characterWidth;
  characterCanvas.height = characterHeight;
  const characterCtx = characterCanvas.getContext('2d');
  if (!characterCtx) return null;

  // Draw character region to character canvas
  characterCtx.drawImage(
    img,
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
    0,
    0,
    characterWidth,
    characterHeight
  );

  // Helper to create section canvas from character canvas
  const createSectionCanvas = (
    sourceY: number,
    width: number,
    height: number
  ): HTMLCanvasElement => {
    const sectionCanvas = document.createElement('canvas');
    sectionCanvas.width = width;
    sectionCanvas.height = height;
    const sectionCtx = sectionCanvas.getContext('2d');
    if (!sectionCtx) return sectionCanvas;

    // Draw section from character canvas
    sectionCtx.drawImage(
      characterCanvas,
      0,
      sourceY,
      width,
      height,
      0,
      0,
      width,
      height
    );

    return sectionCanvas;
  };

  // Create section canvases
  // Head+Chest combined: 0% - 45%
  const headChestCanvas = createSectionCanvas(0, characterWidth, headChestEndCrop);
  const torsoCanvas = createSectionCanvas(
    torsoStartCrop,
    characterWidth,
    torsoEndCrop - torsoStartCrop
  );
  const pelvisCanvas = createSectionCanvas(
    pelvisStartCrop,
    characterWidth,
    pelvisEndNatural - pelvisStartCrop
  );

  // Create image elements for compatibility (not strictly needed, but kept for interface)
  const headChestImg = new Image();
  headChestImg.src = headChestCanvas.toDataURL();
  const torsoImg = new Image();
  torsoImg.src = torsoCanvas.toDataURL();
  const pelvisImg = new Image();
  pelvisImg.src = pelvisCanvas.toDataURL();

  return {
    headChest: {
      image: headChestImg,
      canvas: headChestCanvas,
      yOffset: 0,
      cropOffset: 0,
      amplitude: 4.0, // Visible chest expansion for realistic breathing
      phaseOffset: 0.0, // No delay - leads the wave
    },
    torso: {
      image: torsoImg,
      canvas: torsoCanvas,
      yOffset: torsoStartNatural,
      cropOffset: overlap,
      amplitude: 3.0, // Better proportion for natural breathing
      phaseOffset: 0.005, // Very small delay - almost in sync with headChest
    },
    pelvis: {
      image: pelvisImg,
      canvas: pelvisCanvas,
      yOffset: pelvisStartNatural,
      cropOffset: overlap,
      amplitude: 0.1, // Very subtle movement
      phaseOffset: 0.01, // Small delay - follows torso closely
    },
  };
}

/**
 * Create a single frame of the breathing animation
 * @param sections - Character sections to animate
 * @param frame - Current frame number
 * @param totalFrames - Total frames in animation cycle
 * @param bounds - Character bounds within the full image
 * @param fullImageWidth - Full image width (not just character bounds)
 * @param fullImageHeight - Full image height (not just character bounds)
 * @param targetCanvas - Canvas to draw to (should be full image size)
 */
export function createBreathingFrame(
  sections: CharacterSections,
  frame: number,
  totalFrames: number,
  bounds: Bounds,
  fullImageWidth: number,
  fullImageHeight: number,
  targetCanvas: HTMLCanvasElement
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size to full image dimensions
  targetCanvas.width = fullImageWidth;
  targetCanvas.height = fullImageHeight;

  // Clear canvas (transparent)
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  // Calculate base phase (0 to 2π) - smooth continuous cycle
  // Frame is already normalized via modulo in animate() function
  // This ensures perfect continuity: frame 0 = phase 0, frame totalFrames-1 ≈ phase 2π
  const basePhase = (2 * Math.PI * frame) / totalFrames;

  // Process sections from bottom to top (pelvis, torso, headChest)
  // This order ensures proper layering when drawing
  const sectionOrder: Array<keyof CharacterSections> = ['pelvis', 'torso', 'headChest'];

  for (const sectionName of sectionOrder) {
    const section = sections[sectionName];
    if (!section) continue;

    // Calculate phase with offset - creates subtle wave propagation
    // ADD offset so sections with larger offsets lag slightly behind
    // This creates: headChest (0) → torso (0.005) → pelvis (0.01) on way down
    // And: pelvis (0.01) → torso (0.005) → headChest (0) on way back up
    // Small offsets keep all sections moving at nearly the same speed
    let phase = basePhase + (section.phaseOffset * 2 * Math.PI);
    
    // Normalize phase to [0, 2π) range for perfect continuity
    // More efficient modulo operation ensures seamless wrapping
    phase = ((phase % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Use smooth sine wave for natural breathing motion
    // Sine wave: starts at 0, goes up to 1 (peak), down to -1 (trough), back to 0
    // This creates perfect up-then-down motion that loops seamlessly
    const breathingFactor = Math.sin(phase);

    // Apply subtle easing for more natural motion
    // Uses power curve for more natural deceleration at extremes
    const easedFactor = breathingFactor * (1 - 0.1 * Math.pow(Math.abs(breathingFactor), 1.2));

    // Calculate vertical offset with sub-pixel precision for smooth animation
    const yOffset = easedFactor * section.amplitude;
    
    // Position within character bounds (relative to character top-left)
    // Sub-pixel positioning ensures smooth, fluid movement
    let yPositionInCharacter = section.yOffset + yOffset;

    // Handle crop offset for sections with overlap
    let sectionImage = section.canvas;
    if (section.cropOffset > 0) {
      const smallCrop = Math.min(3, section.cropOffset);
      if (smallCrop > 0 && smallCrop < sectionImage.height) {
        // Create cropped version
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = sectionImage.width;
        croppedCanvas.height = sectionImage.height - smallCrop;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (croppedCtx) {
          croppedCtx.drawImage(
            sectionImage,
            0,
            smallCrop,
            sectionImage.width,
            sectionImage.height - smallCrop,
            0,
            0,
            croppedCanvas.width,
            croppedCanvas.height
          );
          sectionImage = croppedCanvas;
          yPositionInCharacter = yPositionInCharacter - (section.cropOffset - smallCrop);
        }
      }
    }

    // Ensure headChest never moves above top of character bounds
    if (sectionName === 'headChest') {
      yPositionInCharacter = Math.max(0, yPositionInCharacter);
    }

    // Clamp to character bounds (preserve sub-pixel precision)
    yPositionInCharacter = Math.max(0, Math.min(yPositionInCharacter, bounds.height - sectionImage.height));

    // Convert to full image coordinates: character position + position within character
    // Use sub-pixel positioning for smoother animation (canvas handles fractional pixels)
    const xPosition = bounds.minX;
    const yPosition = bounds.minY + yPositionInCharacter;

    // Draw section to canvas at full image coordinates with sub-pixel precision
    ctx.drawImage(sectionImage, xPosition, yPosition);
  }
}

/**
 * Animate monster with breathing effect
 * Returns cleanup function to stop animation
 */
export function animateMonster(
  imageUrl: string,
  canvas: HTMLCanvasElement,
  onFrameReady?: () => void
): (() => void) | null {
  let animationFrameId: number | null = null;
  let isRunning = true;
  let sections: CharacterSections | null = null;
  let bounds: Bounds | null = null;
  let fullImageWidth = 0;
  let fullImageHeight = 0;
  let frameCount = 0;
  // Animation: 320 frames = ~5.33 seconds at 60fps (2x speed - twice as fast)
  const totalFrames = 320;

  // Temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return null;

  // Load image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    if (!isRunning) return;

    // Store full image dimensions
    fullImageWidth = img.naturalWidth;
    fullImageHeight = img.naturalHeight;

    // Find bounds
    bounds = findCharacterBounds(img, tempCanvas);
    if (!bounds) {
      console.error('[monster-animation] Could not find character bounds');
      return;
    }

    // Segment character
    sections = segmentCharacter(img, bounds, tempCanvas);
    if (!sections) {
      console.error('[monster-animation] Could not segment character');
      return;
    }

    console.log('[monster-animation] ✓ Character segmented, starting animation loop');
    console.log('[monster-animation] Sections:', Object.keys(sections));
    console.log('[monster-animation] Full image size:', fullImageWidth, 'x', fullImageHeight);
    console.log('[monster-animation] Character bounds:', bounds);

    // Section canvases are ready immediately (no need to wait for image loading)
    // Start animation loop right away
    animate();
  };

  img.onerror = () => {
    console.error('[monster-animation] Failed to load image:', imageUrl);
  };

  img.src = imageUrl;

  const animate = () => {
    if (!isRunning || !sections || !bounds || fullImageWidth === 0 || fullImageHeight === 0) {
      console.warn('[monster-animation] Animation stopped - missing requirements:', {
        isRunning,
        hasSections: !!sections,
        hasBounds: !!bounds,
        fullImageWidth,
        fullImageHeight
      });
      return;
    }

    // Calculate current frame using modulo for seamless looping
    // Never reset frameCount - let it grow and use modulo for calculation
    // This ensures perfect continuity without any pauses
    const currentFrame = frameCount % totalFrames;

    // Create breathing frame at full image size
    createBreathingFrame(
      sections,
      currentFrame,
      totalFrames,
      bounds,
      fullImageWidth,
      fullImageHeight,
      canvas
    );

    // Increment frame counter immediately - let it grow unbounded (modulo handles the looping)
    frameCount++;

    // Continue animation immediately - schedule next frame BEFORE callback
    // This ensures animation never pauses, even if callback is slow
    animationFrameId = requestAnimationFrame(animate);

    // Call callback after scheduling next frame (non-blocking)
    // This prevents callback from delaying the animation loop
    if (onFrameReady) {
      onFrameReady();
    }
  };

  // Cleanup function
  return () => {
    isRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
}

