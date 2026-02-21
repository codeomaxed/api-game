'use client';

import React, { useEffect, useState } from 'react';

interface LevelUpNotificationProps {
  newLevel: number;
  onComplete: () => void;
}

export function LevelUpNotification({ newLevel, onComplete }: LevelUpNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        animation: 'fadeInOut 3s ease-in-out forwards',
      }}
    >
      <div
        className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg p-8 shadow-2xl border-4 border-yellow-400"
        style={{
          transform: 'scale(1)',
          animation: 'levelUpPulse 3s ease-in-out',
          boxShadow: '0 0 50px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 165, 0, 0.6)',
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4" style={{ animation: 'bounce 1s ease-in-out infinite' }}>
            ⭐
          </div>
          <div className="text-4xl font-bold text-white mb-2" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
            LEVEL UP!
          </div>
          <div className="text-3xl font-bold text-yellow-200" style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
            Level {newLevel}
          </div>
        </div>
      </div>
    </div>
  );
}







