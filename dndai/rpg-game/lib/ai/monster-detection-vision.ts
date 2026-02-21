// AI Vision-based monster detection using GPT-4 Vision or similar model
// This provides more accurate detection for fantasy monsters than COCO-SSD

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisionDetectionResponse {
  monsterFound: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
  description?: string;
}

// Cache for detection results
const detectionCache = new Map<string, BoundingBox | null>();

/**
 * Convert image URL to base64 string
 */
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix if present
        const base64 = base64String.includes(',') 
          ? base64String.split(',')[1] 
          : base64String;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[monster-detection-vision] Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Get API key from environment
 */
function getApiKey(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side only
  }
  return process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
}

/**
 * Detect monster in image using AI vision model
 * Uses monster description to find the specific creature in the image
 */
export async function detectMonsterInImage(
  imageUrl: string,
  monsterName?: string,
  monsterDescription?: string
): Promise<BoundingBox | null> {
  console.log('[monster-detection-vision] detectMonsterInImage called', { 
    imageUrl, 
    monsterName, 
    hasDescription: !!monsterDescription 
  });
  
  // Create cache key that includes monster info (same image, different monster = different cache entry)
  const cacheKey = monsterName ? `${imageUrl}:${monsterName}` : imageUrl;
  
  // Check cache first
  if (detectionCache.has(cacheKey)) {
    const cached = detectionCache.get(cacheKey);
    console.log('[monster-detection-vision] Using cached result', { hasBounds: !!cached });
    return cached || null;
  }

  // Declare variables for use in retry loop
  let lastError: Error | null = null;
  const maxRetries = 2;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('[monster-detection-vision] No API key found, cannot perform vision detection');
      detectionCache.set(cacheKey, null);
      return null;
    }

    console.log('[monster-detection-vision] Converting image to base64...');
    const base64Image = await imageUrlToBase64(imageUrl);
    
    // Determine image format from URL or default to jpeg
    let mimeType = 'image/jpeg'; // default
    const urlLower = imageUrl.toLowerCase();
    if (urlLower.includes('.png') || urlLower.includes('png')) {
      mimeType = 'image/png';
    } else if (urlLower.includes('.webp') || urlLower.includes('webp')) {
      mimeType = 'image/webp';
    } else if (urlLower.includes('.gif') || urlLower.includes('gif')) {
      mimeType = 'image/gif';
    }

    console.log('[monster-detection-vision] Calling vision API...');
    
    // Use OpenRouter API (supports vision models)
    // Try gpt-4o first (best vision model), fallback to gpt-4-vision-preview
    const model = 'openai/gpt-4o';
    
    // Retry logic for API calls
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[monster-detection-vision] Retry attempt ${attempt}/${maxRetries}...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      try {
    
    // Build prompt based on whether we have monster description
    let systemPrompt: string;
    let userPrompt: string;
    
    if (monsterName && monsterDescription) {
      // Use specific monster description for precise matching
      systemPrompt = `You are an expert at analyzing fantasy game images and identifying specific monsters or creatures. 
Your task is to find the EXACT monster described below in the image and return its precise bounding box coordinates.

This is a combat encounter image from a fantasy RPG game. The image was generated based on a specific monster description.

Return a JSON object with this exact structure:
{
  "monsterFound": true/false,
  "boundingBox": {
    "x": number (pixels from left edge),
    "y": number (pixels from top edge),
    "width": number (width in pixels),
    "height": number (height in pixels)
  },
  "confidence": 0.0-1.0,
  "description": "brief description of what you found"
}

CRITICAL INSTRUCTIONS:
1. FIRST: Read the monster description carefully
2. SECOND: Analyze the image to find the creature that matches that description
3. THIRD: Measure the dimensions of that specific creature precisely
4. FOURTH: Create a tight bounding box that wraps around the ENTIRE creature

The bounding box must:
- Tightly wrap around the ENTIRE creature matching the description
- Include ALL parts: body, head, all legs/limbs, wings, tails, appendages, weapons, etc.
- Be precise - match the creature's actual position and size in pixels
- Coordinates are in pixels relative to the image dimensions (analyze the image to get its size)
- The box should be as tight as possible while including everything`;

      userPrompt = `MONSTER TO FIND:
Name: ${monsterName}
Description: ${monsterDescription}

TASK:
1. Analyze the image and find the creature that matches the description above
2. Match the visual characteristics described (appearance, features, size, etc.)
3. Measure the exact dimensions of that specific creature in the image
4. Return a tight bounding box that wraps around the entire creature including all its parts

The bounding box should be precise and include:
- The full body from top to bottom
- All limbs, legs, arms, or appendages
- Any wings, tails, or extensions
- Any weapons or items the creature is holding/wearing
- Everything that is part of the creature

Return the bounding box coordinates in JSON format as specified.`;
    } else {
      // Fallback to generic detection if no monster info provided
      systemPrompt = `You are an expert at analyzing fantasy game images and identifying monsters or creatures. 
Your task is to find ANY monster, creature, enemy, or hostile entity in the image and return its precise bounding box coordinates.

This is a combat encounter image from a fantasy RPG game. There should ALWAYS be a monster or enemy present in combat images.

Return a JSON object with this exact structure:
{
  "monsterFound": true/false,
  "boundingBox": {
    "x": number (pixels from left edge),
    "y": number (pixels from top edge),
    "width": number (width in pixels),
    "height": number (height in pixels)
  },
  "confidence": 0.0-1.0,
  "description": "brief description of what you found"
}

IMPORTANT RULES:
- Look carefully for ANY creature, monster, enemy, or hostile entity in the image
- This includes: spiders, skeletons, zombies, wolves, slimes, armored enemies, or any other fantasy creature
- If you see ANY living creature or monster-like entity, set monsterFound to true
- Coordinates are in pixels relative to the image dimensions (get image size from the image itself)
- The bounding box should tightly wrap around the ENTIRE monster including:
  * All legs, limbs, and appendages
  * Wings, tails, or other extensions
  * The full body from top to bottom
- Be precise - the bounding box must match the monster's actual position and size
- If you truly cannot find any creature (very rare), set monsterFound to false
- Always try to find something - combat images should have enemies`;

      userPrompt = `This is a combat encounter image from a fantasy RPG. Analyze the image carefully and find the monster, creature, or enemy present. 

Look for any living creature, monster, or hostile entity - this could be a spider, skeleton, zombie, wolf, slime, armored enemy, or any other fantasy creature.

Return the bounding box coordinates in JSON format. The bounding box should wrap around the entire creature including all its parts (legs, wings, tails, etc.).`;
    }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3001',
            'X-Title': 'D&D 5e AI RPG',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: userPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, // Low temperature for consistent, precise results
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[monster-detection-vision] API error (attempt ${attempt + 1}):`, response.status, errorText);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
          }
          
          // Retry on 5xx errors (server errors) or network errors
          lastError = new Error(`Vision API error: ${response.status} ${response.statusText}`);
          if (attempt < maxRetries) {
            continue; // Retry
          }
          throw lastError;
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          console.error('[monster-detection-vision] No content in API response:', data);
          lastError = new Error('No content in API response');
          if (attempt < maxRetries) {
            continue; // Retry
          }
          throw lastError;
        }

        console.log('[monster-detection-vision] Received response, parsing JSON...');
        let visionResponse: VisionDetectionResponse;
        try {
          visionResponse = JSON.parse(content);
        } catch (parseError) {
          console.error('[monster-detection-vision] Failed to parse JSON response:', content);
          console.error('[monster-detection-vision] Parse error:', parseError);
          lastError = new Error('Failed to parse JSON response');
          if (attempt < maxRetries) {
            continue; // Retry
          }
          detectionCache.set(cacheKey, null);
          return null;
        }
        
        console.log('[monster-detection-vision] Vision response:', visionResponse);

        if (!visionResponse.monsterFound || !visionResponse.boundingBox) {
          console.warn('[monster-detection-vision] No monster found in image. Response:', visionResponse);
          if (monsterName) {
            console.warn(`[monster-detection-vision] AI did not find "${monsterName}" matching the description in the image`);
          } else {
            console.warn('[monster-detection-vision] This might indicate the AI didn\'t detect a creature, or the image has no monster');
          }
          detectionCache.set(cacheKey, null);
          return null;
        }

        // Validate bounding box
        const bbox = visionResponse.boundingBox;
        if (bbox.x < 0 || bbox.y < 0 || bbox.width <= 0 || bbox.height <= 0) {
          console.warn('[monster-detection-vision] Invalid bounding box coordinates:', bbox);
          detectionCache.set(cacheKey, null);
          return null;
        }

        // Get image dimensions to validate coordinates
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        // Clamp bounding box to image bounds
        const boundingBox: BoundingBox = {
          x: Math.max(0, Math.min(bbox.x, img.width - 1)),
          y: Math.max(0, Math.min(bbox.y, img.height - 1)),
          width: Math.min(bbox.width, img.width - Math.max(0, bbox.x)),
          height: Math.min(bbox.height, img.height - Math.max(0, bbox.y)),
        };

        // Validate final bounding box
        if (boundingBox.width <= 0 || boundingBox.height <= 0) {
          console.warn('[monster-detection-vision] Invalid bounding box after clamping:', boundingBox);
          detectionCache.set(cacheKey, null);
          return null;
        }

        console.log('[monster-detection-vision] Final bounding box:', boundingBox, {
          monsterName,
          confidence: visionResponse.confidence,
          description: visionResponse.description,
        });

        detectionCache.set(cacheKey, boundingBox);
        return boundingBox;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          console.warn(`[monster-detection-vision] Attempt ${attempt + 1} failed, will retry...`, lastError.message);
          continue; // Retry
        }
        // Final attempt failed, throw error
        throw lastError;
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error in detection');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[monster-detection-vision] Error detecting monster:', error);
    console.error('[monster-detection-vision] Error details:', {
      message: errorMessage,
      imageUrl,
      monsterName,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    detectionCache.set(cacheKey, null);
    return null; // Return null instead of throwing, so component can handle gracefully
  }
}

/**
 * Clear detection cache (useful for testing or memory management)
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
}

