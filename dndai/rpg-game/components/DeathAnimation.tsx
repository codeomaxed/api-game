'use client';

import React, { useEffect, useRef } from 'react';
import { segmentCharacter, CharacterSections, Bounds, findCharacterBounds } from '@/lib/utils/monster-animation';
import { playDeathSound, playExplosionSound } from '@/lib/utils/sound-effects';

interface DeathAnimationProps {
  imageUrl: string;
  bounds: { centerX: number; centerY: number; top: number; bottom?: number; headTop?: number };
  onComplete: () => void;
}

interface Piece {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  glow: number;
  scale: number;
}

export function DeathAnimation({ imageUrl, bounds, onComplete }: DeathAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const piecesRef = useRef<Piece[]>([]);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
    type: 'spark' | 'smoke' | 'dark';
  }>>([]);
  const sectionsRef = useRef<CharacterSections | null>(null);
  const imageBoundsRef = useRef<Bounds | null>(null);
  const duration = 2500; // 2.5 seconds for smoother animation

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to cover the entire viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load image and segment it
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      const imageBounds = findCharacterBounds(img, tempCanvas);
      if (!imageBounds) {
        console.error('[DeathAnimation] Could not find character bounds');
        onComplete();
        return;
      }

      imageBoundsRef.current = imageBounds;
      const sections = segmentCharacter(img, imageBounds, tempCanvas);
      if (!sections) {
        console.error('[DeathAnimation] Could not segment character');
        onComplete();
        return;
      }

      sectionsRef.current = sections;

      // Create pieces from sections with enhanced physics
      piecesRef.current = [
        {
          canvas: sections.headChest.canvas,
          x: bounds.centerX,
          y: bounds.top + (imageBounds.height * 0.225), // Top of head/chest section
          vx: -3 + Math.random() * 6,
          vy: -4 - Math.random() * 3,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          life: 1.0,
          glow: 0,
          scale: 1.0,
        },
        {
          canvas: sections.torso.canvas,
          x: bounds.centerX,
          y: bounds.top + (imageBounds.height * 0.55), // Middle of torso
          vx: -2.5 + Math.random() * 5,
          vy: -2 - Math.random() * 2,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.12,
          life: 1.0,
          glow: 0,
          scale: 1.0,
        },
        {
          canvas: sections.pelvis.canvas,
          x: bounds.centerX,
          y: bounds.top + (imageBounds.height * 0.825), // Bottom of pelvis
          vx: -2 + Math.random() * 4,
          vy: 0.5 + Math.random() * 2,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          life: 1.0,
          glow: 0,
          scale: 1.0,
        },
      ];

      // Play death sound
      playDeathSound();

      // Start animation
      animate();
    };

    img.onerror = () => {
      console.error('[DeathAnimation] Failed to load image');
      onComplete();
    };

    img.src = imageUrl;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (progress >= 1) {
        // Animation complete
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        onComplete();
        return;
      }

      // Phase 1: Pieces fall apart (0-50% of duration)
      if (progress < 0.5 && sectionsRef.current && imageBoundsRef.current) {
        const phaseProgress = progress / 0.5;
        
        piecesRef.current.forEach((piece, index) => {
          // Update position with enhanced physics
          piece.x += piece.vx;
          piece.y += piece.vy;
          piece.vy += 0.4; // Gravity
          piece.vx *= 0.98; // Air resistance
          piece.rotation += piece.rotationSpeed;
          
          // Scale down as pieces fade
          piece.scale = 1 - (phaseProgress * 0.5);
          
          // Increase glow as pieces separate (darker, more dramatic)
          piece.glow = Math.min(phaseProgress * 1.5, 0.8);
          
          // Fade out more dramatically
          piece.life = 1 - (phaseProgress * 0.7);
          
          // Draw piece with enhanced effects
          ctx.save();
          ctx.globalAlpha = piece.life;
          // Darker, grittier glow
          ctx.shadowBlur = 25 * piece.glow;
          ctx.shadowColor = `rgba(139, 0, 0, ${piece.glow * 0.8})`; // Dark red glow
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.rotation);
          ctx.scale(piece.scale, piece.scale);
          ctx.drawImage(piece.canvas, -piece.canvas.width / 2, -piece.canvas.height / 2);
          ctx.restore();
        });

        // Emit dark particles and smoke as pieces separate
        if (Math.random() < 0.4) {
          for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const particleType = Math.random() < 0.4 ? 'smoke' : Math.random() < 0.6 ? 'dark' : 'spark';
            
            particlesRef.current.push({
              x: bounds.centerX + (Math.random() - 0.5) * 60,
              y: bounds.centerY + (Math.random() - 0.5) * 60,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - Math.random() * 2,
              life: 1.0,
              size: particleType === 'smoke' ? 3 + Math.random() * 4 : particleType === 'dark' ? 2 + Math.random() * 2 : 1 + Math.random() * 2,
              color: particleType === 'smoke' 
                ? `rgba(40, 40, 40, 0.8)`
                : particleType === 'dark'
                ? `rgba(20, 20, 20, 0.9)`
                : `rgba(139, 0, 0, 0.9)`, // Dark red sparks
              type: particleType,
            });
          }
        }
      }

      // Phase 2: Dark disintegration and explosion (50-100% of duration)
      if (progress >= 0.5) {
        const explosionProgress = (progress - 0.5) / 0.5;
        
        // Trigger explosion sound once
        if (explosionProgress < 0.15 && particlesRef.current.length < 80) {
          playExplosionSound();
        }

        // Create dark explosion particles and smoke
        if (explosionProgress < 0.4) {
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            const particleType = Math.random() < 0.5 ? 'smoke' : Math.random() < 0.7 ? 'dark' : 'spark';
            
            particlesRef.current.push({
              x: bounds.centerX + (Math.random() - 0.5) * 20,
              y: bounds.centerY + (Math.random() - 0.5) * 20,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - Math.random() * 2,
              life: 1.0,
              size: particleType === 'smoke' 
                ? 4 + Math.random() * 5 
                : particleType === 'dark'
                ? 2 + Math.random() * 3
                : 1.5 + Math.random() * 2.5,
              color: particleType === 'smoke'
                ? `rgba(30, 30, 30, 0.9)`
                : particleType === 'dark'
                ? `rgba(10, 10, 10, 0.95)`
                : `rgba(139, 0, 0, 0.8)`, // Dark red sparks
              type: particleType,
            });
          }
        }

        // Draw dark explosion flash (darker, more dramatic)
        const flashSize = 120 * (1 - explosionProgress);
        const flashOpacity = (1 - explosionProgress) * 0.7;
        ctx.save();
        ctx.globalAlpha = flashOpacity;
        // Dark red/orange flash instead of gold
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'rgba(139, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(bounds.centerX, bounds.centerY, flashSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update and draw particles with enhanced physics
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply physics based on particle type
        if (particle.type === 'smoke') {
          particle.vy -= 0.05; // Smoke rises
          particle.vx *= 0.95; // Slower horizontal movement
          particle.vy *= 0.98;
        } else if (particle.type === 'dark') {
          particle.vy += 0.2; // Dark particles fall faster
          particle.vx *= 0.97;
        } else {
          particle.vy += 0.18; // Sparks fall with gravity
          particle.vx *= 0.96;
        }
        
        // Fade out based on type
        const fadeRate = particle.type === 'smoke' ? 0.012 : particle.type === 'dark' ? 0.018 : 0.02;
        particle.life -= fadeRate;
        
        if (particle.life <= 0) return false;

        // Draw particle with enhanced effects
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        
        // Different shadow effects for different particle types
        if (particle.type === 'smoke') {
          ctx.shadowBlur = 15 * particle.life;
          ctx.shadowColor = `rgba(20, 20, 20, ${particle.life * 0.8})`;
        } else if (particle.type === 'dark') {
          ctx.shadowBlur = 8 * particle.life;
          ctx.shadowColor = `rgba(10, 10, 10, ${particle.life * 0.9})`;
        } else {
          ctx.shadowBlur = 12 * particle.life;
          ctx.shadowColor = `rgba(139, 0, 0, ${particle.life * 0.7})`;
        }
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageUrl, bounds, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 102,
      }}
    />
  );
}



