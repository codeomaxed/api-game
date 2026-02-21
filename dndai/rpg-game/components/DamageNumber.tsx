'use client';

import React, { useEffect, useState } from 'react';

interface DamageNumberProps {
  damage: number;
  isCritical?: boolean;
  isHeal?: boolean;
  position: { x: number; y: number };
  onComplete: () => void;
}

export function DamageNumber({ damage, isCritical = false, isHeal = false, position, onComplete }: DamageNumberProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  const color = isHeal ? '#10b981' : isCritical ? '#fbbf24' : '#ef4444';
  const size = isCritical ? 'text-2xl' : 'text-lg';
  const prefix = isHeal ? '+' : '-';

  return (
    <div
      className={`fixed pointer-events-none ${size} font-bold z-50`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        color,
        textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px currentColor',
        animation: 'damageFloat 1.5s ease-out forwards',
      }}
    >
      {prefix}{damage}
      {isCritical && '!'}
    </div>
  );
}

