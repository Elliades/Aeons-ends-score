import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PlayerType } from '@/store/types';
import { useTurnPlayerLabel } from '@/utils/turnLabels';

const cardColors: Record<PlayerType, string> = {
  P1: 'bg-yellow-500',    // Player 1 - Yellow
  P2: 'bg-blue-500',      // Player 2 - Blue
  P3: 'bg-green-500',    // Player 3 - Green
  P4: 'bg-white',        // Player 4 - White
  Joker: 'bg-yellow-500',
  Nemesis: 'bg-mage-red',
  '1-2': 'bg-purple-500', // Pair 1-2 - Purple
  '3-4': 'bg-pink-500',   // Pair 3-4 - Pink
};


// Helper function to get turn card image path
function getTurnCardImagePath(player: PlayerType): string | null {
  // Map player types to image names
  // P1 -> p1, P2 -> p2, P3 -> p3, P4 -> p4, Nemesis -> N
  // 1-2 -> 1-2, 3-4 -> 3-4, Joker -> joker
  if (player === 'Joker') {
    return '/turn/joker.png';
  }
  if (player === 'Nemesis') {
    return '/turn/N.PNG';
  }
  if (player === '1-2' || player === '3-4') {
    return `/turn/${player}.png`;
  }
  const imageName = player.toLowerCase();
  return `/turn/${imageName}.PNG`;
}

export function CurrentPlayerCard() {
  const currentPlayer = useGameStore((state) => state.turn.currentPlayer);
  const advanceTurn = useGameStore((state) => state.advanceTurn);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    advanceTurn();
  };

  // Reset image error when player changes
  useEffect(() => {
    setImageError(false);
  }, [currentPlayer]);

  if (!currentPlayer) {
    return (
      <div className="flex justify-center items-center p-4">
        <button
          onClick={handleClick}
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-dashed border-chalk/50 rounded-lg flex items-center justify-center hover:border-chalk transition-colors text-chalk text-base sm:text-lg md:text-xl"
        >
          Start
        </button>
      </div>
    );
  }

  const colorClass = cardColors[currentPlayer];
  const label = useTurnPlayerLabel(currentPlayer);
  const imagePath = getTurnCardImagePath(currentPlayer);
  const showImage = imagePath && !imageError;

  return (
    <div className="flex justify-center items-center p-4">
      <button
        onClick={handleClick}
        className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-chalk rounded-lg flex items-center justify-center font-bold text-xl sm:text-2xl md:text-3xl text-white hover:opacity-80 transition-opacity cursor-pointer overflow-hidden relative ${
          showImage ? '' : colorClass
        }`}
      >
        {showImage ? (
          <img
            src={imagePath}
            alt={currentPlayer}
            className="absolute inset-[2px] w-[calc(100%-4px)] h-[calc(100%-4px)] object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}

