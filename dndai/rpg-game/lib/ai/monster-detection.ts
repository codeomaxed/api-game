// Dynamic imports to avoid SSR issues with TensorFlow.js
type ObjectDetection = any; // Type from @tensorflow-models/coco-ssd

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectionResult {
  bbox: BoundingBox;
  confidence: number;
  class: string;
}

// COCO-SSD prediction format: { class: string, score: number, bbox: [x, y, width, height] }
interface COCOPrediction {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

// Cache for model instance
let modelInstance: ObjectDetection | null = null;
let modelLoading: Promise<ObjectDetection> | null = null;

// Cache for detection results
const detectionCache = new Map<string, BoundingBox | null>();

/**
 * Validate bounding box size and aspect ratio
 * Returns rejection reason if invalid, null if valid
 */
function validateBoundingBox(
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
): string | null {
  const area = bbox.width * bbox.height;
  const imageArea = imgWidth * imgHeight;
  const areaPercent = (area / imageArea) * 100;
  const aspectRatio = bbox.width / bbox.height;

  // Reject boxes that are too large (>50% of image - likely background/scene)
  if (areaPercent > 50) {
    return `Box too large: ${areaPercent.toFixed(1)}% of image`;
  }

  // Reject boxes that are too small (<2% of image - likely noise)
  if (areaPercent < 2) {
    return `Box too small: ${areaPercent.toFixed(1)}% of image`;
  }

  // Reject boxes with extreme aspect ratios (very wide or very tall)
  if (aspectRatio > 5 || aspectRatio < 0.2) {
    return `Extreme aspect ratio: ${aspectRatio.toFixed(2)}`;
  }

  return null; // Valid
}

/**
 * Calculate position score (prefer center area)
 * Returns score from 0-1, higher is better
 */
function getPositionScore(
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
): number {
  // Calculate center of bounding box
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  // Normalize to 0-1 (center of image is 0.5, 0.5)
  const normalizedX = centerX / imgWidth;
  const normalizedY = centerY / imgHeight;

  // Calculate distance from center (0-0.5 max)
  const distFromCenterX = Math.abs(normalizedX - 0.5);
  const distFromCenterY = Math.abs(normalizedY - 0.5);
  const maxDist = Math.max(distFromCenterX, distFromCenterY);

  // Score: 1.0 at center, decreases to 0.0 at edges
  // Prefer center 60% of image (distance < 0.3 from center)
  if (maxDist < 0.3) {
    return 1.0 - (maxDist / 0.3) * 0.3; // 1.0 to 0.7
  } else {
    return 0.7 - ((maxDist - 0.3) / 0.2) * 0.7; // 0.7 to 0.0
  }
}

/**
 * Calculate size score (prefer medium-sized boxes)
 * Returns score from 0-1, higher is better
 */
function getSizeScore(
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
): number {
  const area = bbox.width * bbox.height;
  const imageArea = imgWidth * imgHeight;
  const areaPercent = (area / imageArea) * 100;

  // Prefer 10-40% of image area (ideal range for monsters)
  if (areaPercent >= 10 && areaPercent <= 40) {
    // Optimal range - score based on how close to 20% (ideal)
    const idealPercent = 20;
    const distance = Math.abs(areaPercent - idealPercent);
    return 1.0 - (distance / 30) * 0.3; // 1.0 to 0.7
  } else if (areaPercent < 10) {
    // Too small - score decreases as it gets smaller
    return (areaPercent / 10) * 0.7; // 0.7 to 0.0
  } else {
    // Too large - score decreases as it gets larger
    return 0.7 - ((areaPercent - 40) / 10) * 0.7; // 0.7 to 0.0
  }
}

/**
 * Calculate overall detection score
 * Combines confidence, size, and position
 */
function calculateDetectionScore(
  pred: COCOPrediction,
  imgWidth: number,
  imgHeight: number
): number {
  const bbox: BoundingBox = {
    x: pred.bbox[0],
    y: pred.bbox[1],
    width: pred.bbox[2],
    height: pred.bbox[3],
  };

  const confidenceScore = pred.score; // 0-1
  const sizeScore = getSizeScore(bbox, imgWidth, imgHeight); // 0-1
  const positionScore = getPositionScore(bbox, imgWidth, imgHeight); // 0-1

  // Weighted combination: confidence 40%, size 35%, position 25%
  const totalScore = confidenceScore * 0.4 + sizeScore * 0.35 + positionScore * 0.25;

  return totalScore;
}

/**
 * Load COCO-SSD model (cached after first load)
 * Uses dynamic import to avoid SSR bundling issues
 */
async function loadModel(): Promise<ObjectDetection> {
  if (modelInstance) {
    console.log('[monster-detection] Using cached model instance');
    return modelInstance;
  }

  if (modelLoading) {
    console.log('[monster-detection] Model already loading, waiting...');
    return modelLoading;
  }

  // Dynamic import - only loads on client side
  console.log('[monster-detection] Loading TensorFlow.js model...');
  const startTime = Date.now();
  
  modelLoading = (async () => {
    try {
      console.log('[monster-detection] Importing TensorFlow.js packages...');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      await import('@tensorflow/tfjs');
      console.log('[monster-detection] Loading COCO-SSD model...');
      const model = await cocoSsd.load();
      const loadTime = Date.now() - startTime;
      console.log(`[monster-detection] Model loaded successfully in ${loadTime}ms`);
      return model;
    } catch (error) {
      console.error('[monster-detection] Error loading model:', error);
      throw error;
    }
  })();
  
  try {
    modelInstance = await modelLoading;
    modelLoading = null;
    return modelInstance;
  } catch (error) {
    modelLoading = null;
    throw error;
  }
}

/**
 * Detect monster in image using TensorFlow.js COCO-SSD model
 */
export async function detectMonsterInImage(imageUrl: string): Promise<BoundingBox | null> {
  console.log('[monster-detection] detectMonsterInImage called', { imageUrl });
  
  // Check cache first
  if (detectionCache.has(imageUrl)) {
    const cached = detectionCache.get(imageUrl);
    console.log('[monster-detection] Using cached result', { hasBounds: !!cached });
    return cached || null;
  }

  try {
    // Load model
    console.log('[monster-detection] Loading model...');
    const model = await loadModel();

    // Load image
    console.log('[monster-detection] Loading image...', { imageUrl });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout after 10 seconds'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log('[monster-detection] Image loaded', { width: img.width, height: img.height });
        resolve(null);
      };
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[monster-detection] Image load error:', error);
        reject(new Error(`Failed to load image: ${imageUrl}. This may be a CORS issue.`));
      };
      img.src = imageUrl;
    });

    // Run detection
    console.log('[monster-detection] Running detection...');
    const detectionStartTime = Date.now();
    const predictions = await model.detect(img);
    const detectionTime = Date.now() - detectionStartTime;
    console.log(`[monster-detection] Detection completed in ${detectionTime}ms`, { 
      predictionCount: predictions.length,
      predictions: (predictions as COCOPrediction[]).map((p: COCOPrediction) => ({ class: p.class, score: p.score }))
    });

    // Filter for relevant classes (animals, creatures, people - things that could be monsters)
    // COCO-SSD detects 80 classes, we want creatures/animals/people that could be monsters
    // Expanded list to include more creature-like objects
    const relevantClasses = [
      'person', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant',
      'bear', 'zebra', 'giraffe', 'mouse', 'rabbit', 'tiger', 'lion'
    ];

    // Step 1: Filter for relevant classes with good confidence
    const relevantPredictions = (predictions as COCOPrediction[]).filter(
      (pred: COCOPrediction) => 
        relevantClasses.includes(pred.class.toLowerCase()) && 
        pred.score > 0.3 // Confidence threshold
    );

    console.log(`[monster-detection] Found ${relevantPredictions.length} relevant class detections`);

    // Step 2: Validate and score all predictions (relevant + fallback)
    const allCandidates = relevantPredictions.length > 0 
      ? relevantPredictions 
      : (predictions as COCOPrediction[]).filter((pred: COCOPrediction) => pred.score > 0.2);

    if (allCandidates.length === 0) {
      console.log('[monster-detection] No detections found at all');
      detectionCache.set(imageUrl, null);
      return null;
    }

    console.log(`[monster-detection] Evaluating ${allCandidates.length} candidate detections`);

    // Score and validate all candidates
    const scoredCandidates = allCandidates.map((pred: COCOPrediction) => {
      const bbox: BoundingBox = {
        x: pred.bbox[0],
        y: pred.bbox[1],
        width: pred.bbox[2],
        height: pred.bbox[3],
      };

      const validationError = validateBoundingBox(bbox, img.width, img.height);
      const score = calculateDetectionScore(pred, img.width, img.height);

      return {
        prediction: pred,
        bbox,
        score,
        validationError,
        isValid: !validationError,
      };
    });

    // Log all candidates with their scores and validation status
    console.log('[monster-detection] Candidate detections:', scoredCandidates.map(c => ({
      class: c.prediction.class,
      confidence: c.prediction.score.toFixed(2),
      score: c.score.toFixed(3),
      areaPercent: ((c.bbox.width * c.bbox.height) / (img.width * img.height) * 100).toFixed(1),
      valid: c.isValid,
      rejectionReason: c.validationError || 'none'
    })));

    // Filter to only valid candidates
    const validCandidates = scoredCandidates.filter(c => c.isValid);

    if (validCandidates.length === 0) {
      console.log('[monster-detection] No valid detections found (all rejected by validation)');
      console.log('[monster-detection] Rejection reasons:', scoredCandidates.map(c => ({
        class: c.prediction.class,
        reason: c.validationError
      })));
      detectionCache.set(imageUrl, null);
      return null;
    }

    // Sort by score (highest first)
    validCandidates.sort((a, b) => b.score - a.score);

    const bestCandidate = validCandidates[0];
    console.log('[monster-detection] Best detection selected', {
      class: bestCandidate.prediction.class,
      confidence: bestCandidate.prediction.score.toFixed(3),
      totalScore: bestCandidate.score.toFixed(3),
      bbox: bestCandidate.bbox,
      areaPercent: ((bestCandidate.bbox.width * bestCandidate.bbox.height) / (img.width * img.height) * 100).toFixed(1) + '%'
    });

    // Add small padding for easier clicking (5% of smallest dimension)
    const boundingBox: BoundingBox = {
      x: bestCandidate.bbox.x,
      y: bestCandidate.bbox.y,
      width: bestCandidate.bbox.width,
      height: bestCandidate.bbox.height,
    };

    const padding = Math.min(boundingBox.width, boundingBox.height) * 0.05;
    boundingBox.x = Math.max(0, boundingBox.x - padding);
    boundingBox.y = Math.max(0, boundingBox.y - padding);
    boundingBox.width = Math.min(img.width - boundingBox.x, boundingBox.width + padding * 2);
    boundingBox.height = Math.min(img.height - boundingBox.y, boundingBox.height + padding * 2);

    // Final validation after padding
    const finalValidation = validateBoundingBox(boundingBox, img.width, img.height);
    if (finalValidation) {
      console.warn('[monster-detection] Final bounding box failed validation after padding:', finalValidation);
      // Still return it, but log the warning
    }

    console.log('[monster-detection] Final bounding box', boundingBox);
    detectionCache.set(imageUrl, boundingBox);
    return boundingBox;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[monster-detection] Error detecting monster:', error);
    console.error('[monster-detection] Error details:', {
      message: errorMessage,
      imageUrl,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    detectionCache.set(imageUrl, null);
    throw error; // Re-throw so component can handle it
  }
}

/**
 * Clear detection cache (useful for testing or memory management)
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
}

