import { fal } from '@fal-ai/client';

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  size?: '512' | '768' | '1024';
  width?: number;
  height?: number;
}

/**
 * WebSocket connection manager for Fal.ai realtime image generation
 * Establishes connection once on initialization, then reuses for all requests
 */
class FalRealtimeManager {
  private connection: any = null;
  private apiKey: string | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private pendingRequests: Map<string, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

  /**
   * Initialize WebSocket connection to Fal.ai
   * Should be called once when game/component mounts
   */
  async initialize(apiKey: string): Promise<void> {
    // If already connected or connecting, return existing promise
    if (this.connection) {
      return;
    }
    
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.apiKey = apiKey;
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: apiKey,
    });

    this.connectionPromise = (async () => {
      try {
        console.log('Initializing Fal.ai WebSocket connection...');
        
        // Establish WebSocket connection using fal.realtime
        // fal.realtime.connect() uses callbacks, so we need to handle results via promises
        if (fal.realtime && typeof fal.realtime.connect === 'function') {
          // Create a connection with a handler that resolves promises
          this.connection = fal.realtime.connect('fal-ai/z-image/turbo', {
            connectionKey: 'fal-image-generation', // Reuse same connection
            onResult: (result: any) => {
              // Match result to pending request by request_id
              const requestId = result.request_id;
              const pending = this.pendingRequests.get(requestId);
              if (pending) {
                this.pendingRequests.delete(requestId);
                pending.resolve(result);
              }
            },
            onError: (error: any) => {
              console.error('Realtime connection error:', error);
              // Reject all pending requests on error
              this.pendingRequests.forEach(({ reject }) => reject(error));
              this.pendingRequests.clear();
            },
          });
          
          console.log('Fal.ai WebSocket connection established');
        } else {
          // Fallback: Use fal.subscribe but maintain connection state
          console.warn('fal.realtime not available, using connection pooling fallback');
          this.connection = { type: 'fallback' }; // Mark as fallback mode
        }
        
        this.isConnecting = false;
      } catch (error) {
        console.error('Failed to initialize Fal.ai WebSocket connection:', error);
        this.isConnecting = false;
        this.connection = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Generate image using existing WebSocket connection
   */
  async generateImage(options: ImageGenerationOptions): Promise<string> {
    if (!this.connection) {
      throw new Error('Fal.ai connection not initialized. Call initialize() first.');
    }

    const { prompt, negativePrompt, aspectRatio = 'landscape', size = '1024', width, height } = options;

    // Note: Don't enhance prompt here - preserve strict topology control from buildRoomPrompt
    // The prompt already contains all necessary style information

    // Build input with CRITICAL settings to prevent hallucinations
    const buildInput = () => {
      const input: any = {
        prompt: prompt,
        num_inference_steps: 8, // Keep at 8 for quality (do not lower)
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'png',
        enable_prompt_expansion: false, // CRITICAL: Disable auto-expansion to prevent hallucinations
      };

      // Use custom width/height if provided, otherwise fall back to aspect ratio
      // For landscape, default to 1920x1080
      if (width && height) {
        input.width = width;
        input.height = height;
        console.log(`[FAL-REALTIME] Using custom dimensions: ${width}x${height}`);
      } else if (aspectRatio === 'landscape') {
        // Default to 1920x1080 for landscape
        input.width = 1920;
        input.height = 1080;
        console.log('[FAL-REALTIME] Using default landscape dimensions: 1920x1080');
      } else {
        // Map other aspect ratios to valid fal.ai image_size values
        let imageSize: string;
        switch (aspectRatio) {
          case 'square':
            imageSize = 'square_hd';
            break;
          case 'portrait':
            imageSize = 'portrait_4_3';
            break;
          default:
            // Fallback to 1920x1080
            input.width = 1920;
            input.height = 1080;
            console.log('[FAL-REALTIME] Using fallback dimensions: 1920x1080');
            break;
        }
        if (imageSize) {
          input.image_size = imageSize;
        }
      }

      // Add negative prompt if provided
      if (negativePrompt) {
        input.negative_prompt = negativePrompt;
      }

      // Log the final input to verify dimensions
      console.log('[FAL-REALTIME] Final input parameters:', JSON.stringify({
        width: input.width,
        height: input.height,
        image_size: input.image_size,
        hasCustomDimensions: !!(input.width && input.height)
      }, null, 2));

      return input;
    };

    try {
      console.log('Sending image generation request through WebSocket...');
      console.log(`[FAL-REALTIME] Options: width=${width}, height=${height}, aspectRatio=${aspectRatio}`);

      let result: any;
      
      // Check if using realtime connection or fallback
      if (this.connection && this.connection.type === 'fallback') {
        // Fallback: Use fal.subscribe (connection may be pooled by library)
        result = await fal.subscribe('fal-ai/z-image/turbo', {
          input: buildInput(),
          logs: true,
        });
      } else if (this.connection && typeof this.connection.send === 'function') {
        // Use WebSocket connection with promise-based wrapper
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create promise that will be resolved by onResult callback
        const promise = new Promise<any>((resolve, reject) => {
          this.pendingRequests.set(requestId, { resolve, reject });
          
          // Set timeout to reject if no response
          setTimeout(() => {
            if (this.pendingRequests.has(requestId)) {
              this.pendingRequests.delete(requestId);
              reject(new Error('Request timeout'));
            }
          }, 60000); // 60 second timeout
        });
        
        // Send request through WebSocket
        this.connection.send({
          request_id: requestId,
          input: buildInput(),
        });
        
        // Wait for result via callback
        result = await promise;
      } else {
        throw new Error('Invalid connection state');
      }

      console.log('Image generation completed, extracting URL...');

      // Extract image URL from result
      let imageUrl: string | null = null;

      if (result && result.images && result.images.length > 0) {
        // Standard fal.ai response format
        imageUrl = result.images[0].url || result.images[0];
      } else if (result && result.data && result.data.images && result.data.images.length > 0) {
        // Alternative response format
        imageUrl = result.data.images[0].url;
      }

      if (!imageUrl) {
        console.error('Unexpected result structure:', result);
        throw new Error('No image URL in result. Result structure: ' + JSON.stringify(result));
      }

      return imageUrl;
    } catch (error) {
      console.error('Error generating image with Fal.ai WebSocket:', error);
      console.log('[FAL-REALTIME] Attempting HTTP fallback due to error...');
      
      // Fallback to HTTP API route
      try {
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            negativePrompt: negativePrompt,
            aspectRatio,
            size,
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log('[FAL-REALTIME] HTTP API response:', imageData);
          if (imageData.imageUrl) {
            console.log('[FAL-REALTIME] Extracted imageUrl from HTTP response:', imageData.imageUrl);
            return imageData.imageUrl;
          } else {
            console.error('[FAL-REALTIME] HTTP response missing imageUrl field:', imageData);
            throw new Error('HTTP response missing imageUrl field');
          }
        } else {
          const errorText = await imageResponse.text();
          console.error('[FAL-REALTIME] HTTP API error:', imageResponse.status, errorText);
          throw new Error(`HTTP API error: ${imageResponse.status}`);
        }
      } catch (httpError) {
        console.error('[FAL-REALTIME] HTTP fallback also failed:', httpError);
        throw error; // Re-throw original error
      }
    }
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Close WebSocket connection
   * Should be called on component unmount or game cleanup
   */
  close(): void {
    if (this.connection) {
      try {
        this.connection.close();
      } catch (error) {
        console.error('Error closing Fal.ai WebSocket connection:', error);
      }
      this.connection = null;
      this.isConnecting = false;
      this.connectionPromise = null;
      console.log('Fal.ai WebSocket connection closed');
    }
  }
}

// Export singleton instance
export const falRealtime = new FalRealtimeManager();

