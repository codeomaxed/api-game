'use client';

import React, { useEffect, useRef } from 'react';

interface AttackAnimationProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onComplete: () => void;
}

interface BloodDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export function AttackAnimation({ fromX, fromY, toX, toY, onComplete }: AttackAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lifeRef = useRef<number>(0);
  const maxLife = 20; // Matches HTML example
  const bloodDropsRef = useRef<BloodDrop[]>([]);
  const slashCompleteRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to cover the entire viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset life on mount
    lifeRef.current = 0;
    bloodDropsRef.current = [];
    slashCompleteRef.current = false;

    const animate = () => {
      const progress = lifeRef.current / maxLife;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw slash animation
      if (progress < 1) {
        // Calculate current position along the diagonal line
        const currentX = fromX + (toX - fromX) * progress;
        const currentY = fromY + (toY - fromY) * progress;

        ctx.save();

        // Dark, gritty slash - deep red/orange glow
        ctx.strokeStyle = `rgba(120, 20, 20, ${1 - progress})`;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(150, 0, 0, 0.9)';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        // Dark metallic core - dark gray/steel
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(60, 60, 70, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        // Slight bright edge for visibility
        ctx.strokeStyle = `rgba(180, 100, 80, ${(1 - progress) * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        ctx.restore();
      } else if (!slashCompleteRef.current) {
        // Slash just completed - spawn blood drops
        slashCompleteRef.current = true;
        const centerX = (fromX + toX) / 2;
        const centerY = (fromY + toY) / 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Spawn blood drops in a spray pattern
        for (let i = 0; i < 25; i++) {
          const sprayAngle = angle + (Math.random() - 0.5) * Math.PI * 0.8;
          const speed = 2 + Math.random() * 4;
          bloodDropsRef.current.push({
            x: centerX + (Math.random() - 0.5) * 20,
            y: centerY + (Math.random() - 0.5) * 20,
            vx: Math.cos(sprayAngle) * speed,
            vy: Math.sin(sprayAngle) * speed,
            life: 0,
            size: 2 + Math.random() * 4,
          });
        }
      }

      // Update and draw blood drops
      if (bloodDropsRef.current.length > 0) {
        bloodDropsRef.current = bloodDropsRef.current.filter(drop => {
          drop.x += drop.vx;
          drop.y += drop.vy;
          drop.vy += 0.3; // Gravity
          drop.vx *= 0.98; // Friction
          drop.life++;
          
          const dropProgress = drop.life / 40; // Blood drops last 40 frames
          const alpha = Math.max(0, 1 - dropProgress);

          if (alpha <= 0 || drop.life > 40) {
            return false; // Remove dead drops
          }

          // Draw blood drop
          ctx.save();
          ctx.fillStyle = `rgba(${120 + Math.random() * 30}, ${10 + Math.random() * 20}, ${10 + Math.random() * 20}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Dark blood trail
          if (drop.life > 1) {
            ctx.strokeStyle = `rgba(80, 5, 5, ${alpha * 0.5})`;
            ctx.lineWidth = drop.size * 0.5;
            ctx.beginPath();
            ctx.moveTo(drop.x - drop.vx, drop.y - drop.vy);
            ctx.lineTo(drop.x, drop.y);
            ctx.stroke();
          }
          
          ctx.restore();
          return true;
        });
      }

      // Animation complete when slash is done and all blood is gone
      if (progress >= 1 && bloodDropsRef.current.length === 0) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        onComplete();
        return;
      }

      lifeRef.current++;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fromX, fromY, toX, toY, onComplete]);

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
        zIndex: 100,
      }}
    />
  );
}


