// SAM-3 image segmentation for monster detection
// Uses ComfyUI workflow with SAM3 segmentation to accurately segment monsters from images

import { getComfyUIClient, WorkflowOptions } from './comfyui-client';
import { Monster } from '@/lib/game/monsters';

interface SegmentationResult {
  transparentMonsterUrl: string; // Transparent PNG URL with background removed
}

// Cache for segmentation results
const segmentationCache = new Map<string, SegmentationResult | null>();

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 100;

/**
 * Extract monster name from image prompt
 * Looks for *word* or **word** format (single or double asterisks) and returns just the word
 * Tries multiple regex patterns for robustness
 * @param prompt - The image generation prompt that may contain *monster* or **monster** format
 * @returns The extracted monster name, or null if not found
 */
function extractMonsterNameFromPrompt(prompt: string): string | null {
  if (!prompt) return null;
  
  // Try multiple patterns for robustness
  const patterns = [
    /\*{1,2}\s*([^*]+?)\s*\*{1,2}/,  // Standard: *text* or **text**
    /\*\s*([^*\n]+?)\s*\*/,          // Single asterisk with newline protection
    /\*\*\s*([^*\n]+?)\s*\*\*/,       // Double asterisk with newline protection
    /\[([^\]]+)\]/,                   // Bracket format: [text]
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      const extracted = match[1].trim();
      if (extracted && extracted.length > 0 && extracted.length < 50) {
        console.log('[monster-segmentation] Extracted monster name from prompt:', extracted);
        return extracted;
      }
    }
  }
  
  console.log('[monster-segmentation] No matching format found in prompt');
  return null; // Will fall back to monster.name
}

/**
 * Generate alternative prompts for segmentation retry
 * Extracts keywords from monster's visualDescription and generates fallback terms
 * @param monster - Monster object with name and visualDescription
 * @param primaryPrompt - The primary prompt that failed
 * @returns Array of alternative prompts to try, ordered by likelihood of success
 */
function generateAlternativePrompts(monster: Monster | undefined, primaryPrompt: string): string[] {
  const alternatives: string[] = [];
  
  if (!monster) {
    // Generic fallbacks if no monster data
    return ['creature', 'enemy', 'monster', 'figure'];
  }
  
  // Extract key descriptive words from visualDescription
  if (monster.visualDescription) {
    const description = monster.visualDescription.toLowerCase();
    
    // Extract key nouns and descriptive phrases
    const keyPhrases: string[] = [];
    
    // Look for common descriptive patterns
    const patterns = [
      /(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+){0,2})\s+(?:with|clad|wielding|standing|made)/gi,
      /(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+){0,2})\s+(?:warrior|figure|creature|beast|monster)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const phrase = match[1].trim();
          if (phrase.length > 2 && phrase.length < 30) {
            keyPhrases.push(phrase);
          }
        }
      }
    }
    
    // Extract single descriptive words (nouns/adjectives)
    const words = description
      .split(/[\s,\.]+/)
      .filter(word => word.length > 3 && word.length < 15)
      .filter(word => !['the', 'a', 'an', 'and', 'or', 'with', 'from', 'that', 'this', 'its', 'its'].includes(word))
      .slice(0, 5); // Take first 5 meaningful words
    
    alternatives.push(...keyPhrases.slice(0, 3));
    alternatives.push(...words.slice(0, 3));
  }
  
  // Add monster name if it's different from primary prompt
  if (monster.name && monster.name.toLowerCase() !== primaryPrompt.toLowerCase()) {
    alternatives.push(monster.name);
  }
  
  // Add generic descriptors based on common patterns
  const genericDescriptors: string[] = [];
  
  // Check if it's humanoid-like
  if (monster.visualDescription?.toLowerCase().includes('humanoid') || 
      monster.visualDescription?.toLowerCase().includes('figure') ||
      monster.visualDescription?.toLowerCase().includes('warrior')) {
    genericDescriptors.push('humanoid', 'figure', 'warrior');
  }
  
  // Check if it's animal-like
  if (monster.visualDescription?.toLowerCase().includes('wolf') ||
      monster.visualDescription?.toLowerCase().includes('beast') ||
      monster.visualDescription?.toLowerCase().includes('creature')) {
    genericDescriptors.push('creature', 'beast', 'animal');
  }
  
  // Check if it's undead
  if (monster.visualDescription?.toLowerCase().includes('skeleton') ||
      monster.visualDescription?.toLowerCase().includes('undead') ||
      monster.visualDescription?.toLowerCase().includes('zombie')) {
    genericDescriptors.push('undead', 'skeleton');
  }
  
  alternatives.push(...genericDescriptors);
  
  // Final generic fallbacks
  alternatives.push('creature', 'enemy', 'monster', 'figure');
  
  // Remove duplicates and filter out empty/invalid prompts
  const unique = Array.from(new Set(alternatives))
    .filter(p => p && p.length > 0 && p.length < 50)
    .filter(p => p.toLowerCase() !== primaryPrompt.toLowerCase());
  
  console.log('[monster-segmentation] Generated alternative prompts:', unique);
  return unique;
}

