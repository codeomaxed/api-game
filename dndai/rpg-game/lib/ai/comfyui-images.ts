import { getComfyUIClient, WorkflowOptions, ComfyUIWorkflow } from './comfyui-client';
import fs from 'fs';
import path from 'path';

// Module-level warmup flag - tracks if segmentation models have been warmed up
// This ensures warmup runs once per server process, automatically on first combat room
let _warmupCompleted = false;
let _warmupInProgress = false;

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  size?: '512' | '768' | '1024';
  width?: number;
  height?: number;
  numSteps?: number;
}

export interface ImageGenerationResult {
  imageUrl: string; // Original image (node #9) - kept for compatibility/fallback
  segmentedUrl?: string; // Segmented monster (node #62)
  backgroundUrl?: string; // Background without monster (node #83) - NEW
}

/**
 * Get image dimensions based on aspect ratio
 */
function getDimensions(aspectRatio: 'square' | 'portrait' | 'landscape', width?: number, height?: number): { width: number; height: number } {
  if (width && height) {
    return { width, height };
  }

  switch (aspectRatio) {
    case 'landscape':
      return { width: 1216, height: 832 };
    case 'portrait':
      return { width: 768, height: 1024 };
    case 'square':
    default:
      return { width: 1216, height: 832 };
  }
}

/**
 * Generate image using ComfyUI workflow
 */
