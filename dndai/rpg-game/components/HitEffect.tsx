'use client';

import React, { useEffect, useRef } from 'react';

interface HitEffectProps {
  x: number;
  y: number;
  isCritical: boolean;
  onComplete: () => void;
}

export function HitEffect({ x, y, isCritical, onComplete }: HitEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const duration = isCritical ? 600 : 400; // Longer for critical hits
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to cover the entire viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles
    const particleCount = isCritical ? 20 : 12;
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: isCritical ? 3 + Math.random() * 3 : 2 + Math.random() * 2,
        color: isCritical 
          ? `hsl(${30 + Math.random() * 30}, 100%, ${60 + Math.random() * 20}%)` // Yellow-orange for critical
          : `hsl(${0 + Math.random() * 20}, 100%, ${50 + Math.random() * 20}%)`, // Red-orange for normal
      });
    }

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

      // Draw impact flash
      const flashSize = isCritical ? 40 : 25;
      const flashOpacity = (1 - progress) * 0.8;
      ctx.save();
      ctx.globalAlpha = flashOpacity;
      ctx.fillStyle = isCritical ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 20;
      ctx.shadowColor = isCritical ? 'rgba(255, 215, 0, 1)' : 'rgba(255, 255, 255, 1)';
      ctx.beginPath();
      ctx.arc(x, y, flashSize * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity
        particle.vy += 0.2;
        
        // Fade out
        particle.life -= 0.02;
        
        if (particle.life <= 0) return false;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [x, y, isCritical, onComplete]);

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
        zIndex: 101,
      }}
    />
  );
}