/**
 * Segment monster in image using ComfyUI SAM-3 workflow
 * @param imageUrl - URL of the image to segment (reference only - ComfyUI regenerates)
 * @param imagePrompt - Required: Original image prompt to regenerate with segmentation
 * @param monsterName - Optional: Fallback monster name if prompt extraction fails
 * @param monster - Optional: Monster object for generating alternative prompts on retry
 * @returns Transparent PNG URL with background removed, or null if segmentation fails
 */
export async function segmentMonsterInImage(
  imageUrl: string,
  imagePrompt?: string,
  monsterName?: string,
  monster?: Monster
): Promise<{ transparentMonsterUrl: string } | null> {
  const startTime = performance.now();
  console.log('[monster-segmentation] segmentMonsterInImage called', { 
    imageUrl, 
    hasImagePrompt: !!imagePrompt,
    monsterName,
    hasMonster: !!monster
  });
  
  // Extract monster name from prompt
  let primaryPrompt: string | null = null;
  
  if (imagePrompt) {
    const extracted = extractMonsterNameFromPrompt(imagePrompt);
    if (extracted) {
      primaryPrompt = extracted;
    }
  }
  
  // Fall back to monsterName if extraction failed
  if (!primaryPrompt && monsterName) {
    primaryPrompt = monsterName;
    console.log('[monster-segmentation] Using monsterName as fallback:', monsterName);
  }
  
  if (!primaryPrompt) {
    console.warn('[monster-segmentation] No prompt available for SAM-3 segmentation');
    return null;
  }
  
  // Build list of prompts to try (primary + alternatives)
  const promptsToTry: string[] = [primaryPrompt];
  const alternatives = generateAlternativePrompts(monster, primaryPrompt);
  promptsToTry.push(...alternatives);
  
  console.log('[monster-segmentation] Will try prompts in order:', promptsToTry);
  
  // Try each prompt until one succeeds
  let lastError: Error | null = null;
  
  for (let attemptIndex = 0; attemptIndex < promptsToTry.length; attemptIndex++) {
    const prompt = promptsToTry[attemptIndex];
    
    // Create cache key including prompt
    const cacheKey = `${imageUrl}:${prompt}`;
    
    // Check cache first
    if (segmentationCache.has(cacheKey)) {
      const cached = segmentationCache.get(cacheKey);
      if (cached) {
        const elapsed = (performance.now() - startTime).toFixed(2);
        console.log(`[monster-segmentation] Using cached result for prompt "${prompt}" (${elapsed}ms)`);
        return cached;
      }
      // If cached as null, skip this prompt
      console.log(`[monster-segmentation] Skipping cached failure for prompt "${prompt}"`);
      continue;
    }
    
    // Exponential backoff: wait before retry (except first attempt)
    if (attemptIndex > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, attemptIndex - 1), 5000); // Max 5 seconds
      console.log(`[monster-segmentation] Waiting ${backoffMs}ms before retry with alternative prompt...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    console.log(`[monster-segmentation] Attempt ${attemptIndex + 1}/${promptsToTry.length}: Trying prompt "${prompt}"`);
    
    try {
      const result = await trySegmentationWithPrompt(imageUrl, prompt, cacheKey, startTime, imagePrompt);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[monster-segmentation] Attempt ${attemptIndex + 1} failed with prompt "${prompt}":`, lastError.message);
      
      // Cache the failure
      segmentationCache.set(cacheKey, null);
      
      // Continue to next alternative prompt
      continue;
    }
  }
  
  // All prompts failed
  const elapsed = (performance.now() - startTime).toFixed(2);
  console.error(`[monster-segmentation] All ${promptsToTry.length} prompt attempts failed (${elapsed}ms)`);
  if (lastError) {
    console.error('[monster-segmentation] Last error:', lastError);
  }
  return null;
}

