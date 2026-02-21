'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Monster } from '@/lib/game/monsters';
import { segmentMonsterInImage } from '@/lib/ai/monster-segmentation';
import { applySimplePixelation, apply8BitPixelation } from '@/lib/utils/pixelation-filter';
import { animateMonster, findCharacterBounds } from '@/lib/utils/monster-animation';
import { TypingText } from './TypingText';
import { getMonsterAttackPatterns, AttackPattern } from '@/lib/game/monster-attacks';
import { DeathAnimation } from './DeathAnimation';

interface MonsterHighlightProps {
  monster: Monster | null;
  imageUrl: string | null | undefined;
  imagePrompt?: string | null; // The image generation prompt (may contain **monster** format)
  onInteract?: () => void; // Callback for when monster is clicked
  showDetectionBox?: boolean; // Whether to show the detection status box
  cachedSegmentationUrl?: string | null; // Cached segmentation URL from room content
  onSegmentationComplete?: (url: string) => void; // Callback to save segmentation URL to room content
  pixelationEnabled?: boolean; // Whether to apply pixelation effect
  pixelationMode?: 'simple' | '8bit'; // Pixelation mode
  pixelSize?: number; // Pixel size for pixelation
  animationEnabled?: boolean; // Whether to animate the segmented monster
  enemyHP?: { current: number; max: number }; // Enemy HP for display
  enemyLevel?: number; // Enemy level for display
  isDying?: boolean; // Whether monster is in death animation
  onBoundsChange?: (bounds: { centerX: number; centerY: number; top: number; bottom: number; headTop?: number; left: number; right: number; width: number; height: number } | null) => void; // Callback when monster bounds change
  onDyingChange?: (isDying: boolean) => void; // Callback when dying state changes
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

// Attack Icon Component with Tooltip
function AttackIcon({ attack, index }: { attack: AttackPattern; index: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(224, 184, 74, 0.4)',
          borderRadius: '4px',
          cursor: 'help',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(224, 184, 74, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(224, 184, 74, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(224, 184, 74, 0.4)';
        }}
      >
        {attack.icon}
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(224, 184, 74, 0.6)',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#fff',
            whiteSpace: 'nowrap',
            zIndex: 30,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#e0b84a' }}>
            {attack.name}
          </div>
          <div style={{ fontSize: '10px', color: '#ccc' }}>
            {attack.description}
          </div>
        </div>
      )}
    </div>
  );
}

