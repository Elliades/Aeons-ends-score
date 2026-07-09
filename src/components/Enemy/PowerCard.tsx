import { useState, useEffect } from 'react';
import type { Power } from '@/store/types';
import { useGameStore } from '@/store/gameStore';
import { useDrag } from '@/hooks/useDrag';

interface PowerCardProps {
  power: Power;
  index: number;
  totalCount: number;
}

// Helper function to get power image path
function getPowerImagePath(name: string): string {
  // Powers are named pA, pB, pC, etc.
  // Try to find image matching the power name
  // Fallback to generic power image if specific image doesn't exist
  try {
    return `/power/${name}.PNG`;
  } catch {
    return '/power/power.PNG';
  }
}

export function PowerCard({ power, index: _index, totalCount: _totalCount }: PowerCardProps) {
  const incrementPowerTimer = useGameStore((state) => state.incrementPowerTimer);
  const decrementPowerTimer = useGameStore((state) => state.decrementPowerTimer);
  const updatePowerTimer = useGameStore((state) => state.updatePowerTimer);
  const removePower = useGameStore((state) => state.removePower);
  const [imageError, setImageError] = useState(false);

  const handleIncrement = () => {
    incrementPowerTimer(power.id);
  };

  const handleDecrement = () => {
    decrementPowerTimer(power.id);
  };

  const handleUpdateTimer = (newValue: number) => {
    updatePowerTimer(power.id, newValue);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePower(power.id);
  };

  const {
    isDragging,
    dragValue,
    dragHandlers: timerDragHandlers,
  } = useDrag({
    onDrag: () => {
      // Update displayed value while dragging
    },
    onDragEnd: (finalValue) => {
      handleUpdateTimer(finalValue);
    },
    initialValue: power.timer,
    minValue: 0,
    sensitivity: 5, // 5 pixels per unit change
  });

  // Reset image error when power name changes
  useEffect(() => {
    setImageError(false);
  }, [power.name]);

  const isTimerZero = power.timer === 0;
  const imagePath = imageError ? '/power/power.PNG' : getPowerImagePath(power.name);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 border-2 rounded-lg flex flex-col items-center justify-center transition-colors overflow-hidden ${
            isTimerZero
              ? 'border-mage-gold bg-mage-gold/20 animate-pulse-slow'
              : 'border-mage-gold/60'
          }`}
        >
          {/* Power image */}
          <img
            src={imagePath}
            alt={power.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {/* Timer overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              {...timerDragHandlers}
              className="text-white font-bold cursor-grab active:cursor-grabbing select-none text-lg sm:text-xl"
              style={{ opacity: isDragging ? 0.8 : 1 }}
            >
              {isDragging ? dragValue : power.timer}
            </div>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center"
          aria-label={`remove power ${power.name}`}
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDecrement}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk text-base sm:text-lg font-bold transition-colors flex items-center justify-center"
          aria-label={`power ${power.name} decrement`}
        >
          −
        </button>
        <button
          onClick={handleIncrement}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk text-base sm:text-lg font-bold transition-colors flex items-center justify-center"
          aria-label={`power ${power.name} increment`}
        >
          +
        </button>
      </div>
    </div>
  );
}

