import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PlayerType } from '@/store/types';
import { getTurnPlayerLabel } from '@/utils/turnLabels';

const cardColors: Record<PlayerType, string> = {
  P1: 'bg-yellow-500 text-black',    // Player 1 - Yellow
  P2: 'bg-blue-500 text-white',      // Player 2 - Blue
  P3: 'bg-green-500 text-white',    // Player 3 - Green
  P4: 'bg-white text-black',        // Player 4 - White
  Joker: 'bg-yellow-500 text-black',
  Nemesis: 'bg-mage-red text-white',
  '1-2': 'bg-purple-500 text-white', // Pair 1-2 - Purple
  '3-4': 'bg-pink-500 text-white',   // Pair 3-4 - Pink
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

interface CardBoxProps {
  card: PlayerType | null;
  isCurrent: boolean;
  isPlayed: boolean;
  index: number;
}

function CardBox({ card, isCurrent, isPlayed }: CardBoxProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when card changes
  useEffect(() => {
    setImageError(false);
  }, [card]);

  if (!card) {
    return (
      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-2 border-dashed border-mage-gold/50 rounded-lg flex items-center justify-center bg-mage-purple-dark/30">
        <span className="text-chalk-dim text-xs sm:text-sm">-</span>
      </div>
    );
  }

  const colorClass = cardColors[card];
  const label = getTurnPlayerLabel(card);
  const imagePath = getTurnCardImagePath(card);
  const showImage = imagePath && !imageError;

  return (
    <div
      className={`relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-2 rounded-lg flex items-center justify-center font-semibold text-sm sm:text-base md:text-lg overflow-hidden transition-all ${
        isCurrent
          ? 'border-mage-gold border-2 ring-2 ring-mage-gold shadow-lg scale-110'
          : isPlayed
          ? 'border-mage-gold/30 opacity-60'
          : 'border-mage-gold/60'
      } ${showImage ? '' : colorClass}`}
      style={isCurrent ? {
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)'
      } : {}}
    >
      {showImage ? (
        <img
          src={imagePath}
          alt={card}
          className="absolute inset-[2px] w-[calc(100%-4px)] h-[calc(100%-4px)] object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{label}</span>
      )}
      {isCurrent && (
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-mage-gold text-xl sm:text-2xl md:text-3xl z-10 font-bold">
          ↓
        </div>
      )}
    </div>
  );
}

export function CardSequence() {
  const currentPlayer = useGameStore((state) => state.turn.currentPlayer);
  const drawPile = useGameStore((state) => state.turn.drawPile);
  const playedCards = useGameStore((state) => state.turn.playedCards);
  const playerCount = useGameStore((state) => state.turn.playerCount);

  // Deck size depends on player count: 4 players = 8 cards, others = 6 cards
  const deckSize = playerCount === 4 ? 8 : 6;
  
  // Get all cards in the deck (played + remaining)
  const allDeckCards = [...playedCards, ...drawPile];
  
  // Sort all cards alphabetically for labels (by card name)
  const sortedCards = [...allDeckCards].sort((a, b) => a.localeCompare(b));
  
  // Track which specific card instances have been drawn
  // Create a map to count drawn cards
  const drawnCounts = new Map<PlayerType, number>();
  playedCards.forEach((card) => {
    drawnCounts.set(card, (drawnCounts.get(card) || 0) + 1);
  });
  
  // Build array of placeholders: played cards + empty placeholders (hide next card)
  const placeholders: (PlayerType | null)[] = [];
  
  // Add played cards
  for (let i = 0; i < playedCards.length; i++) {
    placeholders.push(playedCards[i]);
  }
  
  // Add empty placeholders for remaining slots (don't show next card)
  const remainingSlots = deckSize - placeholders.length;
  for (let i = 0; i < remainingSlots; i++) {
    placeholders.push(null);
  }

  return (
    <div className="space-y-4">
      {/* Labels showing all cards in deck alphabetically - above slots */}
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
        {sortedCards.map((card, index) => {
          // Check if this specific instance has been drawn
          // Count how many of this card type appear before this index
          const cardsBeforeThis = sortedCards.slice(0, index).filter(c => c === card).length;
          const drawnCount = drawnCounts.get(card) || 0;
          const isDrawn = cardsBeforeThis < drawnCount;
          
          return (
            <div
              key={`${card}-${index}`}
              className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded ${
                isDrawn
                  ? 'text-chalk/50 bg-mage-purple-dark/50'
                  : 'text-chalk bg-mage-purple-dark/70'
              }`}
            >
              {getTurnPlayerLabel(card)}
            </div>
          );
        })}
      </div>
      
      {/* Card placeholders - larger and more prominent */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
        {placeholders.slice(0, deckSize).map((card, index) => {
          const isPlayed = index < playedCards.length;
          const isCurrent =
            currentPlayer !== null &&
            card === currentPlayer &&
            index === playedCards.length - 1;
          return (
            <CardBox 
              key={`${card}-${index}`} 
              card={card} 
              isCurrent={isCurrent} 
              isPlayed={isPlayed}
              index={index} 
            />
          );
        })}
      </div>
    </div>
  );
}

