'use client';

import React, { useEffect, useRef, useState } from 'react';
import { applySimplePixelation } from '@/lib/utils/pixelation-filter';

interface TypingTextProps {
  text: string;
  x: number;
  y: number;
  pixelationEnabled?: boolean;
  pixelSize?: number;
}

export function TypingText({ text, x, y, pixelationEnabled = true, pixelSize = 4 }: TypingTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Debug logging
  useEffect(() => {
    console.log('[TypingText] Component mounted/updated:', { text, x, y, displayedText });
  }, [text, x, y, displayedText]);

  // Typing animation effect
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;
    const typingSpeed = 50; // 50ms per character (medium speed)
    
    // Convert text to uppercase for typing animation
    const upperText = text.toUpperCase();

    const typeNextChar = () => {
      if (currentIndex < upperText.length) {
        setDisplayedText(upperText.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };

    const timeoutId = setTimeout(typeNextChar, typingSpeed);
    return () => clearTimeout(timeoutId);
  }, [text]);

  // Render text to canvas with pixelation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayedText) {
      // Clear canvas if no text
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (larger for better quality)
    const fontSize = 38; // 20% smaller than 48px
    const padding = 24; // Proportionally smaller padding
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Text is already uppercase from typing animation
    // Measure text to determine canvas size (using Inter font like Dungeon Entrance)
    const fontString = `bold ${fontSize}px 'Inter', 'Roboto', sans-serif`;
    tempCtx.font = fontString;
    const metrics = tempCtx.measureText(displayedText);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Set canvas size with padding (ensure minimum size)
    const canvasWidth = Math.max(Math.ceil(textWidth) + padding * 2, 100);
    const canvasHeight = Math.max(textHeight + padding * 2, 50);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw text to temp canvas (using Inter font like Dungeon Entrance)
    tempCtx.font = fontString;
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(displayedText, canvasWidth / 2, canvasHeight / 2);

    // V-shaped arrow removed per user request

    // Apply subtle pixelation (20% effect - light)
    if (pixelationEnabled) {
      applySimplePixelation(
        tempCanvas,
        ctx,
        0,
        0,
        canvasWidth,
        canvasHeight,
        3 // Pixel size for 20% effect
      );
    } else {
      // Draw without pixelation
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, [displayedText, pixelationEnabled, pixelSize]);

  if (!text) return null;

  // Ensure valid coordinates
  const validX = isNaN(x) || x === 0 ? 0 : x;
  const validY = isNaN(y) || y === 0 ? 0 : y;

  return (
    <canvas
      ref={canvasRef}
      className="monster-name-text"
      style={{
        position: 'absolute',
        left: '50%', // Center horizontally within parent
        top: `${validY}px`,
        transform: 'translateX(-50%)', // Center the canvas horizontally
        pointerEvents: 'none',
        zIndex: 25,
      }}
    />
  );
}

