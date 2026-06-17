import { useState, useEffect } from 'react';
import type { Minion } from '@/store/types';
import { useGameStore } from '@/store/gameStore';

interface MinionCardProps {
  minion: Minion;
}

export function MinionCard({ minion }: MinionCardProps) {
  const incrementMinionLife = useGameStore((state) => state.incrementMinionLife);
  const decrementMinionLife = useGameStore((state) => state.decrementMinionLife);
  const removeMinion = useGameStore((state) => state.removeMinion);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleIncrement = () => {
    incrementMinionLife(minion.id);
  };

  const handleDecrement = () => {
    decrementMinionLife(minion.id);
  };

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

  // Don't render if dead and animating
  if (minion.isDead && isAnimating) {
    return (
      <div className="w-20 h-20 border-2 border-red-500 rounded-lg flex flex-col items-center justify-center animate-ping opacity-0">
        <div className="text-sm font-semibold text-chalk">{minion.name}</div>
        <div className="text-2xl font-bold text-mage-red">{minion.life}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 border-2 border-chalk rounded-lg flex flex-col items-center justify-center">
        {/* Dead X mark */}
        {minion.isDead && (
          <div
            className="absolute top-0 right-0 text-red-500 font-bold text-xl leading-none p-1"
            aria-label="minion dead"
          >
            ×
          </div>
        )}
        <div className="text-sm font-semibold text-chalk">{minion.name}</div>
        <div className="text-2xl font-bold text-mage-red">{minion.life}</div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDecrement}
          className="w-6 h-6 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk text-sm font-bold transition-colors"
          aria-label={`minion ${minion.name} decrement`}
        >
          −
        </button>
        <button
          onClick={handleIncrement}
          className="w-6 h-6 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk text-sm font-bold transition-colors"
          aria-label={`minion ${minion.name} increment`}
        >
          +
        </button>
      </div>
    </div>
  );
}