export function MonsterHighlight({ monster, imageUrl, imagePrompt, onInteract, showDetectionBox = false, cachedSegmentationUrl = null, onSegmentationComplete, pixelationEnabled = false, pixelationMode = 'simple', pixelSize, animationEnabled = true, enemyHP, enemyLevel, isDying = false, onBoundsChange, onDyingChange }: MonsterHighlightProps) {
  const [transparentMonsterUrl, setTransparentMonsterUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [isHoveringMonster, setIsHoveringMonster] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [displayBounds, setDisplayBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isSegmentedImageReady, setIsSegmentedImageReady] = useState(false); // Track when segmented image is fully loaded and ready
  const [monsterBounds, setMonsterBounds] = useState<{ centerX: number; centerY: number; top: number; bottom: number; headTop: number; left: number; right: number; width: number; height: number } | null>(null); // Track actual monster position in display coordinates
  const [nameDimensions, setNameDimensions] = useState<{ width: number; height: number } | null>(null); // Track TypingText canvas dimensions
  
  // Canvas ref for pixel detection
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const pixelatedCanvasRef = useRef<HTMLCanvasElement | null>(null); // Canvas for pixelated segmented image
  const segmentedImageRef = useRef<HTMLImageElement | null>(null); // Hidden image element for loading segmented image
  const animatedCanvasRef = useRef<HTMLCanvasElement | null>(null); // Canvas for animated segmented monster
  const animationCleanupRef = useRef<(() => void) | null>(null); // Cleanup function for animation
  const nameWrapperRef = useRef<HTMLDivElement | null>(null); // Ref for name wrapper to measure canvas
  const previousTransparentMonsterUrlRef = useRef<string | null>(null); // Track previous URL to delay cleanup during transitions

  /**
   * Check if a pixel at the given coordinates is transparent
   * @param x - X coordinate in image space
   * @param y - Y coordinate in image space
   * @param img - The image element
   * @returns true if pixel is transparent, false if visible. Returns false (not transparent) if CORS error occurs.
   */
  const checkPixelTransparency = (
    x: number,
    y: number,
    source: HTMLImageElement | HTMLCanvasElement
  ): boolean => {
    // Create or get canvas
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false; // If no context, assume not transparent (allow interaction)

    try {
      let sourceWidth: number;
      let sourceHeight: number;

      if (source instanceof HTMLImageElement) {
        sourceWidth = source.naturalWidth;
        sourceHeight = source.naturalHeight;
      } else {
        sourceWidth = source.width;
        sourceHeight = source.height;
      }

      // Set canvas size to match source
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      // Draw source to canvas
      ctx.drawImage(source, 0, 0);

      // Clamp coordinates to valid range
      const clampedX = Math.max(0, Math.min(Math.floor(x), sourceWidth - 1));
      const clampedY = Math.max(0, Math.min(Math.floor(y), sourceHeight - 1));

      // Get pixel data at coordinates
      const imageData = ctx.getImageData(clampedX, clampedY, 1, 1);
      const alpha = imageData.data[3]; // Alpha channel (0-255)

      // Return true if transparent (alpha < threshold, e.g., 10)
      // This accounts for anti-aliasing edges
      return alpha < 10;
    } catch (error) {
      // CORS error or other issue - fall back to allowing interaction
      // This ensures the feature still works even if pixel detection fails
      console.warn('[MonsterHighlight] Pixel detection failed (CORS?), allowing interaction:', error);
      return false; // Assume not transparent (allow interaction)
    }
  };

  // Load original background image to get its natural dimensions
  useEffect(() => {
    if (!imageUrl) {
      setOriginalImageSize(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        backgroundImageRef.current = img;
      }
    };
    
    img.onerror = () => {
      console.warn('[MonsterHighlight] Failed to load original image for bounds calculation');
    };
    
    img.src = imageUrl;
  }, [imageUrl]);

  // Update display bounds when container or image size changes
  useEffect(() => {
    // CRITICAL: Always use original image size for bounds calculation (matches background)
    // The segmented image should overlay at the exact same position and size as the original
    if (!containerRef.current || !originalImageSize) {
      setDisplayBounds(null);
      return;
    }
    
    // Calculate display bounds to match background image (EXACT same logic as AtmosphericImage)
    // AtmosphericImage uses object-fit: fill behavior - stretches image to fill entire container
    const calculateDisplayBounds = () => {
      if (!containerRef.current || !originalImageSize) return null;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // CRITICAL: Match AtmosphericImage's behavior - stretch to fill entire container
      // This ensures the segmented image overlays at the exact same position as the background
      const drawWidth = containerWidth;
      const drawHeight = containerHeight;
      const drawX = 0;
      const drawY = 0;
      
      console.log('[MonsterHighlight] Display bounds calculated (fill mode):', { drawX, drawY, drawWidth, drawHeight });
      console.log('[MonsterHighlight] Original image size:', originalImageSize);
      console.log('[MonsterHighlight] Container size:', { containerWidth, containerHeight });
      console.log('[MonsterHighlight] Image will be stretched to fill container (matching AtmosphericImage)');
      
      return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
    };
    
    const updateBounds = () => {
      const bounds = calculateDisplayBounds();
      if (bounds) {
        setDisplayBounds(bounds);
        console.log('[MonsterHighlight] displayBounds updated:', bounds);
      }
    };
    
    updateBounds();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [originalImageSize, transparentMonsterUrl]);

  // Reset ready state when URL changes
  useEffect(() => {
    setIsSegmentedImageReady(false);
    setMonsterBounds(null); // Reset monster bounds when URL changes
  }, [transparentMonsterUrl]);

  // Measure TypingText canvas dimensions to properly size wrapper for flex layout
  useEffect(() => {
    if (!nameWrapperRef.current || !monster) {
      setNameDimensions(null);
      return;
    }
    
    const checkDimensions = () => {
      const canvas = nameWrapperRef.current?.querySelector('canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        setNameDimensions({
          width: canvas.width,
          height: canvas.height
        });
      }
    };
    
    // Check multiple times to catch canvas rendering
    checkDimensions();
    const timeout1 = setTimeout(checkDimensions, 50);
    const timeout2 = setTimeout(checkDimensions, 150);
    const timeout3 = setTimeout(checkDimensions, 300);
    
    // Use MutationObserver to watch for canvas changes
    let observer: MutationObserver | null = null;
    if (nameWrapperRef.current && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        checkDimensions();
      });
      observer.observe(nameWrapperRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['width', 'height', 'style']
      });
    }
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [monster?.name]);

  // Render segmented image to canvas with pixelation
  useEffect(() => {
    if (!transparentMonsterUrl || !displayBounds || !pixelatedCanvasRef.current || !pixelationEnabled) return;

    const canvas = pixelatedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display bounds
    canvas.width = displayBounds.width;
    canvas.height = displayBounds.height;

    // Load the segmented image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (!ctx || !displayBounds) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply pixelation if enabled
      if (pixelationEnabled && img.complete) {
        // Create temporary canvas for pixelation processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCanvas.width = displayBounds.width;
          tempCanvas.height = displayBounds.height;
          
          // Draw original image to temp canvas
          tempCtx.drawImage(img, 0, 0, displayBounds.width, displayBounds.height);
          
          // Apply pixelation filter based on mode
          const effectivePixelSize = pixelSize || (pixelationMode === '8bit' ? 6 : 4);
          
          if (pixelationMode === '8bit') {
            apply8BitPixelation(
              tempCanvas,
              ctx,
              0,
              0,
              displayBounds.width,
              displayBounds.height,
              effectivePixelSize
            );
          } else {
            applySimplePixelation(
              tempCanvas,
              ctx,
              0,
              0,
              displayBounds.width,
              displayBounds.height,
              effectivePixelSize
            );
          }
        } else {
          // Fallback: draw image normally if temp canvas creation fails
          ctx.drawImage(img, 0, 0, displayBounds.width, displayBounds.height);
        }
      } else {
        // Draw image normally if pixelation is disabled
        ctx.drawImage(img, 0, 0, displayBounds.width, displayBounds.height);
      }

      // Store reference and mark as ready
      segmentedImageRef.current = img;
      imageRef.current = img; // Also set for pixel detection
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      }
      
      // Calculate monster bounds in display coordinates
      if (displayBounds && canvas) {
        const tempCanvas = document.createElement('canvas');
        const imageBounds = findCharacterBounds(img, tempCanvas);
        if (imageBounds) {
          // Scale bounds from image coordinates to display coordinates
          const scaleX = displayBounds.width / img.naturalWidth;
          const scaleY = displayBounds.height / img.naturalHeight;
          const displayCenterX = displayBounds.x + (imageBounds.centerX * scaleX);
          const displayCenterY = displayBounds.y + (imageBounds.centerY * scaleY);
          const displayTop = displayBounds.y + (imageBounds.minY * scaleY);
          const displayBottom = displayBounds.y + (imageBounds.maxY * scaleY);
          const displayLeft = displayBounds.x + (imageBounds.minX * scaleX);
          const displayRight = displayBounds.x + (imageBounds.maxX * scaleX);
          const displayWidth = imageBounds.width * scaleX;
          const displayHeight = imageBounds.height * scaleY;
          
          const bounds = {
            centerX: displayCenterX,
            centerY: displayCenterY,
            top: displayTop,
            bottom: displayBottom,
            headTop: displayTop, // Use top as headTop fallback
            left: displayLeft,
            right: displayRight,
            width: displayWidth,
            height: displayHeight
          };
          setMonsterBounds(bounds);
          if (onBoundsChange) onBoundsChange(bounds);
          console.log('[MonsterHighlight] Monster bounds calculated (pixelated):', bounds);
        }
      }
      
      // Mark image as ready
      setTimeout(() => {
        setIsSegmentedImageReady(true);
        console.log('[MonsterHighlight] ✓ Pixelated segmented image is now ready and will be displayed');
      }, 100);
    };

    img.onerror = () => {
      console.error('[MonsterHighlight] Failed to load segmented image for pixelation');
    };

    img.src = transparentMonsterUrl;
  }, [transparentMonsterUrl, displayBounds, pixelationEnabled, pixelationMode, pixelSize]);

  // Animate segmented monster with breathing effect
  useEffect(() => {
    // Store current URL before checking conditions
    const currentUrl = transparentMonsterUrl;
    
    if (!transparentMonsterUrl || !displayBounds || !animatedCanvasRef.current || !animationEnabled) {
      // Only cleanup if we're truly stopping (not transitioning)
      // If imageUrl still exists, we might be transitioning - delay cleanup
      if (!imageUrl && animationCleanupRef.current) {
        animationCleanupRef.current();
        animationCleanupRef.current = null;
      }
      return;
    }

    const canvas = animatedCanvasRef.current;
    if (!canvas) return;

    // Set canvas display size to match display bounds
    canvas.style.width = `${displayBounds.width}px`;
    canvas.style.height = `${displayBounds.height}px`;

    // Create offscreen canvas for animation (at natural image size)
    const offscreenCanvas = document.createElement('canvas');
    let animationCleanup: (() => void) | null = null;

    // Load image first to get natural size
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!canvas || !displayBounds) return;

      // Set offscreen canvas to full image size (for animation)
      offscreenCanvas.width = img.naturalWidth;
      offscreenCanvas.height = img.naturalHeight;

      // Set display canvas size to match display bounds
      canvas.width = displayBounds.width;
      canvas.height = displayBounds.height;

      // Calculate monster bounds in display coordinates (once when image loads)
      const tempCanvas = document.createElement('canvas');
      const imageBounds = findCharacterBounds(img, tempCanvas);
      if (imageBounds && displayBounds && containerRef.current) {
        // Get container's position in viewport to convert container-relative to viewport coordinates
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Scale bounds from image coordinates to display coordinates (container-relative)
        const scaleX = displayBounds.width / img.naturalWidth;
        const scaleY = displayBounds.height / img.naturalHeight;
        const containerRelativeCenterX = displayBounds.x + (imageBounds.centerX * scaleX);
        const containerRelativeCenterY = displayBounds.y + (imageBounds.centerY * scaleY);
        const containerRelativeTop = displayBounds.y + (imageBounds.minY * scaleY);
        const containerRelativeBottom = displayBounds.y + (imageBounds.maxY * scaleY);
        const containerRelativeLeft = displayBounds.x + (imageBounds.minX * scaleX);
        const containerRelativeRight = displayBounds.x + (imageBounds.maxX * scaleX);
        const displayWidth = imageBounds.width * scaleX;
        const displayHeight = imageBounds.height * scaleY;
        
        // Convert to viewport coordinates (for animation canvas which is fixed position)
        const displayCenterX = containerRect.left + containerRelativeCenterX;
        const displayCenterY = containerRect.top + containerRelativeCenterY;
        const displayTop = containerRect.top + containerRelativeTop;
        const displayBottom = containerRect.top + containerRelativeBottom;
        const displayLeft = containerRect.left + containerRelativeLeft;
        const displayRight = containerRect.left + containerRelativeRight;
        
        // Head/chest is top 45% of character, so head top is at the top of character bounds
        const displayHeadTop = displayTop;
        
        const bounds = {
          centerX: displayCenterX,
          centerY: displayCenterY,
          top: displayTop,
          bottom: displayBottom,
          headTop: displayHeadTop,
          left: displayLeft,
          right: displayRight,
          width: displayWidth,
          height: displayHeight
        };
        setMonsterBounds(bounds);
        if (onBoundsChange) onBoundsChange(bounds);
        console.log('[MonsterHighlight] Monster bounds calculated (animated):', bounds);
      }

      // Start animation on offscreen canvas (full image size)
      animationCleanup = animateMonster(transparentMonsterUrl, offscreenCanvas, () => {
        // This callback runs on each frame
        if (!canvas || !displayBounds) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear display canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply pixelation if enabled
        if (pixelationEnabled) {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCanvas.width = displayBounds.width;
            tempCanvas.height = displayBounds.height;

            // Draw offscreen canvas (full image size) scaled to display bounds
            tempCtx.drawImage(offscreenCanvas, 0, 0, displayBounds.width, displayBounds.height);

            // Apply pixelation
            const effectivePixelSize = pixelSize || (pixelationMode === '8bit' ? 6 : 4);

            if (pixelationMode === '8bit') {
              apply8BitPixelation(
                tempCanvas,
                ctx,
                0,
                0,
                displayBounds.width,
                displayBounds.height,
                effectivePixelSize
              );
            } else {
              applySimplePixelation(
                tempCanvas,
                ctx,
                0,
                0,
                displayBounds.width,
                displayBounds.height,
                effectivePixelSize
              );
            }
          } else {
            // Fallback: draw without pixelation
            ctx.drawImage(offscreenCanvas, 0, 0, displayBounds.width, displayBounds.height);
          }
        } else {
          // Draw directly without pixelation (scale from full image to display bounds)
          ctx.drawImage(offscreenCanvas, 0, 0, displayBounds.width, displayBounds.height);
        }

        // Store reference for pixel detection
        imageRef.current = img;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        }
      });

      // Mark as ready after first frame
      setTimeout(() => {
        setIsSegmentedImageReady(true);
        console.log('[MonsterHighlight] ✓ Animated segmented image is now ready and will be displayed');
      }, 100);
    };

    img.onerror = () => {
      console.error('[MonsterHighlight] Failed to load segmented image for animation');
    };

    img.src = transparentMonsterUrl;

    // Store cleanup function
    animationCleanupRef.current = () => {
      if (animationCleanup) {
        animationCleanup();
      }
    };

    // Update previous URL ref after setting up new animation
    const previousUrl = previousTransparentMonsterUrlRef.current;
    previousTransparentMonsterUrlRef.current = transparentMonsterUrl;

    // Cleanup on unmount or dependency change
    // Delay cleanup during transitions to keep animation playing until new node is loaded
    let cleanupTimeout: NodeJS.Timeout | null = null;
    return () => {
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      if (!animationCleanupRef.current) return;
      
      // Check if we're transitioning: URL changed but new one might not be ready yet
      const urlChanged = previousUrl && previousUrl !== transparentMonsterUrl;
      const newUrlExists = !!transparentMonsterUrl;
      
      if (urlChanged && !newUrlExists) {
        // Transitioning to new node but new URL not ready yet - delay cleanup
        cleanupTimeout = setTimeout(() => {
          if (animationCleanupRef.current) {
            animationCleanupRef.current();
            animationCleanupRef.current = null;
          }
        }, 800); // 800ms delay - enough time for new node to load
      } else {
        // New URL is ready or not transitioning - cleanup immediately
        animationCleanupRef.current();
        animationCleanupRef.current = null;
      }
    };
  }, [transparentMonsterUrl, displayBounds, animationEnabled, pixelationEnabled, pixelationMode, pixelSize, imageUrl]);

  // Use cached segmentation URL if available, otherwise generate it
  useEffect(() => {
    console.log('[MonsterHighlight] ====== CACHED SEGMENTATION URL CHECK ======');
    console.log('[MonsterHighlight] cachedSegmentationUrl:', cachedSegmentationUrl ? cachedSegmentationUrl.substring(0, 100) + '...' : 'NULL');
    console.log('[MonsterHighlight] imageUrl:', imageUrl ? imageUrl.substring(0, 80) + '...' : 'NULL');
    console.log('[MonsterHighlight] monster:', monster ? monster.name : 'NULL');
    
    if (cachedSegmentationUrl) {
      console.log('[MonsterHighlight] ✓✓✓ USING CACHED SEGMENTATION URL ✓✓✓');
      console.log('[MonsterHighlight] Full cached URL:', cachedSegmentationUrl);
      setTransparentMonsterUrl(cachedSegmentationUrl);
      setIsDetecting(false);
      setDetectionError(null);
      console.log('[MonsterHighlight] transparentMonsterUrl set to cached URL');
      console.log('[MonsterHighlight] ==========================================');
      return;
    }
    
    console.log('[MonsterHighlight] No cached segmentation URL available');
    
    // Reset if no cached URL and no image/monster
    if (!imageUrl || !monster) {
      console.log('[MonsterHighlight] Missing imageUrl or monster, resetting');
      setTransparentMonsterUrl(null);
      setDetectionError(null);
      return;
    }
    
    // Only generate if we don't have a cached URL
    console.log('[MonsterHighlight] Will attempt SAM-3 segmentation (no cached URL)');
    setTransparentMonsterUrl(null);
    console.log('[MonsterHighlight] ==========================================');
  }, [cachedSegmentationUrl, imageUrl, monster]);

  // Remove background from image (only if no cached URL)
  useEffect(() => {
    let mounted = true;

    async function processImage() {
      // Skip if we have a cached URL
      if (cachedSegmentationUrl) {
        return;
      }

      if (!imageUrl || !monster) {
        setTransparentMonsterUrl(null);
        setDetectionError(null);
        return;
      }

      console.log('[MonsterHighlight] ====== STARTING SAM-3 SEGMENTATION ======');
      console.log('[MonsterHighlight] Image URL:', imageUrl);
      console.log('[MonsterHighlight] Monster name:', monster.name);
      console.log('[MonsterHighlight] Image prompt:', imagePrompt ? imagePrompt.substring(0, 100) + '...' : 'null');
      
      setIsDetecting(true);
      setDetectionError(null);
      setTransparentMonsterUrl(null);

      try {
        const result = await segmentMonsterInImage(imageUrl, imagePrompt || undefined, monster.name, monster);
        if (mounted && result) {
          setTransparentMonsterUrl(result.transparentMonsterUrl);
          console.log('[MonsterHighlight] ✓ Successfully segmented monster with SAM-3');
          console.log('[MonsterHighlight] Using mask URL:', result.transparentMonsterUrl);
          
          // Save to room content cache
          if (onSegmentationComplete && result.transparentMonsterUrl) {
            onSegmentationComplete(result.transparentMonsterUrl);
          }
        } else if (mounted) {
          setTransparentMonsterUrl(null);
          console.log('[MonsterHighlight] No SAM-3 segmentation result');
        }
      } catch (err) {
        if (mounted) {
          console.error('[MonsterHighlight] SAM-3 segmentation failed', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setDetectionError(errorMessage);
          setTransparentMonsterUrl(null);
        }
      } finally {
        if (mounted) setIsDetecting(false);
      }
    }

    processImage();

    return () => {
      mounted = false;
    };
  }, [imageUrl, monster, imagePrompt, cachedSegmentationUrl, onSegmentationComplete]);

  // Particle system effect - wrapped in try-catch to prevent breaking segmentation
  useEffect(() => {
    if (!transparentMonsterUrl || !imageRef.current || !particleCanvasRef.current || !containerRef.current) {
      return;
    }

    // Wrap entire particle system in try-catch for error isolation
    try {
      const canvas = particleCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('[MonsterHighlight] Could not get canvas context for particles');
        return;
      }

      const img = imageRef.current;
      const container = containerRef.current;

    // Set canvas size to match container
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateCanvasSize();

    let particleList: Particle[] = [];
    let lastEmitTime = 0;
    const emitInterval = 200; // Emit particles every 200ms (less frequent, more natural)
    
    // Edge detection canvas for finding monster outline
    const edgeCanvas = document.createElement('canvas');
    const edgeCtx = edgeCanvas.getContext('2d', { willReadFrequently: true });
    let edgePoints: Array<{ x: number; y: number; nx: number; ny: number }> = [];
    let edgePointsReady = false;

    // Build edge points cache from the monster image
    const buildEdgePoints = () => {
      if (!edgeCtx || !img.complete || img.naturalWidth === 0) return;
      
      try {
        edgeCanvas.width = img.naturalWidth;
        edgeCanvas.height = img.naturalHeight;
        edgeCtx.drawImage(img, 0, 0);
        
        const imageData = edgeCtx.getImageData(0, 0, edgeCanvas.width, edgeCanvas.height);
        const data = imageData.data;
        edgePoints = [];
        
        // Sample points and find edges (where alpha transitions from visible to transparent)
        const sampleRate = 2; // Check every Nth pixel for performance
        for (let y = 0; y < edgeCanvas.height; y += sampleRate) {
          for (let x = 0; x < edgeCanvas.width; x += sampleRate) {
            const idx = (y * edgeCanvas.width + x) * 4;
            const alpha = data[idx + 3];
            
            // If pixel is visible (not transparent)
            if (alpha > 10) {
              // Check if it's near an edge (has transparent neighbors)
              let isEdge = false;
              let normalX = 0, normalY = 0; // Normal vector (outward direction)
              
              // Check 8 neighbors
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  
                  const neighborX = x + dx;
                  const neighborY = y + dy;
                  if (neighborX >= 0 && neighborX < edgeCanvas.width && neighborY >= 0 && neighborY < edgeCanvas.height) {
                    const nIdx = (neighborY * edgeCanvas.width + neighborX) * 4;
                    const nAlpha = data[nIdx + 3];
                    
                    // If neighbor is transparent, this is an edge
                    if (nAlpha <= 10) {
                      isEdge = true;
                      // Normal points away from the monster (toward transparent area)
                      const len = Math.sqrt(dx * dx + dy * dy);
                      normalX += dx / len;
                      normalY += dy / len;
                    }
                  } else {
                    // Out of bounds = edge
                    isEdge = true;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    normalX += dx / len;
                    normalY += dy / len;
                  }
                }
              }
              
              if (isEdge) {
                const len = Math.sqrt(normalX * normalX + normalY * normalY);
                if (len > 0) {
                  normalX /= len;
                  normalY /= len;
                }
                edgePoints.push({ x, y, nx: normalX, ny: normalY });
              }
            }
          }
        }
        
        edgePointsReady = edgePoints.length > 0;
        console.log(`[MonsterHighlight] Found ${edgePoints.length} edge points for particle emission`);
      } catch (error) {
        console.warn('[MonsterHighlight] Could not build edge points (CORS?), using fallback', error);
        edgePointsReady = false;
      }
    };

    // Build edge points when image loads
    if (img.complete) {
      buildEdgePoints();
    } else {
      img.onload = buildEdgePoints;
    }

    // Fallback function for edge detection (simple perimeter sampling if CORS fails)
    const buildEdgePointsFallback = (
      offsetX: number,
      offsetY: number,
      displayedWidth: number,
      displayedHeight: number
    ): Array<{ x: number; y: number; nx: number; ny: number }> => {
      const fallbackPoints: Array<{ x: number; y: number; nx: number; ny: number }> = [];
      const sampleCount = 20; // Sample points around perimeter
      
      // Sample points around the perimeter
      for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleCount;
        let x: number, y: number, nx: number, ny: number;
        
        // Distribute points around perimeter
        if (t < 0.25) {
          // Top edge
          x = offsetX + displayedWidth * (t * 4);
          y = offsetY;
          nx = 0;
          ny = 1; // Downward
        } else if (t < 0.5) {
          // Right edge
          x = offsetX + displayedWidth;
          y = offsetY + displayedHeight * ((t - 0.25) * 4);
          nx = -1; // Leftward
          ny = 0;
        } else if (t < 0.75) {
          // Bottom edge
          x = offsetX + displayedWidth * (1 - (t - 0.5) * 4);
          y = offsetY + displayedHeight;
          nx = 0;
          ny = -1; // Upward
        } else {
          // Left edge
          x = offsetX;
          y = offsetY + displayedHeight * (1 - (t - 0.75) * 4);
          nx = 1; // Rightward
          ny = 0;
        }
        
        fallbackPoints.push({ x, y, nx, ny });
      }
      
      return fallbackPoints;
    };

    // Get edge point from the actual monster glow (with fallback)
    const getGlowEdgePoint = (
      offsetX: number,
      offsetY: number,
      scaleX: number,
      scaleY: number,
      displayedWidth: number,
      displayedHeight: number
    ): { x: number; y: number; angle: number } | null => {
      let pointsToUse = edgePoints;
      
      // Use fallback if edge detection failed
      if (!edgePointsReady || edgePoints.length === 0) {
        console.log('[MonsterHighlight] Using fallback edge points (CORS or edge detection failed)');
        pointsToUse = buildEdgePointsFallback(offsetX, offsetY, displayedWidth, displayedHeight);
      }
      
      if (pointsToUse.length === 0) return null;
      
      // Pick a random edge point
      const edgePoint = pointsToUse[Math.floor(Math.random() * pointsToUse.length)];
      
      // Convert from image coordinates to display coordinates (if using real edge points)
      let displayX: number, displayY: number;
      if (edgePointsReady && edgePoints.length > 0) {
        displayX = offsetX + edgePoint.x * scaleX;
        displayY = offsetY + edgePoint.y * scaleY;
      } else {
        // Fallback points are already in display coordinates
        displayX = edgePoint.x;
        displayY = edgePoint.y;
      }
      
      // Calculate angle from normal vector (outward from monster)
      const angle = Math.atan2(edgePoint.ny, edgePoint.nx);
      
      // Offset slightly outward from the edge (to represent the glow)
      const glowOffset = 3; // pixels
      const finalX = displayX + Math.cos(angle) * glowOffset;
      const finalY = displayY + Math.sin(angle) * glowOffset;
      
      return { x: finalX, y: finalY, angle };
    };

    const createParticle = (
      offsetX: number,
      offsetY: number,
      scaleX: number,
      scaleY: number,
      displayedWidth: number,
      displayedHeight: number
    ): Particle | null => {
      const edgePoint = getGlowEdgePoint(offsetX, offsetY, scaleX, scaleY, displayedWidth, displayedHeight);
      if (!edgePoint) return null;
      
      // More natural speed variation (slower, more organic)
      const baseSpeed = 0.15 + Math.random() * 0.25; // 0.15-0.4 (slower)
      
      // Add slight angular variation for more natural drift
      const angleVariation = (Math.random() - 0.5) * 0.3; // ±0.15 radians
      const finalAngle = edgePoint.angle + angleVariation;
      
      return {
        x: edgePoint.x,
        y: edgePoint.y,
        vx: Math.cos(finalAngle) * baseSpeed,
        vy: Math.sin(finalAngle) * baseSpeed,
        life: 1.0,
        maxLife: 1.0,
        // More natural size variation (smaller, more varied)
        size: 1.5 + Math.random() * 1.5, // 1.5-3px (smaller range)
      };
    };

    const animate = (currentTime: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get image bounds
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerRect.width / containerRect.height;
      
      let displayedWidth = containerRect.width;
      let displayedHeight = containerRect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > containerAspect) {
        displayedHeight = containerRect.width / imgAspect;
        offsetY = (containerRect.height - displayedHeight) / 2;
      } else {
        displayedWidth = containerRect.height * imgAspect;
        offsetX = (containerRect.width - displayedWidth) / 2;
      }

      // Calculate scale factors for coordinate conversion
      const scaleX = displayedWidth / img.naturalWidth;
      const scaleY = displayedHeight / img.naturalHeight;

      // Emit new particles from glow edges (less frequent, more natural)
      if (currentTime - lastEmitTime > emitInterval) {
        // Emit 1 particle occasionally (more natural, less overwhelming)
        // Random chance to emit (70% chance) for more organic feel
        if (Math.random() < 0.7) {
          const particle = createParticle(offsetX, offsetY, scaleX, scaleY, displayedWidth, displayedHeight);
          if (particle) {
            particleList.push(particle);
          }
        }
        lastEmitTime = currentTime;
      }

      // Update and draw particles
      particleList = particleList.filter((particle) => {
        // Add slight drift/wobble for more natural movement
        const driftX = (Math.random() - 0.5) * 0.1;
        const driftY = (Math.random() - 0.5) * 0.1;
        particle.x += particle.vx + driftX;
        particle.y += particle.vy + driftY;
        
        // Natural fade (faster at end, slower at start)
        const fadeRate = 0.008 + (1 - particle.life) * 0.01; // Accelerating fade
        particle.life -= fadeRate;

        if (particle.life <= 0) return false;

        // More natural opacity curve (ease-out)
        const opacity = Math.pow(particle.life, 1.5); // Ease-out curve
        const alpha = opacity * 0.6; // Max 60% opacity for subtlety
        
        // Slight size variation over time (shrink slightly as it fades)
        const currentSize = particle.size * (0.8 + particle.life * 0.2);
        
        // Slight color variation for more natural look
        const redVariation = Math.floor(200 + Math.random() * 30); // 200-230
        const greenVariation = Math.floor(Math.random() * 20); // 0-20
        const blueVariation = Math.floor(Math.random() * 20); // 0-20
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(${redVariation}, ${greenVariation}, ${blueVariation}, ${alpha})`;
        ctx.shadowBlur = 6 + particle.life * 4; // Glow fades with particle
        ctx.shadowColor = `rgba(255, 0, 0, ${alpha * 0.6})`; // Shadow fades naturally
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

      // Handle window resize
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      resizeObserver.observe(container);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        resizeObserver.disconnect();
      };
    } catch (error) {
      // Particle system failed, but don't break the component
      console.warn('[MonsterHighlight] Particle system initialization failed, continuing without particles:', error);
      return () => {
        // Cleanup function even if initialization failed
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [transparentMonsterUrl, isHoveringMonster]);

  // Don't render if missing required data
  if (!monster || !imageUrl) {
    return null;
  }

  // If no cutout yet, render nothing (allows clicks to pass through to main image if needed)
  if (!transparentMonsterUrl) {
    return (
      <>
        {/* Show detection status while processing (only if showDetectionBox is true) */}
        {showDetectionBox && isDetecting && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.9)',
              color: '#fff',
              fontSize: '12px',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 20,
              fontFamily: 'monospace',
              border: '1px solid rgba(255, 215, 0, 0.5)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Monster Detection</div>
            <div>
              {isDetecting ? (
                '⏳ Segmenting with SAM-3...'
              ) : detectionError ? (
                `❌ Error: ${detectionError.substring(0, 40)}...`
              ) : (
                'Ready (waiting for SAM-3 segmentation)'
              )}
            </div>
            {monster && (
              <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                Monster: {monster.name}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 20, // Above the background
        // CRITICAL: This allows clicks to pass through the empty transparent space
        pointerEvents: 'none',
        // Flex center to ensure the cutout aligns with the background object-fit: contain
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Hidden canvas for pixel detection */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      {/* Particle effect canvas */}
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 19,
        }}
      />

      {/* Show detection status (only if showDetectionBox is true) */}
      {showDetectionBox && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            fontSize: '12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 21,
            fontFamily: 'monospace',
            border: '1px solid rgba(255, 215, 0, 0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Monster Detection</div>
          <div>
            {transparentMonsterUrl ? (
              `✓ Monster segmented (${monster?.name || 'unknown'})`
            ) : detectionError ? (
              `❌ Error: ${detectionError.substring(0, 40)}...`
            ) : (
              'Ready (waiting for SAM-3 segmentation)'
            )}
          </div>
          {monster && (
            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
              Monster: {monster.name}
            </div>
          )}
        </div>
      )}

      {/* The Transparent Monster Cutout - Only show when animation and pixelation are disabled */}
      {transparentMonsterUrl && !animationEnabled && !pixelationEnabled && !isDying && (
        <img
          ref={imageRef}
          src={transparentMonsterUrl}
          alt="Monster Interaction Layer"
          crossOrigin="anonymous"
          className={cachedSegmentationUrl ? "monster-segmented-glow" : "monster-glow-animated"}
        onLoad={(e) => {
          // Store reference when image loads
          const img = e.currentTarget;
          imageRef.current = img;
          
          // Debug logging
          console.log('[MonsterHighlight] ====== SEGMENTED IMAGE LOADED ======');
          console.log('[MonsterHighlight] Segmented image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
          console.log('[MonsterHighlight] Original image dimensions:', originalImageSize ? `${originalImageSize.width} x ${originalImageSize.height}` : 'NOT LOADED');
          console.log('[MonsterHighlight] Applied CSS class:', cachedSegmentationUrl ? 'monster-segmented-glow' : 'monster-glow-animated');
          console.log('[MonsterHighlight] Has cachedSegmentationUrl:', !!cachedSegmentationUrl);
          console.log('[MonsterHighlight] transparentMonsterUrl:', transparentMonsterUrl ? transparentMonsterUrl.substring(0, 80) + '...' : 'NULL');
          
          // Check if dimensions match original image
          if (originalImageSize) {
            const widthMatch = Math.abs(img.naturalWidth - originalImageSize.width) < 2; // Allow 2px tolerance
            const heightMatch = Math.abs(img.naturalHeight - originalImageSize.height) < 2;
            
            if (!widthMatch || !heightMatch) {
              console.warn('[MonsterHighlight] ⚠ WARNING: Segmented image dimensions do NOT match original!');
              console.warn('[MonsterHighlight]   Original:', originalImageSize.width, 'x', originalImageSize.height);
              console.warn('[MonsterHighlight]   Segmented:', img.naturalWidth, 'x', img.naturalHeight);
              console.warn('[MonsterHighlight]   The segmented image will be scaled to match, but positioning may be off.');
            } else {
              console.log('[MonsterHighlight] ✓ Segmented image dimensions match original perfectly');
            }
          }
          
          // Store natural size for pixel detection (but NOT for bounds calculation)
          // Bounds calculation should always use originalImageSize
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          }
          
          // Calculate monster bounds in display coordinates
          if (displayBounds && containerRef.current) {
            const tempCanvas = document.createElement('canvas');
            const imageBounds = findCharacterBounds(img, tempCanvas);
            if (imageBounds) {
              // Get container's position in viewport to convert container-relative to viewport coordinates
              const containerRect = containerRef.current.getBoundingClientRect();
              
              // Scale bounds from image coordinates to display coordinates (container-relative)
              const scaleX = displayBounds.width / img.naturalWidth;
              const scaleY = displayBounds.height / img.naturalHeight;
              const containerRelativeCenterX = displayBounds.x + (imageBounds.centerX * scaleX);
              const containerRelativeCenterY = displayBounds.y + (imageBounds.centerY * scaleY);
              const containerRelativeTop = displayBounds.y + (imageBounds.minY * scaleY);
              const containerRelativeBottom = displayBounds.y + (imageBounds.maxY * scaleY);
              const containerRelativeLeft = displayBounds.x + (imageBounds.minX * scaleX);
              const containerRelativeRight = displayBounds.x + (imageBounds.maxX * scaleX);
              const displayWidth = imageBounds.width * scaleX;
              const displayHeight = imageBounds.height * scaleY;
              
              // Convert to viewport coordinates (for animation canvas which is fixed position)
              const displayTop = containerRect.top + containerRelativeTop;
              const displayBottom = containerRect.top + containerRelativeBottom;
              const displayLeft = containerRect.left + containerRelativeLeft;
              const displayRight = containerRect.left + containerRelativeRight;
              const displayCenterX = containerRect.left + containerRelativeCenterX;
              const displayCenterY = containerRect.top + containerRelativeCenterY;
              
              // Head/chest is top 45% of character, so head top is at the top of character bounds
              const displayHeadTop = displayTop;
              
              const bounds = {
                centerX: displayCenterX,
                centerY: displayCenterY,
                top: displayTop,
                bottom: displayBottom,
                headTop: displayHeadTop,
                left: displayLeft,
                right: displayRight,
                width: displayWidth,
                height: displayHeight
              };
              setMonsterBounds(bounds);
              if (onBoundsChange) onBoundsChange(bounds);
              console.log('[MonsterHighlight] Monster bounds calculated (static):', bounds);
            }
          }
          
          // Mark image as ready only after everything is loaded and validated
          // Use a small delay to ensure the image is fully rendered before showing
          setTimeout(() => {
            setIsSegmentedImageReady(true);
            console.log('[MonsterHighlight] ✓ Segmented image is now ready and will be displayed');
          }, 100); // Small delay to ensure smooth appearance
        }}
        onMouseMove={(e) => {
          const img = e.currentTarget;
          if (!img.complete || !imageRef.current || img.naturalWidth === 0 || img.naturalHeight === 0 || !imageSize) return;

          const rect = img.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // With fixed dimensions, the displayed size matches the style width/height
          const displayedWidth = rect.width;
          const displayedHeight = rect.height;

          // Check if mouse is within the displayed image bounds
          if (x < 0 || x > displayedWidth || y < 0 || y > displayedHeight) {
            // Mouse is outside the displayed image area
            setIsHoveringMonster(false);
            img.style.cursor = 'default';
            // Reset to original bounds when outside image bounds
            if (displayBounds) {
              img.style.width = `${displayBounds.width}px`;
              img.style.height = `${displayBounds.height}px`;
              img.style.left = `${displayBounds.x}px`;
              img.style.top = `${displayBounds.y}px`;
            }
            return;
          }

          // Convert display coordinates to image coordinates (1:1 mapping since we're using natural size)
          const scaleX = img.naturalWidth / displayedWidth;
          const scaleY = img.naturalHeight / displayedHeight;
          const imageX = x * scaleX;
          const imageY = y * scaleY;

          // Check if pixel is transparent (use animated canvas if available)
          const detectionTarget = animatedCanvasRef.current || imageRef.current;
          if (!detectionTarget) return;
          const isTransparent = checkPixelTransparency(imageX, imageY, detectionTarget);
          setIsHoveringMonster(!isTransparent);

          // Update cursor based on pixel transparency
          img.style.cursor = isTransparent ? 'default' : 'pointer';

          // Update hover glow effect only when over non-transparent pixels
          if (!isTransparent) {
            if (cachedSegmentationUrl) {
              img.classList.add('monster-segmented-glow-hover');
              img.classList.remove('monster-segmented-glow');
            } else {
              img.classList.add('monster-glow-hover');
              img.classList.remove('monster-glow-animated');
            }
            // Increase size by a few pixels on hover (maintain aspect ratio)
            if (displayBounds) {
              const scale = 1 + (4 / displayBounds.width); // Proportional increase
              img.style.width = `${displayBounds.width * scale}px`;
              img.style.height = `${displayBounds.height * scale}px`;
              // Adjust position to keep centered
              img.style.left = `${displayBounds.x - (displayBounds.width * (scale - 1) / 2)}px`;
              img.style.top = `${displayBounds.y - (displayBounds.height * (scale - 1) / 2)}px`;
            }
          } else {
            if (cachedSegmentationUrl) {
              img.classList.remove('monster-segmented-glow-hover');
              img.classList.add('monster-segmented-glow');
            } else {
              img.classList.remove('monster-glow-hover');
              img.classList.add('monster-glow-animated');
            }
            // Reset to original bounds
            if (displayBounds) {
              img.style.width = `${displayBounds.width}px`;
              img.style.height = `${displayBounds.height}px`;
              img.style.left = `${displayBounds.x}px`;
              img.style.top = `${displayBounds.y}px`;
            }
          }
        }}
        onMouseLeave={(e) => {
          setIsHoveringMonster(false);
          const img = e.currentTarget;
          if (cachedSegmentationUrl) {
            img.classList.remove('monster-segmented-glow-hover');
            img.classList.add('monster-segmented-glow');
          } else {
            img.classList.remove('monster-glow-hover');
            img.classList.add('monster-glow-animated');
          }
          // Reset to original bounds
          if (displayBounds) {
            img.style.width = `${displayBounds.width}px`;
            img.style.height = `${displayBounds.height}px`;
            img.style.left = `${displayBounds.x}px`;
            img.style.top = `${displayBounds.y}px`;
          }
          img.style.cursor = 'default';
        }}
        onClick={(e) => {
          const img = e.currentTarget;
          if (!img.complete || !imageRef.current || img.naturalWidth === 0 || img.naturalHeight === 0 || !imageSize) return;

          const rect = img.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // With fixed dimensions, the displayed size matches the style width/height
          const displayedWidth = rect.width;
          const displayedHeight = rect.height;

          // Check if click is within the displayed image bounds
          if (x < 0 || x > displayedWidth || y < 0 || y > displayedHeight) {
            // Click is outside the displayed image area
            return;
          }

          // Convert display coordinates to image coordinates (1:1 mapping since we're using natural size)
          const scaleX = img.naturalWidth / displayedWidth;
          const scaleY = img.naturalHeight / displayedHeight;
          const imageX = x * scaleX;
          const imageY = y * scaleY;

          // Check if pixel is transparent (use animated canvas if available)
          const detectionTarget = animatedCanvasRef.current || imageRef.current;
          if (!detectionTarget) return;
          const isTransparent = checkPixelTransparency(imageX, imageY, detectionTarget);
          
          if (isTransparent) {
            // Click on transparent area, do nothing (allow click to pass through)
            return;
          }

          // Pixel is visible, handle click
          e.stopPropagation(); // Stop the click from hitting the room navigation
          console.log('Monster Clicked!');
          if (onInteract) {
            onInteract();
          }
        }}
        style={{
          // Position absolutely to match background image exactly
          // CRITICAL: Use displayBounds which is calculated from originalImageSize
          // This ensures the segmented image overlays at the exact same position as the original
          position: 'absolute',
          left: displayBounds ? `${displayBounds.x}px` : '50%',
          top: displayBounds ? `${displayBounds.y}px` : '50%',
          // CRITICAL: Always use displayBounds dimensions (from original image size)
          // The segmented image will be scaled to match, ensuring perfect overlay
          width: displayBounds ? `${displayBounds.width}px` : '100%',
          height: displayBounds ? `${displayBounds.height}px` : '100%',
          transform: displayBounds ? 'none' : 'translate(-50%, -50%)',
          // CRITICAL: Use 'fill' to match AtmosphericImage behavior - stretches to fill container
          // This ensures the segmented image overlays at the exact same position as the background
          objectFit: 'fill',
          
          // CRITICAL: This re-enables clicking ONLY on the visible pixels of the monster
          pointerEvents: isSegmentedImageReady ? 'auto' : 'none', // Disable interaction until ready
          cursor: 'default', // Will be updated by onMouseMove
          
          // Hide image until fully loaded and ready
          opacity: isSegmentedImageReady ? 1 : 0,
          visibility: isSegmentedImageReady ? 'visible' : 'hidden',
          
          // THE GLOW EFFECT
          // Drop shadow looks at the alpha channel (transparency) to create a perfect outline
          // Animation is applied via CSS class
          
          transition: 'opacity 0.3s ease, width 0.2s ease, height 0.2s ease, left 0.2s ease, top 0.2s ease',
        }}
        />
      )}

      {/* Animated canvas for segmented monster (when animation is enabled) */}
      {transparentMonsterUrl && animationEnabled && !isDying && (
        <canvas
          ref={animatedCanvasRef}
          className={cachedSegmentationUrl ? "monster-segmented-glow" : "monster-glow-animated"}
          onMouseMove={(e) => {
            const canvas = e.currentTarget;
            if (!canvas || !imageRef.current || !imageSize || !displayBounds) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if mouse is within the displayed canvas bounds
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
              setIsHoveringMonster(false);
              canvas.style.cursor = 'default';
              return;
            }

            // Convert display coordinates to image coordinates
            const scaleX = imageSize.width / rect.width;
            const scaleY = imageSize.height / rect.height;
            const imageX = x * scaleX;
            const imageY = y * scaleY;

            // Check if pixel is transparent (use animated canvas for detection)
            const detectionTarget = animatedCanvasRef.current || imageRef.current;
            if (!detectionTarget) return;
            const isTransparent = checkPixelTransparency(imageX, imageY, detectionTarget);
            setIsHoveringMonster(!isTransparent);
            canvas.style.cursor = isTransparent ? 'default' : 'pointer';

            // Update hover glow effect
            if (!isTransparent) {
              if (cachedSegmentationUrl) {
                canvas.classList.add('monster-segmented-glow-hover');
                canvas.classList.remove('monster-segmented-glow');
              } else {
                canvas.classList.add('monster-glow-hover');
                canvas.classList.remove('monster-glow-animated');
              }
            } else {
              if (cachedSegmentationUrl) {
                canvas.classList.remove('monster-segmented-glow-hover');
                canvas.classList.add('monster-segmented-glow');
              } else {
                canvas.classList.remove('monster-glow-hover');
                canvas.classList.add('monster-glow-animated');
              }
            }
          }}
          onMouseLeave={(e) => {
            setIsHoveringMonster(false);
            const canvas = e.currentTarget;
            if (cachedSegmentationUrl) {
              canvas.classList.remove('monster-segmented-glow-hover');
              canvas.classList.add('monster-segmented-glow');
            } else {
              canvas.classList.remove('monster-glow-hover');
              canvas.classList.add('monster-glow-animated');
            }
            canvas.style.cursor = 'default';
          }}
          onClick={(e) => {
            const canvas = e.currentTarget;
            if (!canvas || !imageRef.current || !imageSize || !displayBounds) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if click is within the displayed canvas bounds
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
              return;
            }

            // Convert display coordinates to image coordinates
            const scaleX = imageSize.width / rect.width;
            const scaleY = imageSize.height / rect.height;
            const imageX = x * scaleX;
            const imageY = y * scaleY;

            // Check if pixel is transparent
            const isTransparent = checkPixelTransparency(imageX, imageY, imageRef.current);
            
            if (isTransparent) {
              return;
            }

            // Pixel is visible, handle click
            e.stopPropagation();
            console.log('Monster Clicked!');
            if (onInteract) {
              onInteract();
            }
          }}
          style={{
            position: 'absolute',
            left: displayBounds ? `${displayBounds.x}px` : '50%',
            top: displayBounds ? `${displayBounds.y}px` : '50%',
            width: displayBounds ? `${displayBounds.width}px` : '100%',
            height: displayBounds ? `${displayBounds.height}px` : '100%',
            transform: displayBounds ? 'none' : 'translate(-50%, -50%)',
            pointerEvents: isSegmentedImageReady ? 'auto' : 'none',
            cursor: 'default',
            opacity: isSegmentedImageReady ? 1 : 0,
            visibility: isSegmentedImageReady ? 'visible' : 'hidden',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Pixelated canvas for segmented monster (when pixelation is enabled but animation is disabled) */}
      {transparentMonsterUrl && pixelationEnabled && !animationEnabled && !isDying && (
        <canvas
          ref={pixelatedCanvasRef}
          className={cachedSegmentationUrl ? "monster-segmented-glow" : "monster-glow-animated"}
          onMouseMove={(e) => {
            const canvas = e.currentTarget;
            if (!canvas || !imageRef.current || !imageSize || !displayBounds) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if mouse is within the displayed canvas bounds
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
              setIsHoveringMonster(false);
              canvas.style.cursor = 'default';
              return;
            }

            // Convert display coordinates to image coordinates
            const scaleX = imageSize.width / rect.width;
            const scaleY = imageSize.height / rect.height;
            const imageX = x * scaleX;
            const imageY = y * scaleY;

            // Check if pixel is transparent
            const isTransparent = checkPixelTransparency(imageX, imageY, imageRef.current);
            setIsHoveringMonster(!isTransparent);
            canvas.style.cursor = isTransparent ? 'default' : 'pointer';

            // Update hover glow effect
            if (!isTransparent) {
              if (cachedSegmentationUrl) {
                canvas.classList.add('monster-segmented-glow-hover');
                canvas.classList.remove('monster-segmented-glow');
              } else {
                canvas.classList.add('monster-glow-hover');
                canvas.classList.remove('monster-glow-animated');
              }
            } else {
              if (cachedSegmentationUrl) {
                canvas.classList.remove('monster-segmented-glow-hover');
                canvas.classList.add('monster-segmented-glow');
              } else {
                canvas.classList.remove('monster-glow-hover');
                canvas.classList.add('monster-glow-animated');
              }
            }
          }}
          onMouseLeave={(e) => {
            setIsHoveringMonster(false);
            const canvas = e.currentTarget;
            if (cachedSegmentationUrl) {
              canvas.classList.remove('monster-segmented-glow-hover');
              canvas.classList.add('monster-segmented-glow');
            } else {
              canvas.classList.remove('monster-glow-hover');
              canvas.classList.add('monster-glow-animated');
            }
            canvas.style.cursor = 'default';
          }}
          onClick={(e) => {
            const canvas = e.currentTarget;
            if (!canvas || !imageRef.current || !imageSize || !displayBounds) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if click is within the displayed canvas bounds
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
              return;
            }

            // Convert display coordinates to image coordinates
            const scaleX = imageSize.width / rect.width;
            const scaleY = imageSize.height / rect.height;
            const imageX = x * scaleX;
            const imageY = y * scaleY;

            // Check if pixel is transparent
            const isTransparent = checkPixelTransparency(imageX, imageY, imageRef.current);
            
            if (isTransparent) {
              return;
            }

            // Pixel is visible, handle click
            e.stopPropagation();
            console.log('Monster Clicked!');
            if (onInteract) {
              onInteract();
            }
          }}
          style={{
            position: 'absolute',
            left: displayBounds ? `${displayBounds.x}px` : '50%',
            top: displayBounds ? `${displayBounds.y}px` : '50%',
            width: displayBounds ? `${displayBounds.width}px` : '100%',
            height: displayBounds ? `${displayBounds.height}px` : '100%',
            transform: displayBounds ? 'none' : 'translate(-50%, -50%)',
            pointerEvents: isSegmentedImageReady ? 'auto' : 'none',
            cursor: 'default',
            opacity: isSegmentedImageReady ? 1 : 0,
            visibility: isSegmentedImageReady ? 'visible' : 'hidden',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Death Animation - Show when dying */}
      {isDying && monsterBounds && cachedSegmentationUrl && (
        <DeathAnimation
          imageUrl={cachedSegmentationUrl}
          bounds={monsterBounds}
          onComplete={() => {
            if (onDyingChange) onDyingChange(false);
          }}
        />
      )}

      {/* Monster UI - Name and HP Bar floating together with animation */}
      {monster && monsterBounds && containerRef.current && !isDying && (() => {
        // Convert viewport coordinates back to container-relative for UI positioning
        const container = containerRef.current;
        if (!container) return null;
        const containerRect = container.getBoundingClientRect();
        const uiCenterX = monsterBounds.centerX - containerRect.left;
        const uiHeadTop = monsterBounds.headTop - containerRect.top;
        
        return (
          <div
            key="monster-ui"
            style={{
              position: 'absolute',
              left: `${uiCenterX}px`,
              top: `${uiHeadTop - 135}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0px',
              pointerEvents: 'none',
              zIndex: 25,
              animation: 'monster-ui-float 5s ease-in-out infinite',
            }}
          >
          {/* Monster Name */}
          <div
            ref={nameWrapperRef}
            style={{
              position: 'relative',
              width: nameDimensions ? `${nameDimensions.width}px` : 'auto',
              height: nameDimensions ? `${nameDimensions.height}px` : '86px',
              minWidth: '200px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '-27px',
            }}
          >
            <TypingText
              text={monster.name}
              x={0}
              y={0}
              pixelationEnabled={true}
              pixelSize={3}
            />
          </div>
          
          {/* HP Bar with Icon - Directly below name */}
          {enemyHP && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              {/* HP Bar - Top, centered */}
              <div
                style={{
                  width: '180px',
                  height: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '4px',
                  border: '2px solid rgba(255, 0, 0, 0.5)',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, (enemyHP.current / enemyHP.max) * 100))}%`,
                    height: '100%',
                    backgroundColor: '#dc2626',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 12px rgba(220, 38, 38, 0.8)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {enemyHP.current} / {enemyHP.max}
                </div>
              </div>
              
              {/* Icon - Below HP bar, aligned to left edge of health bar */}
              {monster && getMonsterAttackPatterns(monster).length > 0 && (
                <div style={{ width: '180px', display: 'flex', justifyContent: 'flex-start' }}>
                  <AttackIcon
                    attack={getMonsterAttackPatterns(monster)[0]}
                    index={0}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