export async function generateImageWithComfyUI(
  options: ImageGenerationOptions
): Promise<string | null> {
  const { prompt, aspectRatio = 'landscape', width, height, numSteps } = options;
  const dimensions = getDimensions(aspectRatio, width, height);

  // #region agent log
  const fs = require('fs');
  const logPath = 'c:\\Projects\\Api Game\\.cursor\\debug.log';
  const logEntry = JSON.stringify({location:'comfyui-images.ts:39',message:'generateImageWithComfyUI called',data:{hasPrompt:!!prompt,promptPreview:prompt?.substring(0,50),aspectRatio},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
  try { fs.appendFileSync(logPath, logEntry); } catch(e) {}
  // #endregion

  const client = getComfyUIClient();

  try {
    // Check server health first
    const isHealthy = await client.checkServerHealth();
    if (!isHealthy) {
      console.error('[ComfyUI] Server is not reachable');
      return null;
    }

    console.log('[ComfyUI] Generating image with prompt:', prompt.substring(0, 100) + '...');
    console.log('[ComfyUI] Dimensions:', dimensions);
    if (numSteps) {
      console.log('[ComfyUI] Using custom steps:', numSteps);
    }

    const workflowOptions: WorkflowOptions = {
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      numSteps: numSteps,
      enableSegmentation: false, // Regular image generation, no segmentation
    };

    const imageUrls = await client.executeWorkflow(workflowOptions);

    if (imageUrls.length === 0) {
      console.error('[ComfyUI] No images returned from workflow');
      return null;
    }

    // Return the first image (from node #9 SaveImage)
    const imageUrl = imageUrls[0];
    console.log('[ComfyUI] Image generated successfully:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('[ComfyUI] Error generating image:', error);
    if (error instanceof Error) {
      console.error('[ComfyUI] Error details:', error.message);
    }
    return null;
  }
}

/**
 * Execute Character Segment workflow to extract monster from image
 * @param imageFilename - Filename of the uploaded image in ComfyUI input folder
 * @returns URL of the segmented image with alpha channel
 */
export async function executeCharacterSegmentWorkflow(imageFilename: string): Promise<string | null> {
  const client = getComfyUIClient();
  
  try {
    // Load the Character Segment workflow
    // Try multiple path resolution strategies for Next.js compatibility
    let workflowPath: string | null = null;
    
    // Strategy 1: Try environment variable
    if (process.env.COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH) {
      workflowPath = process.env.COMFYUI_CHARACTER_SEGMENT_WORKFLOW_PATH;
      console.log('[ComfyUI] Using Character Segment workflow from environment variable:', workflowPath);
    } else {
      // Strategy 2: Calculate from workspace root (same pattern as ComfyUI client)
      // In Next.js, process.cwd() is usually the project root (rpg-game directory)
      // We need to go up two levels to get to workspace root
      const basePath = process.cwd(); // This should be rpg-game directory
      const calculatedPath = path.resolve(
        basePath,
        '..',
        '..',
        'Image Generator',
        'ComfyUI_windows_portable',
        'Api Workflow',
        'Character Segment.json'
      );
      
      // Verify the file exists before using it
      if (fs.existsSync(calculatedPath)) {
        workflowPath = calculatedPath;
        console.log('[ComfyUI] Using Character Segment workflow from calculated path:', workflowPath);
      } else {
        // Strategy 3: Try absolute path from common workspace locations
        const workspaceRoots = [
          path.resolve(basePath, '..', '..'),
          path.resolve(basePath, '..'),
          basePath,
        ];
        
        for (const root of workspaceRoots) {
          const testPath = path.resolve(
            root,
            'Image Generator',
            'ComfyUI_windows_portable',
            'Api Workflow',
            'Character Segment.json'
          );
          if (fs.existsSync(testPath)) {
            workflowPath = testPath;
            console.log('[ComfyUI] Found Character Segment workflow at:', workflowPath);
            break;
          }
        }
      }
    }

    if (!workflowPath) {
      const errorMsg = `Character Segment workflow not found. Searched from: ${process.cwd()}`;
      console.error('[ComfyUI]', errorMsg);
      throw new Error(errorMsg);
    }

    if (!fs.existsSync(workflowPath)) {
      const errorMsg = `Character Segment workflow file does not exist: ${workflowPath}`;
      console.error('[ComfyUI]', errorMsg);
      throw new Error(errorMsg);
    }

    let workflow: ComfyUIWorkflow;
    try {
      console.log('[ComfyUI] Loading Character Segment workflow from:', workflowPath);
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      workflow = JSON.parse(workflowContent);
      console.log('[ComfyUI] ✓ Character Segment workflow loaded successfully');
    } catch (error) {
      console.error('[ComfyUI] Failed to load Character Segment workflow:', error);
      if (error instanceof Error) {
        console.error('[ComfyUI] Error details:', error.message);
        console.error('[ComfyUI] Error stack:', error.stack);
      }
      throw new Error(`Failed to load Character Segment workflow from ${workflowPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Modify node #6 (LoadImage) to use the uploaded image
    if (workflow['6'] && workflow['6'].inputs) {
      console.log('[ComfyUI] Modifying node #6 (LoadImage) to use image:', imageFilename);
      workflow['6'].inputs.image = imageFilename;
      console.log('[ComfyUI] ✓ Node #6 updated with image filename');
    } else {
      console.error('[ComfyUI] Character Segment workflow structure:', Object.keys(workflow));
      throw new Error('Character Segment workflow missing node #6 (LoadImage)');
    }

    // Ensure node #4 (SAM3Segment) has "character" prompt
    if (workflow['4'] && workflow['4'].inputs) {
      console.log('[ComfyUI] Ensuring node #4 (SAM3Segment) has "character" prompt');
      workflow['4'].inputs.prompt = 'character';
      console.log('[ComfyUI] ✓ Node #4 prompt set to "character"');
    } else {
      console.warn('[ComfyUI] Warning: Character Segment workflow missing node #4 (SAM3Segment)');
    }

    console.log('[ComfyUI] ====== EXECUTING CHARACTER SEGMENT WORKFLOW ======');
    console.log('[ComfyUI] Image filename:', imageFilename);
    console.log('[ComfyUI] Workflow nodes:', Object.keys(workflow).join(', '));

    // Queue the workflow
    const response = await fetch(`${client.getServerUrl()}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: client.getClientId(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const promptId = result.prompt_id;
    console.log('[ComfyUI] Character Segment workflow queued with prompt_id:', promptId);

    // Poll for completion (using internal method access)
    console.log('[ComfyUI] Polling for workflow completion, prompt_id:', promptId);
    const historyItem = await (client as any).pollWorkflowStatus(promptId);

    if (historyItem.status?.status_str === 'error') {
      console.error('[ComfyUI] Character Segment workflow execution failed with error status');
      console.error('[ComfyUI] Workflow history:', JSON.stringify(historyItem, null, 2));
      throw new Error(`Character Segment workflow execution failed for prompt_id: ${promptId}`);
    }

    console.log('[ComfyUI] ✓ Character Segment workflow completed successfully');
    console.log('[ComfyUI] Workflow outputs:', Object.keys(historyItem.outputs || {}).join(', '));

    // Extract image from node #5 (SaveImageWithAlpha)
    const imageUrls = (client as any).extractImageUrls(historyItem);
    
    console.log('[ComfyUI] Extracted image URLs from workflow:', imageUrls.length, 'images');
    imageUrls.forEach((url: string, index: number) => {
      console.log(`[ComfyUI]   Image ${index + 1}: ${url.substring(0, 80)}...`);
    });
    
    if (imageUrls.length === 0) {
      console.error('[ComfyUI] ❌ No images returned from Character Segment workflow');
      console.error('[ComfyUI] Workflow history outputs:', JSON.stringify(historyItem.outputs, null, 2));
      return null;
    }

    // Node #5 should be the SaveImageWithAlpha output
    // It should be the last image in the array or we can check node outputs
    const segmentedUrl = imageUrls[imageUrls.length - 1];
    console.log('[ComfyUI] ✓ Character Segment workflow completed successfully');
    console.log('[ComfyUI] Segmented image URL:', segmentedUrl);
    console.log('[ComfyUI] ====== CHARACTER SEGMENT WORKFLOW COMPLETE ======');
    
    return segmentedUrl;
  } catch (error) {
    console.error('[ComfyUI] Error executing Character Segment workflow:', error);
    if (error instanceof Error) {
      console.error('[ComfyUI] Error details:', error.message);
    }
    return null;
  }
}

/**
 * Generate image with automatic segmentation for combat rooms
 * Uses single workflow execution with segmentation enabled in Comfy API.json
 */
export async function generateImageWithSegmentation(
  prompt: string,
  isCombatRoom: boolean = false,
  aspectRatio: 'square' | 'portrait' | 'landscape' | undefined = 'landscape',
  width?: number,
  height?: number,
  numSteps?: number
): Promise<ImageGenerationResult | null> {
  const dimensions = getDimensions(aspectRatio, width, height);
  const client = getComfyUIClient();

  // Log entry point with all parameters
  console.log('[ComfyUI] ====== generateImageWithSegmentation CALLED ======');
  console.log('[ComfyUI] Parameters:');
  console.log('[ComfyUI]   - isCombatRoom:', isCombatRoom);
  console.log('[ComfyUI]   - _warmupCompleted:', _warmupCompleted);
  console.log('[ComfyUI]   - _warmupInProgress:', _warmupInProgress);
  console.log('[ComfyUI]   - prompt length:', prompt.length);
  console.log('[ComfyUI]   - dimensions:', dimensions);

  try {
    // Check server health first
    const isHealthy = await client.checkServerHealth();
    if (!isHealthy) {
      console.error('[ComfyUI] Server is not reachable');
      return null;
    }
    console.log('[ComfyUI] ✓ Server health check passed');

    // Automatic warmup for combat rooms - runs once per server process
    // Make this more explicit and ensure it always runs for first combat room
    if (isCombatRoom) {
      console.log('[ComfyUI] ====== COMBAT ROOM DETECTED ======');
      console.log('[ComfyUI] Warmup state check:');
      console.log('[ComfyUI]   - _warmupCompleted:', _warmupCompleted);
      console.log('[ComfyUI]   - _warmupInProgress:', _warmupInProgress);
      
      if (!_warmupCompleted && !_warmupInProgress) {
        console.log('[ComfyUI] ====== FIRST COMBAT ROOM - RUNNING AUTOMATIC WARMUP ======');
        console.log('[ComfyUI] This will take ~15-20 seconds but ensures all subsequent combat rooms are fast');
        console.log('[ComfyUI] Starting warmup workflow now...');
        _warmupInProgress = true;
        const warmupStartTime = Date.now();
        try {
          await warmupSegmentationWorkflow();
          const warmupElapsed = Date.now() - warmupStartTime;
          _warmupCompleted = true;
          console.log(`[ComfyUI] ✓ Warmup completed in ${warmupElapsed}ms - all subsequent combat rooms will be fast`);
        } catch (warmupError) {
          const warmupElapsed = Date.now() - warmupStartTime;
          console.error(`[ComfyUI] ⚠ Warmup failed after ${warmupElapsed}ms but continuing with generation:`, warmupError);
          if (warmupError instanceof Error) {
            console.error('[ComfyUI] Warmup error message:', warmupError.message);
            console.error('[ComfyUI] Warmup error stack:', warmupError.stack);
          }
          // Continue anyway - generation will work but may be slower
        } finally {
          _warmupInProgress = false;
          console.log('[ComfyUI] Warmup process completed, _warmupInProgress set to false');
        }
      } else if (_warmupCompleted) {
        console.log('[ComfyUI] ✓ Models already warmed up - this combat room will be fast');
      } else if (_warmupInProgress) {
        console.log('[ComfyUI] ⚠ Warmup is already in progress - waiting for it to complete');
        // Wait a bit for warmup to complete (shouldn't happen, but just in case)
        let waitCount = 0;
        while (_warmupInProgress && waitCount < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          waitCount++;
          console.log(`[ComfyUI] Waiting for warmup to complete... (${waitCount}/30)`);
        }
      }
    } else {
      console.log('[ComfyUI] Non-combat room - skipping warmup');
    }

    console.log('[ComfyUI] ====== GENERATING IMAGE WITH SEGMENTATION (SINGLE WORKFLOW) ======');
    console.log('[ComfyUI] Prompt:', prompt.substring(0, 100) + '...');
    console.log('[ComfyUI] Is combat room:', isCombatRoom);
    console.log('[ComfyUI] Dimensions:', dimensions);

    if (!isCombatRoom) {
      // Non-combat rooms: extract from node #84 (bypasses segmentation)
      console.log('[ComfyUI] Normal room detected - using node #84 (bypasses segmentation)');
      
      const workflowOptions: WorkflowOptions = {
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        numSteps: numSteps,
        enableSegmentation: false,
      };

      // Execute workflow and poll for status (similar to combat rooms)
      const historyItem = await (client as any).pollWorkflowStatus(
        await client.queueWorkflow(workflowOptions)
      );

      if (historyItem.status?.status_str === 'error') {
        console.error('[ComfyUI] Workflow execution failed with error status');
        throw new Error('Workflow execution failed');
      }

      console.log('[ComfyUI] ✓ Workflow completed successfully');
      const outputNodeIds = Object.keys(historyItem.outputs || {});
      console.log('[ComfyUI] Workflow outputs:', outputNodeIds.join(', '));
      
      // Log all output nodes with their image filenames for debugging
      console.log('[ComfyUI] Detailed output nodes:');
      for (const [nodeId, output] of Object.entries(historyItem.outputs || {})) {
        if (output.images && Array.isArray(output.images) && output.images.length > 0) {
          const imageInfo = output.images[0];
          console.log(`[ComfyUI]   Node #${nodeId}: ${imageInfo.filename} (type: ${imageInfo.type}, subfolder: ${imageInfo.subfolder || 'none'})`);
        }
      }

      // Extract image from node #84 specifically (normal node output)
      let imageUrl: string | null = null;

      if (historyItem.outputs?.['84']?.images && historyItem.outputs['84'].images.length > 0) {
        const normalImage = historyItem.outputs['84'].images[0];
        imageUrl = client.getImageUrl(normalImage.filename, normalImage.subfolder || '', normalImage.type || 'output');
        console.log('[ComfyUI] ✓✓✓ Normal room image extracted from node #84 ✓✓✓');
        console.log('[ComfyUI] Image URL:', imageUrl.substring(0, 100) + '...');
        console.log('[ComfyUI] Image filename:', normalImage.filename);
      } else {
        console.warn('[ComfyUI] ⚠⚠⚠ No image found in node #84 output - checking other output nodes ⚠⚠⚠');
        console.warn('[ComfyUI] Available output nodes:', outputNodeIds.join(', '));
        
        // Fallback: prioritize Save Image nodes, skip preview/mask nodes
        const skipPatterns = ['mask_preview', 'preview', 'temp'];
        let foundFallback = false;
        
        // First pass: look for Save Image nodes (usually in 'output' type, not 'temp')
        for (const [nodeId, output] of Object.entries(historyItem.outputs || {})) {
          if (output.images && Array.isArray(output.images) && output.images.length > 0) {
            const fallbackImage = output.images[0];
            const filename = fallbackImage.filename.toLowerCase();
            const imageType = fallbackImage.type || '';
            
            // Skip mask preview and temp images
            if (skipPatterns.some(pattern => filename.includes(pattern))) {
              console.log(`[ComfyUI]   Skipping node #${nodeId} (mask/preview/temp): ${fallbackImage.filename}`);
              continue;
            }
            
            // Prefer 'output' type over 'temp'
            if (imageType === 'output' || !foundFallback) {
              imageUrl = client.getImageUrl(fallbackImage.filename, fallbackImage.subfolder || '', fallbackImage.type || 'output');
              console.warn(`[ComfyUI] ⚠ Using fallback image from node #${nodeId}:`, imageUrl.substring(0, 100) + '...');
              console.warn(`[ComfyUI] Fallback image filename: ${fallbackImage.filename}`);
              console.warn(`[ComfyUI] Fallback image type: ${imageType}`);
              foundFallback = true;
              
              // If we found an 'output' type, use it and stop looking
              if (imageType === 'output') {
                break;
              }
            }
          }
        }
      }

      if (!imageUrl) {
        console.error('[ComfyUI] ❌ No image generated for normal room');
        return null;
      }

      console.log('[ComfyUI] ====== NORMAL ROOM IMAGE GENERATION COMPLETE ======');
      
      return {
        imageUrl,
        segmentedUrl: undefined,
      };
    }

    // Combat rooms: single workflow execution with segmentation enabled
    console.log('[ComfyUI] Combat room detected - using single workflow with segmentation enabled');
    console.log('[ComfyUI] Node #59 will be set to "Character" prompt');
    console.log('[ComfyUI] Node #62 will output segmented image with alpha channel');
    
    const workflowOptions: WorkflowOptions = {
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      numSteps: numSteps,
      enableSegmentation: true,
      segmentationPrompt: 'character', // Set node #59 prompt to "Character"
    };

    // Execute workflow once - it will generate both base image and segmented image
    const historyItem = await (client as any).pollWorkflowStatus(
      await client.queueWorkflow(workflowOptions)
    );

    if (historyItem.status?.status_str === 'error') {
      console.error('[ComfyUI] Workflow execution failed with error status');
      throw new Error('Workflow execution failed');
    }

    console.log('[ComfyUI] ✓ Workflow completed successfully');
    console.log('[ComfyUI] Workflow outputs:', Object.keys(historyItem.outputs || {}).join(', '));

    // Extract images from specific nodes
    // Node #9: Base image (Save Image) - original with monster
    // Node #62: Segmented image with alpha (Save Image With Alpha)
    // Node #83: Background without monster (NEW)
    let imageUrl: string | null = null;
    let segmentedUrl: string | undefined = undefined;
    let backgroundUrl: string | undefined = undefined;

    // Extract base image from node #9 (keep for compatibility/fallback)
    if (historyItem.outputs?.['9']?.images && historyItem.outputs['9'].images.length > 0) {
      const baseImage = historyItem.outputs['9'].images[0];
      imageUrl = client.getImageUrl(baseImage.filename, baseImage.subfolder || '', baseImage.type || 'output');
      console.log('[ComfyUI] ✓ Base image extracted from node #9:', imageUrl.substring(0, 80) + '...');
    } else {
      console.warn('[ComfyUI] ⚠ No image found in node #9 output');
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-images.ts:439',message:'Node #9 has no output',data:{availableOutputs:Object.keys(historyItem.outputs||{}),outputDetails:Object.keys(historyItem.outputs||{}).map(k=>({node:k,hasImages:!!historyItem.outputs?.[k]?.images,imageCount:historyItem.outputs?.[k]?.images?.length||0}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }

    // Extract background without monster from node #83 (NEW)
    if (historyItem.outputs?.['83']?.images && historyItem.outputs['83'].images.length > 0) {
      const bgImage = historyItem.outputs['83'].images[0];
      backgroundUrl = client.getImageUrl(bgImage.filename, bgImage.subfolder || '', bgImage.type || 'output');
      console.log('[ComfyUI] ✓ Background (monster removed) extracted from node #83:', backgroundUrl.substring(0, 80) + '...');
    } else {
      console.warn('[ComfyUI] ⚠ No image found in node #83 output - will use node #9 as fallback');
      console.warn('[ComfyUI] Available output nodes:', Object.keys(historyItem.outputs || {}).join(', '));
    }

    // Extract segmented image from node #62 (unchanged)
    if (historyItem.outputs?.['62']?.images && historyItem.outputs['62'].images.length > 0) {
      const segmentedImage = historyItem.outputs['62'].images[0];
      segmentedUrl = client.getImageUrl(segmentedImage.filename, segmentedImage.subfolder || '', segmentedImage.type || 'output');
      console.log('[ComfyUI] ✓✓✓ SEGMENTED IMAGE EXTRACTED FROM NODE #62 ✓✓✓');
      console.log('[ComfyUI] Segmented URL:', segmentedUrl.substring(0, 80) + '...');
    } else {
      console.warn('[ComfyUI] ⚠ No segmented image found in node #62 output');
      console.warn('[ComfyUI] Available output nodes:', Object.keys(historyItem.outputs || {}).join(', '));
    }

    // Use backgroundUrl if available, otherwise fallback to imageUrl
    const finalImageUrl = backgroundUrl || imageUrl;

    if (!finalImageUrl) {
      console.error('[ComfyUI] ❌ No base image generated');
      return null;
    }

    console.log('[ComfyUI] ====== SINGLE WORKFLOW SEGMENTATION COMPLETE ======');
    console.log('[ComfyUI] Using background image:', backgroundUrl ? 'node #83 (monster removed)' : 'node #9 (fallback)');
    
    return {
      imageUrl: finalImageUrl, // Use background without monster if available
      segmentedUrl,
      backgroundUrl, // Also return separately for explicit use
    };
  } catch (error) {
    console.error('[ComfyUI] Error generating image with segmentation:', error);
    if (error instanceof Error) {
      console.error('[ComfyUI] Error details:', error.message);
      if (error.stack) {
        console.error('[ComfyUI] Error stack:', error.stack);
      }
    }
    return null;
  }
}

/**
 * Warmup segmentation workflow to pre-load and compile models
 * Runs silently in background to prepare models for fast subsequent runs
 * This should be called once when entering the dungeon to warm up BigLama and SAM3 models
 */
export async function warmupSegmentationWorkflow(): Promise<void> {
  const client = getComfyUIClient();
  
  try {
    console.log('[ComfyUI] ====== WARMING UP SEGMENTATION WORKFLOW ======');
    console.log('[ComfyUI] Step 1: Checking server health...');
    
    // Check server health first
    const isHealthy = await client.checkServerHealth();
    if (!isHealthy) {
      const errorMsg = '[ComfyUI] ❌ Server is not reachable - cannot warmup';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    console.log('[ComfyUI] ✓ Server is healthy');

    // Use minimal prompt to trigger model loading
    // Enable segmentation to load BigLama and SAM3 models
    const workflowOptions: WorkflowOptions = {
      prompt: 'dark dungeon room', // Minimal prompt just to trigger workflow
      width: 1216,
      height: 832,
      numSteps: 3, // Minimal steps for warmup
      enableSegmentation: true,
      segmentationPrompt: 'character', // Trigger SAM3 and BigLama loading
    };

    console.log('[ComfyUI] Step 2: Queueing warmup workflow...');
    console.log('[ComfyUI]   - Prompt: "dark dungeon room"');
    console.log('[ComfyUI]   - Dimensions: 1216x832');
    console.log('[ComfyUI]   - Segmentation: enabled');
    console.log('[ComfyUI]   - This will load BigLama and SAM3 models...');
    
    const startTime = Date.now();
    let promptId: string;
    
    try {
      promptId = await client.queueWorkflow(workflowOptions);
      console.log(`[ComfyUI] ✓ Workflow queued with prompt_id: ${promptId}`);
    } catch (queueError) {
      console.error('[ComfyUI] ❌ Failed to queue workflow:', queueError);
      if (queueError instanceof Error) {
        console.error('[ComfyUI] Queue error message:', queueError.message);
        console.error('[ComfyUI] Queue error stack:', queueError.stack);
      }
      throw queueError;
    }
    
    console.log('[ComfyUI] Step 3: Waiting for workflow completion...');
    console.log('[ComfyUI]   - This may take 15-20 seconds (model loading + warmup)');
    
    // Execute workflow - this will load BigLama model and trigger warmup
    let historyItem;
    try {
      historyItem = await (client as any).pollWorkflowStatus(promptId);
    } catch (pollError) {
      console.error('[ComfyUI] ❌ Failed to poll workflow status:', pollError);
      if (pollError instanceof Error) {
        console.error('[ComfyUI] Poll error message:', pollError.message);
        console.error('[ComfyUI] Poll error stack:', pollError.stack);
      }
      throw pollError;
    }

    const elapsed = Date.now() - startTime;
    
    if (historyItem.status?.status_str === 'error') {
      const errorMsg = '[ComfyUI] ❌ Warmup workflow completed with error status';
      console.error(errorMsg);
      console.error('[ComfyUI] Workflow history:', JSON.stringify(historyItem, null, 2));
      throw new Error(errorMsg);
    }

    console.log(`[ComfyUI] ✓ Warmup complete in ${elapsed}ms - models loaded and compiled`);
    console.log('[ComfyUI] ✓ BigLama model should now be cached and ready');
    console.log('[ComfyUI] ====== SEGMENTATION WARMUP COMPLETE ======');
  } catch (error) {
    // Log comprehensive error information
    console.error('[ComfyUI] ====== WARMUP FAILED ======');
    console.error('[ComfyUI] Error type:', error?.constructor?.name || typeof error);
    console.error('[ComfyUI] Error:', error);
    
    if (error instanceof Error) {
      console.error('[ComfyUI] Error message:', error.message);
      console.error('[ComfyUI] Error stack:', error.stack);
    } else if (typeof error === 'string') {
      console.error('[ComfyUI] Error string:', error);
    } else {
      console.error('[ComfyUI] Error object:', JSON.stringify(error, null, 2));
    }
    
    // Re-throw so caller knows warmup failed
    throw error;
  }
}

/**
 * Generate character portrait
 */
export async function generateCharacterPortrait(
  characterDescription: string,
  equipment: string[]
): Promise<string | null> {
  const equipmentText = equipment.length > 0 
    ? `, wearing ${equipment.join(', ')}`
    : '';
  
  const prompt = `Dark fantasy character portrait, ${characterDescription}${equipmentText}, gothic style, Bloodborne aesthetic, detailed, high quality, portrait view`;

  return generateImageWithComfyUI({
    prompt,
    aspectRatio: 'portrait',
    size: '768',
  });
}

/**
 * Generate enemy/encounter image
 */
export async function generateEnemyImage(
  enemyDescription: string
): Promise<string | null> {
  const prompt = `Dark fantasy monster, ${enemyDescription}, grotesque, menacing, Bloodborne aesthetic, detailed, high quality, dark and gritty`;

  return generateImageWithComfyUI({
    prompt,
    aspectRatio: 'landscape',
    size: '1024',
  });
}

/**
 * Generate loot item image
 */
export async function generateLootImage(
  itemName: string,
  itemDescription: string,
  rarity: string
): Promise<string | null> {
  const rarityStyle: Record<string, string> = {
    Common: 'simple, worn',
    Uncommon: 'well-crafted, polished',
    Rare: 'ornate, magical glow',
    'Very Rare': 'intricate, powerful aura',
    Legendary: 'legendary, divine radiance',
    Artifact: 'ancient, otherworldly power',
  };

  const prompt = `Dark fantasy ${rarity.toLowerCase()} item, ${itemName}, ${itemDescription}, ${rarityStyle[rarity] || 'magical'}, game asset style, 64x64 icon, Bloodborne aesthetic, detailed`;

  return generateImageWithComfyUI({
    prompt,
    aspectRatio: 'square',
    size: '512',
  });
}

/**
 * Generate location image
 */
export async function generateLocationImage(
  locationName: string,
  locationDescription: string
): Promise<string | null> {
  const prompt = `Dark fantasy location, ${locationName}, ${locationDescription}, gothic architecture, desolate, ruined, ominous, Bloodborne aesthetic, detailed, high quality, wide view`;

  return generateImageWithComfyUI({
    prompt,
    aspectRatio: 'landscape',
    size: '1024',
  });
}

