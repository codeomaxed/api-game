'use client';

import React, { useEffect, useRef } from 'react';
import { useCharacter } from '@/lib/character/CharacterContext';
import { Item } from '@/types/character';
import type { EquipmentSlot } from '@/types/character';
import { applySimplePixelation } from '@/lib/utils/pixelation-filter';

const slotLabels: Record<EquipmentSlot, string> = {
  head: 'Head',
  shoulder: 'Shoulder',
  chest: 'Chest',
  hands: 'Hands',
  feet: 'Feet',
  neck: 'Neck',
  cape: 'Cape',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  weapon: 'Weapon',
  shield: 'Shield', // Kept for type compatibility, but not displayed
};

// Equipment slots in the exact order from HTML: 2 columns
const equipmentOrder: EquipmentSlot[] = [
  'head', 'neck',
  'shoulder', 'cape',
  'chest', 'hands',
  'ring1', 'feet', // Note: HTML shows "Legs" but we use feet
  'ring2', 'feet', // This is a duplicate, we'll handle it
  'weapon', 'shield',
];

export function Inventory() {
  const { character, equipItem, unequipItem } = useCharacter();

  if (!character) {
    return (
      <div className="p-4" style={{ color: 'var(--text-muted)' }}>
        No character loaded
      </div>
    );
  }

  const handleSlotClick = (slot: EquipmentSlot) => {
    // Show inventory modal to select item
    // For now, just log
    console.log(`Clicked ${slot}`);
  };

  const handleItemClick = (item: Item) => {
    // Show item details and equip option
    console.log(`Clicked item: ${item.name}`);
  };

  // Equipment slots: left column and right column
  const leftColumnSlots: EquipmentSlot[] = ['head', 'shoulder', 'chest', 'ring1', 'ring2'];
  const rightColumnSlots: EquipmentSlot[] = ['neck', 'cape', 'hands', 'feet', 'weapon'];

  return (
    <div className="p-1 flex flex-col h-full min-h-0" style={{ height: '100%', overflow: 'visible' }}>
      {/* Equipment Slots */}
      <div className="flex-shrink-0" style={{ marginTop: '3rem', marginBottom: '1rem' }}>
        <h2 className="text-[0.5rem] font-cinzel mb-0.25" style={{ color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
          Equipment
        </h2>
        <div className="equipment-grid mb-0" style={{ width: '100%', marginLeft: '-0.25rem', marginRight: '-0.25rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          <div className="equipment-column">
            {leftColumnSlots.map(slot => (
              <EquipmentSlot
                key={slot}
                slot={slot}
                item={character.equipment[slot]}
                onClick={() => handleSlotClick(slot)}
              />
            ))}
          </div>
          <div className="character-viewer">
            <div className="character-placeholder">
              {character.portraitUrl ? (
                <>
                  <img
                    src={character.portraitUrl}
                    alt={character.name}
                    className="character-full-body"
                  />
                  <CharacterPixelationOverlay imageUrl={character.portraitUrl} />
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">⚔️</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{character.name}</div>
                </>
              )}
            </div>
          </div>
          <div className="equipment-column">
            {rightColumnSlots.map(slot => (
              <EquipmentSlot
                key={slot}
                slot={slot}
                item={character.equipment[slot]}
                onClick={() => handleSlotClick(slot)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Backpack Inventory */}
      <div className="flex-1 flex flex-col min-h-0 overflow-visible" style={{ justifyContent: 'flex-end' }}>
        <div className="backpack-grid" style={{ height: '150px', minHeight: '140px', maxHeight: '140px', flexShrink: 0, marginTop: '2rem', marginBottom: '0' }}>
          {character.inventory.map((item, index) => (
            <InventoryItem
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
          {/* Empty slots - 16 total slots (8 columns × 2 rows) */}
          {Array.from({ length: Math.max(0, 16 - character.inventory.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="slot slot-pack"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EquipmentSlot({
  slot,
  item,
  onClick,
}: {
  slot: EquipmentSlot;
  item?: Item;
  onClick: () => void;
}) {
  const isEquipped = !!item;
  const slotStyle = isEquipped 
    ? { borderColor: 'var(--gold)', color: 'white' }
    : {};

  return (
    <div
      onClick={onClick}
      className="slot slot-equip"
      style={slotStyle}
    >
      {item ? (
        item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: '85%',
              height: '85%',
              objectFit: 'contain',
              objectPosition: 'center',
            }}
          />
        ) : (
          <div className="text-center" style={{ fontSize: '0.9rem', fontFamily: 'Inter, Roboto, sans-serif' }}>
            <div className="font-bold" style={{ color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{item.name}</div>
            <div style={{ color: '#cccccc', fontSize: '0.7rem', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{item.rarity}</div>
          </div>
        )
      ) : (
        <span className="slot-label" style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', fontFamily: 'Inter, Roboto, sans-serif' }}>{slotLabels[slot]}</span>
      )}
    </div>
  );
}

function InventoryItem({
  item,
  onClick,
}: {
  item: Item;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="slot slot-pack"
      title={`${item.name} (${item.rarity})`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{
            width: '85%',
            height: '85%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      ) : (
        <div className="text-[0.5rem] text-center h-full flex flex-col items-center justify-center">
          <div className="font-bold truncate w-full">{item.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.4rem' }}>{item.rarity}</div>
        </div>
      )}
    </div>
  );
}

function CharacterPixelationOverlay({ imageUrl }: { imageUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get the image element to match its size
      const imgElement = canvas.parentElement?.querySelector('.character-full-body') as HTMLImageElement;
      if (!imgElement || !imgElement.complete) return;

      const rect = imgElement.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (width === 0 || height === 0) return;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create source canvas with original image at full resolution
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) return;

        sourceCanvas.width = img.naturalWidth;
        sourceCanvas.height = img.naturalHeight;
        sourceCtx.drawImage(img, 0, 0);

        // Create temp canvas for pixelated version
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = width;
        tempCanvas.height = height;

        // Apply pixelation (smaller pixel size = less pixelation effect)
        const pixelSize = 3;
        applySimplePixelation(
          sourceCanvas,
          tempCtx,
          0,
          0,
          width,
          height,
          pixelSize
        );

        // Draw pixelated version at 50% opacity
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1.0;
      };

      img.src = imageUrl;
    };

    // Wait for image to load, then update
    const imgElement = canvas.parentElement?.querySelector('.character-full-body') as HTMLImageElement;
    if (imgElement?.complete) {
      updateCanvas();
    } else {
      imgElement?.addEventListener('load', updateCanvas);
    }

    // Also update on resize
    const resizeObserver = new ResizeObserver(updateCanvas);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      imgElement?.removeEventListener('load', updateCanvas);
      resizeObserver.disconnect();
    };
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="character-pixelation-overlay"
    />
  );
}


