import { useState, useEffect, useRef } from 'react';
import type { Minion } from '@/store/types';
import { useGameStore } from '@/store/gameStore';
import { useLongPress } from '@/hooks/useLongPress';
import { useDrag } from '@/hooks/useDrag';
import { QuickSelectOverlay } from '@/components/common/QuickSelectOverlay';

// Helper function to get monster image path
function getMonsterImagePath(name: string): string {
  // Try to find image matching the minion name (A, B, C, etc.)
  // Fallback to generic monster image if specific image doesn't exist
  try {
    return `/monsters/${name}.PNG`;
  } catch {
    return '/monsters/monster.PNG';
  }
}

interface MinionCardProps {
  minion: Minion;
  index: number;
  totalCount: number;
}

export function MinionCard({ minion, index: _index, totalCount: _totalCount }: MinionCardProps) {
  const incrementMinionLife = useGameStore((state) => state.incrementMinionLife);
  const decrementMinionLife = useGameStore((state) => state.decrementMinionLife);
  const updateMinionLife = useGameStore((state) => state.updateMinionLife);
  const removeMinion = useGameStore((state) => state.removeMinion);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOptions, setOverlayOptions] = useState<number[]>([]);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [overlayType, setOverlayType] = useState<'value' | 'increment' | 'decrement'>('value');
  const lifeValueRef = useRef<HTMLDivElement>(null);
  const incrementRef = useRef<HTMLButtonElement>(null);
  const decrementRef = useRef<HTMLButtonElement>(null);

  const handleIncrement = () => {
    incrementMinionLife(minion.id);
  };

  const handleDecrement = () => {
    decrementMinionLife(minion.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeMinion(minion.id);
  };

  const handleUpdateLife = (newValue: number) => {
    updateMinionLife(minion.id, newValue);
  };

  const handleLifeLongPress = (event: MouseEvent | TouchEvent) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    // Show options to set value: -10, -5, +5, +10 relative to current (absolute values)
    const options = [-10, -5, 5, 10]
      .map(offset => minion.life + offset)
      .filter(v => v >= 0)
      .slice(0, 4); // Max 4 options
    setOverlayOptions(options);
    setOverlayType('value');
    setOverlayPosition({ x: clientX, y: clientY });
    setShowOverlay(true);
  };

  const handleIncrementLongPress = (event: MouseEvent | TouchEvent) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    setOverlayOptions([2, 4, 5]);
    setOverlayType('increment');
    setOverlayPosition({ x: clientX, y: clientY });
    setShowOverlay(true);
  };

  const handleDecrementLongPress = (event: MouseEvent | TouchEvent) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    setOverlayOptions([-2, -4, -5]);
    setOverlayType('decrement');
    setOverlayPosition({ x: clientX, y: clientY });
    setShowOverlay(true);
  };

  const handleOverlaySelect = (selectedValue: number) => {
    if (overlayType === 'value') {
      // Set absolute value
      handleUpdateLife(selectedValue);
    } else if (overlayType === 'increment') {
      // Add the offset
      const newValue = minion.life + selectedValue;
      handleUpdateLife(newValue);
    } else if (overlayType === 'decrement') {
      // Subtract the offset
      const newValue = Math.max(0, minion.life + selectedValue); // selectedValue is negative
      handleUpdateLife(newValue);
    }
    setShowOverlay(false);
  };

  const lifeLongPress = useLongPress({
    onLongPress: handleLifeLongPress,
    onClick: undefined,
  });

  const incrementLongPress = useLongPress({
    onLongPress: handleIncrementLongPress,
    onClick: handleIncrement,
  });

  const decrementLongPress = useLongPress({
    onLongPress: handleDecrementLongPress,
    onClick: handleDecrement,
  });

  const {
    isDragging,
    dragValue,
    dragHandlers: lifeDragHandlers,
  } = useDrag({
    onDrag: () => {
      // Update displayed value while dragging
    },
    onDragEnd: (finalValue) => {
      handleUpdateLife(finalValue);
    },
    initialValue: minion.life,
    minValue: 0,
    sensitivity: 5, // 5 pixels per life point
  });

  // Trigger death animation when minion dies
  useEffect(() => {
    if (minion.isDead && !isAnimating) {
      setIsAnimating(true);
      // After animation, remove the minion
      const timer = setTimeout(() => {
        removeMinion(minion.id);
      }, 500); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [minion.isDead, minion.id, isAnimating, removeMinion]);

  // Reset image error when minion name changes
  useEffect(() => {
    setImageError(false);
  }, [minion.name]);

  // Don't render if dead and animating
  if (minion.isDead && isAnimating) {
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center animate-ping opacity-0">
        <div className="text-xs sm:text-sm font-semibold text-chalk">{minion.name}</div>
          <div className="text-lg sm:text-xl font-bold" style={{ color: '#ff2200' }}>{minion.life}</div>
      </div>
    );
  }

  const imagePath = imageError ? '/monsters/monster.PNG' : getMonsterImagePath(minion.name);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 border-2 border-mage-gold/60 rounded-lg flex flex-col items-center justify-center overflow-hidden">
          {/* Monster image */}
          <img
            src={imagePath}
            alt={minion.name}
            className={`absolute inset-0 w-full h-full object-cover ${minion.isDead ? 'opacity-30 grayscale' : ''}`}
            onError={() => setImageError(true)}
          />
          {/* Dead X mark */}
          {minion.isDead && (
            <div
              className="absolute top-0 right-0 text-red-500 font-bold text-lg sm:text-xl leading-none p-1 z-10"
              aria-label="minion dead"
            >
              ×
            </div>
          )}
          {/* Life points - centered */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              ref={lifeValueRef}
              {...lifeLongPress}
              {...lifeDragHandlers}
              className={`text-lg sm:text-xl font-bold cursor-grab active:cursor-grabbing select-none ${
                isDragging ? 'opacity-80' : ''
              }`}
              style={{ color: '#ff2200' }}
              aria-label={`minion ${minion.name} life points`}
            >
              {isDragging ? dragValue : minion.life}
            </div>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center"
          aria-label={`remove minion ${minion.name}`}
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <button
          ref={decrementRef}
          {...decrementLongPress}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk text-base sm:text-lg font-bold transition-colors flex items-center justify-center"
          aria-label={`minion ${minion.name} decrement`}
        >
          −
        </button>
        <button
          ref={incrementRef}
          {...incrementLongPress}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk text-base sm:text-lg font-bold transition-colors flex items-center justify-center"
          aria-label={`minion ${minion.name} increment`}
        >
          +
        </button>
      </div>
      {showOverlay && (
        <QuickSelectOverlay
          options={overlayOptions}
          onSelect={handleOverlaySelect}
          onClose={() => setShowOverlay(false)}
          position={overlayPosition}
          anchorElement={
            overlayType === 'increment'
              ? incrementRef.current
              : overlayType === 'decrement'
              ? decrementRef.current
              : lifeValueRef.current
          }
          hidePlusSign={overlayType === 'value'}
        />
      )}
    </div>
  );
}

