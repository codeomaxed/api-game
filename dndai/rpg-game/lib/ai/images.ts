// Note: ComfyUI client is configured via environment variables
// Client-side calls should use the API route, server-side can use direct ComfyUI client

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  size?: '512' | '768' | '1024';
  width?: number;
  height?: number;
  numSteps?: number;
  isCombatRoom?: boolean; // If true, uses segmentation-enabled generation
}

/**
 * Generate image using ComfyUI workflow
 * Replaces fal.ai implementation
 * On client-side, uses API route. On server-side, uses ComfyUI client directly.
 */
export async function generateImage(
  options: ImageGenerationOptions,
  apiKey?: string // Kept for compatibility, but no longer used
): Promise<string | null> {
  // Note: Don't enhance prompt here - preserve strict topology control from buildRoomPrompt
  // The prompt already contains all necessary style information

  try {
    console.log('Submitting image generation request to ComfyUI...');
    console.log(`[ComfyUI] Generation options: width=${options.width}, height=${options.height}, aspectRatio=${options.aspectRatio}`);
    
    // Check if we're on the client side (browser)
    if (typeof window !== 'undefined') {
      // Client-side: use API route
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          isCombatRoom: options.isCombatRoom || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const result = await response.json();
      // For combat rooms, the API returns { imageUrl, segmentedUrl }
      // For backward compatibility, we only return imageUrl from this function
      // The segmentedUrl should be handled by the caller
      return result.imageUrl || null;
    } else {
      // Server-side: use ComfyUI client directly
      const { generateImageWithComfyUI } = await import('./comfyui-images');
      return await generateImageWithComfyUI(options);
    }
  } catch (error) {
    console.error('Error generating image with ComfyUI:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return null;
  }
}

// Re-export ComfyUI functions for compatibility
export { 
  generateCharacterPortrait,
  generateEnemyImage,
  generateLootImage,
  generateLocationImage
} from './comfyui-images';