/**
 * Try segmentation with a specific prompt using ComfyUI
 * Note: This function is used for post-processing existing images.
 * For new image generation with segmentation, use generateImageWithSegmentation instead.
 * @param imageUrl - URL of the image to segment (currently not used - ComfyUI generates new image)
 * @param prompt - The prompt to use for segmentation (e.g., "character")
 * @param cacheKey - Cache key for this prompt
 * @param startTime - Performance timing start
 * @param imagePrompt - The original image generation prompt (used to regenerate with segmentation)
 * @returns Segmentation result or null
 */
async function trySegmentationWithPrompt(
  imageUrl: string,
  prompt: string,
  cacheKey: string,
  startTime: number,
  imagePrompt?: string
): Promise<{ transparentMonsterUrl: string } | null> {

  const client = getComfyUIClient();

  // Check server health
  const isHealthy = await client.checkServerHealth();
  if (!isHealthy) {
    console.warn('[monster-segmentation] ComfyUI server is not reachable');
    segmentationCache.set(cacheKey, null);
    return null;
  }

  console.log('[monster-segmentation] 🚀 Running ComfyUI segmentation workflow with prompt: "' + prompt + '"');
  console.log('[monster-segmentation] Image URL (reference):', imageUrl);
  
  // Note: ComfyUI workflow generates and segments in one pass
  // We need the original image prompt to regenerate with segmentation enabled
  // If we don't have the prompt, we can't segment (this is a limitation)
  if (!imagePrompt) {
    console.warn('[monster-segmentation] No image prompt provided - cannot regenerate with segmentation');
    segmentationCache.set(cacheKey, null);
    return null;
  }

  try {
    // Run workflow with segmentation enabled
    // The workflow will generate the image and segment it in one pass
    const workflowOptions: WorkflowOptions = {
      prompt: imagePrompt, // Use original image prompt
      enableSegmentation: true,
      segmentationPrompt: prompt, // Use "character" for monster segmentation
      width: 1216, // Default dimensions
      height: 832,
    };

    const imageUrls = await client.executeWorkflow(workflowOptions);

    // The segmented image should be from node #62 (Save Image With Alpha)
    // It's typically the last image in the array
    let transparentMonsterUrl: string | null = null;
    
    if (imageUrls.length > 1) {
      // Multiple images: last one is likely the segmented image (node #62)
      transparentMonsterUrl = imageUrls[imageUrls.length - 1];
    } else if (imageUrls.length === 1) {
      // Only one image - might be the segmented one
      transparentMonsterUrl = imageUrls[0];
    }

    if (!transparentMonsterUrl) {
      console.error('[monster-segmentation] ❌ No segmented image URL found in workflow output');
      segmentationCache.set(cacheKey, null);
      throw new Error('ComfyUI workflow did not return segmented image');
    }

    // Validate URL format
    if (typeof transparentMonsterUrl !== 'string' || !transparentMonsterUrl.startsWith('http')) {
      console.warn('[monster-segmentation] Invalid URL format:', transparentMonsterUrl);
      segmentationCache.set(cacheKey, null);
      throw new Error(`Invalid URL format: ${transparentMonsterUrl}`);
    }

    const elapsed = (performance.now() - startTime).toFixed(2);
    console.log('[monster-segmentation] ✓ Transparent image URL extracted:', transparentMonsterUrl);
    console.log(`[monster-segmentation] ✓ ComfyUI SAM-3 segmentation complete (${elapsed}ms)`);

    // Cache result and manage cache size
    const cacheResult: SegmentationResult = {
      transparentMonsterUrl,
    };
    segmentationCache.set(cacheKey, cacheResult);
    
    // Enforce cache size limit
    if (segmentationCache.size > MAX_CACHE_SIZE) {
      const firstKey = segmentationCache.keys().next().value;
      segmentationCache.delete(firstKey);
      console.log('[monster-segmentation] Cache size limit reached, removed oldest entry');
    }

    return cacheResult;
  } catch (error) {
    console.error('[monster-segmentation] Error during ComfyUI segmentation:', error);
    segmentationCache.set(cacheKey, null);
    throw error;
  }
}

/**
 * Clear segmentation cache
 */
export function clearSegmentationCache(): void {
  segmentationCache.clear();
}
