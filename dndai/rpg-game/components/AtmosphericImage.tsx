'use client';

import React, { useRef, useEffect, useState } from 'react';
import { applySimplePixelation, apply8BitPixelation } from '@/lib/utils/pixelation-filter';

interface AtmosphericImageProps {
  imageUrl: string | null | undefined;
  pixelationEnabled?: boolean;
  pixelationMode?: 'simple' | '8bit';
  pixelSize?: number;
}

interface FogPuff {
  x: number;
  y: number;
  vx: number;
  radius: number;
  maxOpacity: number;
  opacity: number;
  fadeState: number;
  fadeSpeed: number;
  reset: (randomX?: boolean) => void;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface DustParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  phase: number;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface WaterDrop {
  x: number;
  y: number;
  speed: number;
  scale: number;
  floorY: number;
  update: () => boolean; // Returns true if still active
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  scale: number;
  update: () => boolean; // Returns true if still active
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface LightEffect {
  x: number;
  y: number;
  breathePhase: number;
  draw: (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => void;
}

export function AtmosphericImage({ 
  imageUrl, 
  pixelationEnabled = false, 
  pixelationMode = 'simple',
  pixelSize 
}: AtmosphericImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const waterDropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dustIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fogPuffsRef = useRef<FogPuff[]>([]);
  const activeDropletsRef = useRef<WaterDrop[]>([]);
  const activeSplashesRef = useRef<SplashParticle[]>([]);
  const activeDustRef = useRef<DustParticle[]>([]);
  const lightEffectRef = useRef<LightEffect | null>(null);
  const imageBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Get image bounds helper
  const getImageBounds = () => {
    return imageBoundsRef.current;
  };

  // FogPuff class implementation
  const createFogPuff = (imageBounds: { x: number; y: number; width: number; height: number }): FogPuff => {
    const puff: FogPuff = {
      x: 0,
      y: 0,
      vx: 0,
      radius: 0,
      maxOpacity: 0,
      opacity: 0,
      fadeState: 1,
      fadeSpeed: 0,
      reset(randomX = false) {
        const bounds = getImageBounds();
        if (!bounds) {
          this.x = -200;
          this.y = 0;
          return;
        }
        this.x = randomX ? bounds.x + Math.random() * bounds.width : bounds.x - 200;
        const topLimit = bounds.y + bounds.height * 0.4;
        const range = bounds.height * 0.6;
        this.y = topLimit + (Math.random() * range);
        this.vx = 0.04 + Math.random() * 0.07;
        this.radius = 150 + Math.random() * 200;
        this.maxOpacity = 0.005 + Math.random() * 0.01;
        this.opacity = 0;
        this.fadeState = 1;
        this.fadeSpeed = 0.00004 + Math.random() * 0.00008;
      },
      update() {
        const bounds = getImageBounds();
        if (!bounds) return;
        
        this.x += this.vx;
        this.y += Math.sin(Date.now() * 0.0005 + this.x) * 0.05;
        this.opacity += this.fadeSpeed * this.fadeState;
        if (this.opacity >= this.maxOpacity) {
          this.opacity = this.maxOpacity;
          this.fadeState = -1;
        }
        if (this.opacity <= 0 && this.fadeState === -1) {
          if (this.x > bounds.x + bounds.width + 150 || Math.random() > 0.99) {
            this.reset();
          } else {
            this.fadeState = 1;
          }
        }
        if (this.x > bounds.x + bounds.width + 300) {
          this.reset();
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        if (this.opacity <= 0) return;
        const bounds = getImageBounds();
        if (!bounds) return;
        
        // Check if puff is within or near image bounds
        if (this.x + this.radius < bounds.x || this.x - this.radius > bounds.x + bounds.width) return;
        if (this.y + this.radius < bounds.y || this.y - this.radius > bounds.y + bounds.height) return;
        
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        g.addColorStop(0, `rgba(210, 225, 255, ${this.opacity})`);
        g.addColorStop(1, `rgba(210, 225, 255, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      },
    };
    puff.reset(true);
    return puff;
  };

  // Create dust particle
  const createDustParticle = (x: number, y: number): DustParticle => {
    const bounds = getImageBounds();
    if (!bounds) {
      return {
        x: 0,
        y: 0,
        size: 0,
        opacity: 0,
        phase: 0,
        update() {},
        draw() {},
      };
    }
    
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 250;
    const ox = Math.cos(angle) * dist;
    const oy = Math.sin(angle) * dist;
    
    const dustX = Math.max(bounds.x, Math.min(bounds.x + bounds.width, x + ox));
    const dustY = Math.max(bounds.y, Math.min(bounds.y + bounds.height, y + oy));
    const size = Math.random() * 2 + 1;
    
    return {
      x: dustX,
      y: dustY,
      size,
      opacity: 0,
      phase: 0, // 0 = fading in, 1 = fading out
      update() {
        const bounds = getImageBounds();
        if (!bounds) return;
        
        this.y -= 0.2;
        if (this.phase === 0) {
          this.opacity += 0.02;
          if (this.opacity >= 0.8) this.phase = 1;
        } else {
          this.opacity -= 0.005;
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        const bounds = getImageBounds();
        if (!bounds || this.opacity <= 0 || this.y < bounds.y) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = 'rgba(255, 220, 180, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    };
  };

  // Create water drop
  const createWaterDrop = (): WaterDrop => {
    const bounds = getImageBounds();
    if (!bounds) {
      return {
        x: 0,
        y: -20,
        speed: 0,
        scale: 1,
        floorY: 0,
        update: () => false,
        draw: () => {},
      };
    }
    
    const floorY = Math.min(bounds.y + bounds.height * (0.9 + (Math.random() * 0.08)), bounds.y + bounds.height);
    const spawnX = bounds.x + Math.random() * bounds.width;
    const scale = 0.8 + (Math.random() * 0.4);
    
    return {
      x: spawnX,
      y: -20,
      speed: 2,
      scale,
      floorY,
      update() {
        const bounds = getImageBounds();
        if (!bounds) return false;
        
        // Cache bounds values to avoid repeated property access
        const boundsY = bounds.y;
        const boundsHeight = bounds.height;
        const boundsX = bounds.x;
        const boundsWidth = bounds.width;
        const maxY = boundsY + boundsHeight;
        
        this.speed += 0.8; // gravity
        this.y += this.speed;
        
        // Constrain to image bounds
        if (this.y < boundsY - 20) this.y = boundsY - 20;
        if (this.y > maxY) this.y = maxY;
        
        // Check if hit floor or out of bounds
        if (this.y >= this.floorY || this.y >= maxY || this.x < boundsX || this.x > boundsX + boundsWidth) {
          return false; // Remove this drop
        }
        return true; // Keep this drop
      },
      draw(ctx: CanvasRenderingContext2D) {
        const bounds = getImageBounds();
        if (!bounds || this.y < bounds.y - 20 || this.y > bounds.y + bounds.height) return;
        // Simplified drawing - no shadow, no scale, no save/restore for better performance
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#e0f7ff';
        // Draw at actual size with scale applied directly
        const width = 2 * this.scale;
        const height = (15 + this.speed) * this.scale;
        ctx.fillRect(this.x, this.y, width, height);
      },
    };
  };

  // Create splash particles
  const createSplashParticles = (x: number, y: number, scale: number): SplashParticle[] => {
    const bounds = getImageBounds();
    if (!bounds) return [];
    
    const count = 8 + Math.floor(Math.random() * 5);
    const particles: SplashParticle[] = [];
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6 * scale,
        vy: -(Math.random() * 4 + 3) * scale,
        life: 1.0,
        scale,
        update() {
          const bounds = getImageBounds();
          if (!bounds) return false;
          
          this.x += this.vx;
          this.y += this.vy;
          this.vy += 0.3; // gravity
          this.life -= 0.02;
          
          // Constrain to image bounds
          this.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, this.x));
          this.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, this.y));
          
          // Check if should be removed
          if (this.life <= 0 || this.y >= bounds.y + bounds.height || this.x < bounds.x || this.x > bounds.x + bounds.width) {
            return false;
          }
          return true;
        },
        draw(ctx: CanvasRenderingContext2D) {
          if (this.life <= 0) return;
          ctx.save();
          ctx.globalAlpha = this.life;
          ctx.fillStyle = '#e0f7ff';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 3;
          ctx.scale(this.scale, this.scale);
          ctx.beginPath();
          ctx.arc(this.x / this.scale, this.y / this.scale, 1.5 / this.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      });
    }
    
    return particles;
  };

  // Create light effect
  const createLightEffect = (x: number, y: number): LightEffect => {
    return {
      x,
      y,
      breathePhase: 0,
      draw(ctx: CanvasRenderingContext2D) {
        const bounds = getImageBounds();
        if (!bounds) return;
        
        // Update breathe phase
        this.breathePhase += 0.001;
        const breathe = Math.sin(this.breathePhase * Math.PI * 2) * 0.1 + 1.0;
        const opacity = 0.5 + Math.sin(this.breathePhase * Math.PI * 2) * 0.1;
        
        // Light haze (larger, outer glow)
        const hazeSize = 450 * breathe;
        const hazeGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, hazeSize);
        hazeGradient.addColorStop(0, `rgba(255, 140, 40, ${0.2 * opacity})`);
        hazeGradient.addColorStop(0.4, `rgba(255, 60, 10, ${0.05 * opacity})`);
        hazeGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        hazeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.save();
        ctx.globalCompositeOperation = 'color-dodge';
        ctx.globalAlpha = 0.6 * opacity;
        ctx.fillStyle = hazeGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, hazeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Light glow (smaller, inner glow)
        const glowSize = 250;
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        glowGradient.addColorStop(0, `rgba(255, 100, 0, ${0.1 * opacity})`);
        glowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5 * opacity;
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
    };
  };

  // Get canvas bounds
  const getCanvasBounds = () => {
    const canvas = mainCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const containerRect = container.getBoundingClientRect();
    
    // Canvas should fill the container
    const bounds = {
      width: containerRect.width,
      height: containerRect.height,
    };
    
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    
    return bounds;
  };

  // Calculate and store image bounds
  const calculateImageBounds = () => {
    const bounds = getCanvasBounds();
    const img = imageRef.current;
    if (!bounds || !img || !img.complete) return null;

    // Stretch image to fill entire canvas (like object-fit: fill)
    // This stretches 1024x1024 square images to fill the landscape container
    const drawWidth = bounds.width;
    const drawHeight = bounds.height;
    const drawX = 0;
    const drawY = 0;
    
    imageBoundsRef.current = { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
    return imageBoundsRef.current;
  };

  // Update canvas size
  const updateCanvasSize = () => {
    const canvas = mainCanvasRef.current;
    const bounds = getCanvasBounds();
    if (!canvas || !bounds) return;

    // Set canvas internal resolution for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = bounds.width * dpr;
    canvas.height = bounds.height * dpr;
    
    // Set canvas display size
    canvas.style.width = bounds.width + 'px';
    canvas.style.height = bounds.height + 'px';
  };

  // Find fire density and apply lighting effects
  const findFireDensity = () => {
    const img = imageRef.current;
    const analysisCanvas = analysisCanvasRef.current;
    const canvas = mainCanvasRef.current;
    if (!img || !analysisCanvas || !canvas) return;

    analysisCanvas.width = img.naturalWidth;
    analysisCanvas.height = img.naturalHeight;
    const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    
    let imageData: ImageData;
    let data: Uint8ClampedArray;
    
    try {
      imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
      data = imageData.data;
    } catch (error) {
      // CORS error - fallback to center of image for lighting
      console.warn('Cannot read image data due to CORS restrictions. Using center position for lighting effects.');
      // Wait for image bounds to be set in animation loop
      setTimeout(() => {
        const imageBounds = getImageBounds();
        if (imageBounds) {
          const centerX = imageBounds.x + imageBounds.width / 2;
          const centerY = imageBounds.y + imageBounds.height / 2;
          applyEffects(centerX, centerY);
        }
      }, 200);
      return;
    }

    const gridSize = 40;
    const cols = Math.ceil(analysisCanvas.width / gridSize);
    const rows = Math.ceil(analysisCanvas.height / gridSize);
    const grid = new Array(rows).fill(0).map(() => new Array(cols).fill(0));

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let warmth = (r * 2) + (g * 0.5) - (b * 2.5);
      if (r + g + b < 50) warmth = 0;
      if (warmth > 50) {
        const pixelIndex = i / 4;
        const x = pixelIndex % analysisCanvas.width;
        const y = Math.floor(pixelIndex / analysisCanvas.width);
        const col = Math.floor(x / gridSize);
        const row = Math.floor(y / gridSize);
        grid[row][col] += warmth;
      }
    }

    let maxScore = 0;
    let bestRow = 0;
    let bestCol = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > maxScore) {
          maxScore = grid[r][c];
          bestRow = r;
          bestCol = c;
        }
      }
    }

    let totalX = 0;
    let totalY = 0;
    let count = 0;
    for (let r = bestRow - 1; r <= bestRow + 1; r++) {
      for (let c = bestCol - 1; c <= bestCol + 1; c++) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const startX = c * gridSize;
        const endX = Math.min(startX + gridSize, analysisCanvas.width);
        const startY = r * gridSize;
        const endY = Math.min(startY + gridSize, analysisCanvas.height);
        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const index = (y * analysisCanvas.width + x) * 4;
            const rVal = data[index];
            const gVal = data[index + 1];
            const bVal = data[index + 2];
            let warmth = (rVal * 2) + (gVal * 0.5) - (bVal * 2.5);
            if (warmth > 50) {
              totalX += x;
              totalY += y;
              count++;
            }
          }
        }
      }
    }

    if (count > 0) {
      // Get natural image coordinates
      const naturalX = totalX / count;
      const naturalY = totalY / count;
      
      // Convert to displayed canvas coordinates
      const bounds = getCanvasBounds();
      if (bounds && img) {
        const scaleX = bounds.width / img.naturalWidth;
        const scaleY = bounds.height / img.naturalHeight;
        const displayX = naturalX * scaleX;
        const displayY = naturalY * scaleY;
        applyEffects(displayX, displayY);
      }
    }
  };

  // Apply lighting and dust effects
  const applyEffects = (x: number, y: number) => {
    const imageBounds = getImageBounds();
    if (!imageBounds) return;

    // Constrain to image bounds
    const clampedX = Math.max(imageBounds.x, Math.min(imageBounds.x + imageBounds.width, x));
    const clampedY = Math.max(imageBounds.y, Math.min(imageBounds.y + imageBounds.height, y));
    
    // Create or update light effect
    if (!lightEffectRef.current) {
      lightEffectRef.current = createLightEffect(clampedX, clampedY);
    } else {
      lightEffectRef.current.x = clampedX;
      lightEffectRef.current.y = clampedY;
    }

    spawnDust(clampedX, clampedY);
  };

  // Spawn dust particles
  const spawnDust = (x: number, y: number) => {
    const imageBounds = getImageBounds();
    if (!imageBounds) return;

    if (dustIntervalRef.current) {
      clearInterval(dustIntervalRef.current);
    }

    dustIntervalRef.current = setInterval(() => {
      const imageBounds = getImageBounds();
      if (!imageBounds) return;
      
      const dust = createDustParticle(x, y);
      activeDustRef.current.push(dust);
    }, 100);
  };

  // Water drop system
  const scheduleNextDrop = () => {
    const bounds = getCanvasBounds();
    if (!bounds) return;

    // Don't schedule if tab is hidden (prevents accumulation when tab is inactive)
    if (document.hidden) {
      return;
    }

    // Reduced spawn frequency for better performance (10-20 seconds - half the frequency)
    const delay = 10000 + Math.random() * 10000;
    waterDropTimeoutRef.current = setTimeout(() => {
      // Check again before spawning (tab might have become hidden)
      if (!document.hidden) {
        spawnDrop();
        scheduleNextDrop();
      }
    }, delay);
  };

  // Limit maximum active drops to prevent performance issues
  const MAX_DROPS = 25;

  const spawnDrop = () => {
    const imageBounds = getImageBounds();
    if (!imageBounds || imageBounds.width === 0 || imageBounds.height === 0) {
      scheduleNextDrop();
      return;
    }

    // Limit maximum active drops to prevent performance issues
    if (activeDropletsRef.current.length >= MAX_DROPS) {
      scheduleNextDrop();
      return;
    }

    const drop = createWaterDrop();
    activeDropletsRef.current.push(drop);
  };

  // Main animation loop
  const animate = () => {
    const canvas = mainCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const bounds = getCanvasBounds();
    if (!bounds) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    // Scale context for high DPI (canvas internal size is larger than display size)
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, bounds.width, bounds.height);

    // Save context state
    ctx.save();

    // Calculate and store image bounds
    const imageBounds = calculateImageBounds();
    if (!imageBounds) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Clip to image bounds (ensures nothing leaks out)
    ctx.beginPath();
    ctx.rect(imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
    ctx.clip();
    
    // Apply pixelation filter if enabled
    if (pixelationEnabled && img.complete) {
      // Create temporary canvas for pixelation processing
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = imageBounds.width;
        tempCanvas.height = imageBounds.height;
        
        // Draw original image to temp canvas
        tempCtx.drawImage(img, 0, 0, imageBounds.width, imageBounds.height);
        
        // Apply pixelation filter based on mode
        const effectivePixelSize = pixelSize || (pixelationMode === '8bit' ? 6 : 4);
        
        if (pixelationMode === '8bit') {
          apply8BitPixelation(
            tempCanvas,
            ctx,
            imageBounds.x,
            imageBounds.y,
            imageBounds.width,
            imageBounds.height,
            effectivePixelSize
          );
        } else {
          applySimplePixelation(
            tempCanvas,
            ctx,
            imageBounds.x,
            imageBounds.y,
            imageBounds.width,
            imageBounds.height,
            effectivePixelSize
          );
        }
      } else {
        // Fallback: draw image normally if temp canvas creation fails
        ctx.drawImage(img, imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
      }
    } else {
      // Draw image normally if pixelation is disabled
      ctx.drawImage(img, imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
    }

    // Draw fog effects
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fogPuffsRef.current.forEach(puff => {
      puff.update();
      puff.draw(ctx);
    });
    ctx.restore();

    // Draw light effects
    if (lightEffectRef.current) {
      lightEffectRef.current.draw(ctx);
    }

    // Update and draw dust particles
    activeDustRef.current = activeDustRef.current.filter(dust => {
      dust.update();
      if (dust.opacity <= 0 || dust.y < 0) {
        return false; // Remove this particle
      }
      dust.draw(ctx);
      return true; // Keep this particle
    });

    // Update and draw water drops (batched for performance)
    const dropBounds = getImageBounds();
    
    // First, update all drops and identify which to remove
    activeDropletsRef.current = activeDropletsRef.current.filter(drop => {
      const stillActive = drop.update();
      if (!stillActive) {
        // Create splash when drop hits floor
        if (dropBounds && drop.y >= drop.floorY && drop.y <= dropBounds.y + dropBounds.height && drop.x >= dropBounds.x && drop.x <= dropBounds.x + dropBounds.width) {
          const splashes = createSplashParticles(drop.x, Math.min(drop.floorY, dropBounds.y + dropBounds.height), drop.scale);
          activeSplashesRef.current.push(...splashes);
        }
        return false; // Remove this drop
      }
      return true; // Keep this drop
    });
    
    // Batch draw all active drops with minimal state changes
    if (activeDropletsRef.current.length > 0 && dropBounds) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#e0f7ff';
      const boundsY = dropBounds.y;
      const boundsHeight = dropBounds.height;
      const minY = boundsY - 20;
      const maxY = boundsY + boundsHeight;
      
      activeDropletsRef.current.forEach(drop => {
        if (drop.y >= minY && drop.y <= maxY) {
          // Draw at actual size with scale applied directly
          const width = 2 * drop.scale;
          const height = (15 + drop.speed) * drop.scale;
          ctx.fillRect(drop.x, drop.y, width, height);
        }
      });
      ctx.restore();
    }

    // Update and draw splash particles
    activeSplashesRef.current = activeSplashesRef.current.filter(splash => {
      const stillActive = splash.update();
      if (stillActive) {
        splash.draw(ctx);
      }
      return stillActive; // Keep only active splashes
    });

    // Restore context state
    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Initialize fog system
  const initFogSystem = () => {
    // Calculate image bounds if not already set
    const imageBounds = getImageBounds() || calculateImageBounds();
    if (!imageBounds) {
      // Retry after a short delay if bounds aren't ready yet
      setTimeout(() => initFogSystem(), 100);
      return;
    }

    const PUFF_COUNT = 80;
    fogPuffsRef.current = [];
    for (let i = 0; i < PUFF_COUNT; i++) {
      fogPuffsRef.current.push(createFogPuff(imageBounds));
    }
  };

  // Start water cycle
  const startWaterCycle = () => {
    scheduleNextDrop();
  };

  // Handle image load
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    updateCanvasSize();
    
    // Use requestAnimationFrame to ensure canvas is ready
    requestAnimationFrame(() => {
      setTimeout(() => {
        updateCanvasSize();
        initFogSystem();
        findFireDensity();
        setTimeout(() => {
          startWaterCycle();
        }, 100);
      }, 150);
    });
  };

  // Cleanup function
  const cleanup = () => {
    // Stop animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear water drop timeout
    if (waterDropTimeoutRef.current) {
      clearTimeout(waterDropTimeoutRef.current);
      waterDropTimeoutRef.current = null;
    }

    // Clear dust interval
    if (dustIntervalRef.current) {
      clearInterval(dustIntervalRef.current);
      dustIntervalRef.current = null;
    }

    // Clear all particle arrays
    activeDropletsRef.current = [];
    activeSplashesRef.current = [];
    activeDustRef.current = [];
    lightEffectRef.current = null;
  };

  // Load image
  useEffect(() => {
    if (!imageUrl) {
      cleanup();
      setIsImageLoaded(false);
      return;
    }

    cleanup();
    setIsImageLoaded(false);
    imageRef.current = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      handleImageLoad();
    };
    img.onerror = () => {
      console.error('Image load error:', imageUrl);
    };
    img.src = imageUrl;

    return () => {
      cleanup();
    };
  }, [imageUrl]);

  // Handle visibility changes to prevent rain accumulation when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - clear the timeout to prevent accumulation
        if (waterDropTimeoutRef.current) {
          clearTimeout(waterDropTimeoutRef.current);
          waterDropTimeoutRef.current = null;
        }
      } else {
        // Tab became visible - clear accumulated drops and restart fresh
        // Limit drops to prevent lag from accumulated drops
        if (activeDropletsRef.current.length > MAX_DROPS) {
          activeDropletsRef.current = activeDropletsRef.current.slice(0, MAX_DROPS);
        }
        // Restart the water cycle if it was stopped
        if (!waterDropTimeoutRef.current && isImageLoaded) {
          scheduleNextDrop();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isImageLoaded]);

  // Start animation loop when image is loaded
  useEffect(() => {
    if (!isImageLoaded) return;

    updateCanvasSize();
    animate();

    // Update canvas size on window resize
    const handleResize = () => {
      requestAnimationFrame(() => {
        updateCanvasSize();
        // Reinitialize fog with new dimensions
        initFogSystem();
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isImageLoaded, imageUrl]);

  if (!imageUrl) {
    return (
      <div className="scene-image bg-black flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-6xl mb-4">🏰</div>
          <div className="text-sm">No image available</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="atmospheric-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={mainCanvasRef}
        className="scene-image"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <canvas
        ref={analysisCanvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}
