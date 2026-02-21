import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route for ComfyUI images to fix CORS issues
 * Fetches images from ComfyUI server server-side and returns them to the client
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    const subfolder = searchParams.get('subfolder') || '';
    const type = searchParams.get('type') || 'output';

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename parameter' },
        { status: 400 }
      );
    }

    // Get ComfyUI server URL from environment
    const serverUrl = process.env.COMFYUI_SERVER_URL || 'http://127.0.0.1:8188';
    
    // Build ComfyUI image URL
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });
    const comfyuiImageUrl = `${serverUrl}/view?${params.toString()}`;

    console.log('[ComfyUI Proxy] Fetching image from:', comfyuiImageUrl);

    // Fetch image from ComfyUI server (server-side, no CORS issues)
    const imageResponse = await fetch(comfyuiImageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.error('[ComfyUI Proxy] Failed to fetch image:', imageResponse.status, imageResponse.statusText);
      return NextResponse.json(
        { error: `Failed to fetch image from ComfyUI: ${imageResponse.statusText}` },
        { status: imageResponse.status }
      );
    }

    // Get image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
    });
  } catch (error) {
    console.error('[ComfyUI Proxy] Error proxying image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to proxy image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}











