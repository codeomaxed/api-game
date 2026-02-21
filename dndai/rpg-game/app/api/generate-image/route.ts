import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationOptions } from '@/lib/ai/images';
import { generateImageWithComfyUI, generateImageWithSegmentation } from '@/lib/ai/comfyui-images';

// Track in-progress image generations to prevent duplicates
const imageGenerationInProgress = new Map<string, Promise<string | null>>();

/**
 * API route for image generation using ComfyUI
 * Replaces fal.ai implementation
 * This route runs server-side and uses ComfyUI client directly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { prompt, negativePrompt, aspectRatio, size, isCombatRoom, width, height, numSteps } = body;

    // Validate and convert prompt to string
    if (!prompt) {
      console.error('Missing required field: prompt');
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Convert prompt to string if it's not already
    if (typeof prompt !== 'string') {
      // If it's an object, try to extract a prompt property
      if (typeof prompt === 'object' && prompt !== null) {
        if ('prompt' in prompt && typeof prompt.prompt === 'string') {
          prompt = prompt.prompt;
        } else {
          console.error('Invalid prompt type: expected string or object with prompt property', typeof prompt, prompt);
          return NextResponse.json(
            { error: 'Invalid prompt: must be a string or object with a prompt property' },
            { status: 400 }
          );
        }
      } else {
        // Try to convert to string
        prompt = String(prompt);
      }
    }

    // Ensure prompt is a non-empty string
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('Invalid prompt: must be a non-empty string');
      return NextResponse.json(
        { error: 'Invalid prompt: must be a non-empty string' },
        { status: 400 }
      );
    }

    // #region agent log
    const fs = require('fs');
    const logPath = 'c:\\Projects\\Api Game\\.cursor\\debug.log';
    const logEntry = JSON.stringify({location:'generate-image/route.ts:12',message:'POST /api/generate-image called',data:{hasPrompt:!!prompt,promptPreview:typeof prompt === 'string' ? prompt.substring(0,50) : 'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
    try { fs.appendFileSync(logPath, logEntry); } catch(e) {}
    // #endregion

    // Check if ComfyUI server is configured
    const serverUrl = process.env.COMFYUI_SERVER_URL || 'http://127.0.0.1:8188';
    console.log('ComfyUI server URL:', serverUrl);
    
    console.log('Generating image with prompt:', prompt.substring(0, 100) + '...');
    
    // Create a key from the prompt to detect duplicates
    const promptKey = prompt.substring(0, 100);
    
    // Check if same image generation is already in progress
    if (imageGenerationInProgress.has(promptKey)) {
      // #region agent log
      const logEntry2 = JSON.stringify({location:'generate-image/route.ts:38',message:'Duplicate image generation blocked',data:{promptKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
      try { fs.appendFileSync(logPath, logEntry2); } catch(e) {}
      // #endregion
      console.log(`[API] Duplicate image generation request blocked for prompt: ${promptKey}...`);
      // Return the existing promise result
      const existingPromise = imageGenerationInProgress.get(promptKey);
      if (existingPromise) {
        const result = await existingPromise;
        return NextResponse.json({ imageUrl: result });
      }
    }
    
    const options: ImageGenerationOptions = {
      prompt,
      negativePrompt,
      aspectRatio: aspectRatio || 'landscape',
      size: size || '1024',
      width: width,
      height: height,
      numSteps: numSteps,
    };

    // For combat rooms, use segmentation-enabled generation
    let result: { imageUrl: string | null; segmentedUrl?: string | undefined } | null;
    
    if (isCombatRoom === true) {
      console.log('[API] Combat room detected - using segmentation-enabled generation');
      const generationPromise = generateImageWithSegmentation(
        prompt,
        true, // isCombatRoom
        aspectRatio || 'square',
        width,
        height,
        numSteps
      ).finally(() => {
        // Remove from map when done (success or failure)
        imageGenerationInProgress.delete(promptKey);
      });
      
      imageGenerationInProgress.set(promptKey, generationPromise.then(r => r?.imageUrl || null));
      
      result = await generationPromise;
      
      if (!result || !result.imageUrl) {
        console.error('[API] Combat room image generation with segmentation returned null');
        return NextResponse.json(
          { error: 'Failed to generate combat room image with segmentation. Is ComfyUI server running?' },
          { status: 500 }
        );
      }

      console.log('[API] Combat room image generated successfully:', result.imageUrl.substring(0, 50) + '...');
      if (result.backgroundUrl) {
        console.log('[API] Background (monster removed) URL from node #83:', result.backgroundUrl.substring(0, 50) + '...');
      }
      if (result.segmentedUrl) {
        console.log('[API] Segmented monster URL generated:', result.segmentedUrl.substring(0, 50) + '...');
      } else {
        console.warn('[API] Combat room image generated but no segmented URL returned');
      }
      
      // #region agent log
      const fs2 = require('fs');
      const logPath2 = 'c:\\Projects\\Api Game\\.cursor\\debug.log';
      const logEntry2 = JSON.stringify({location:'generate-image/route.ts:46',message:'Combat room image generation completed',data:{hasImageUrl:!!result.imageUrl,hasBackgroundUrl:!!result.backgroundUrl,hasSegmentedUrl:!!result.segmentedUrl,imageUrlPreview:result.imageUrl?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
      try { fs2.appendFileSync(logPath2, logEntry2); } catch(e) {}
      // #endregion
      
      return NextResponse.json({ 
        imageUrl: result.imageUrl, // This now contains backgroundUrl if available
        segmentedUrl: result.segmentedUrl,
        backgroundUrl: result.backgroundUrl // Also return explicitly for reference
      });
    } else {
      // Regular image generation for non-combat rooms - use generateImageWithSegmentation to extract from node #84
      console.log('[API] Normal room detected - using node #84 (bypasses segmentation)');
      const generationPromise = generateImageWithSegmentation(
        prompt,
        false, // isCombatRoom = false
        aspectRatio || 'landscape',
        width,
        height,
        numSteps
      ).finally(() => {
        // Remove from map when done (success or failure)
        imageGenerationInProgress.delete(promptKey);
      });
      
      imageGenerationInProgress.set(promptKey, generationPromise.then(r => r?.imageUrl || null));
      
      result = await generationPromise;

      if (!result || !result.imageUrl) {
        console.error('[API] Normal room image generation returned null');
        return NextResponse.json(
          { error: 'Failed to generate image. Is ComfyUI server running?' },
          { status: 500 }
        );
      }

      console.log('[API] Normal room image generated successfully:', result.imageUrl.substring(0, 50) + '...');
      // #region agent log
      const fs2 = require('fs');
      const logPath2 = 'c:\\Projects\\Api Game\\.cursor\\debug.log';
      const logEntry2 = JSON.stringify({location:'generate-image/route.ts:46',message:'Normal room image generation completed',data:{hasImageUrl:!!result.imageUrl,imageUrlPreview:result.imageUrl?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
      try { fs2.appendFileSync(logPath2, logEntry2); } catch(e) {}
      // #endregion
      return NextResponse.json({ imageUrl: result.imageUrl });
    }
  } catch (error) {
    console.error('Error in generate-image API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

