import { useGameStore } from '@/store/gameStore';
import { CardSequence } from './CardSequence';
import { useEffect, useState, useMemo } from 'react';
import type { PlayerType } from '@/store/types';
import { getTurnPlayerLabel } from '@/utils/turnLabels';
import { RenameModal } from '../common/RenameModal';
import { useLongPress } from '@/hooks/useLongPress';

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

// Default labels - custom labels are handled via useTurnPlayerLabel hook
const defaultCardLabels: Record<PlayerType, string> = {
  P1: 'J1',
  P2: 'J2',
  P3: 'J3',
  P4: 'J4',
  Joker: '★',
  Nemesis: 'N',
  '1-2': '1-2',
  '3-4': '3-4',
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

export function TurnSection() {
  const [imageError, setImageError] = useState(false);
  const [renameModal, setRenameModal] = useState<{ playerType: '1-2' | '3-4'; currentName: string } | null>(null);
  const initializeDeck = useGameStore((state) => state.initializeDeck);
  const playerCount = useGameStore((state) => state.turn.playerCount);
  const currentPlayer = useGameStore((state) => state.turn.currentPlayer);
  const advanceTurn = useGameStore((state) => state.advanceTurn);
  const updateTurnPlayerLabel = useGameStore((state) => state.updateTurnPlayerLabel);
  const customLabels = useGameStore((state) => state.turn.customLabels);

  // Reset image error when player changes
  useEffect(() => {
    setImageError(false);
  }, [currentPlayer]);

  // Initialize or update deck when player count changes
  useEffect(() => {
    initializeDeck(playerCount);
  }, [initializeDeck, playerCount]);

  const handlePlayerCountChange = (newCount: number) => {
    initializeDeck(newCount);
  };

  const handleRename = (playerType: '1-2' | '3-4') => {
    const currentName = customLabels?.[playerType] || defaultCardLabels[playerType];
    setRenameModal({ playerType, currentName });
  };

  const handleSaveRename = (playerType: '1-2' | '3-4', newName: string) => {
    updateTurnPlayerLabel(playerType, newName);
  };

  // Long press handlers for renaming
  const handleLongPress1_2 = useLongPress({ onLongPress: () => handleRename('1-2'), delay: 500 });
  const handleLongPress3_4 = useLongPress({ onLongPress: () => handleRename('3-4'), delay: 500 });

  // Get current player label
  const currentPlayerLabel = currentPlayer ? getTurnPlayerLabel(currentPlayer) : null;
  
  // Memoize current player card props
  const currentPlayerCardProps = useMemo(() => {
    if (!currentPlayer) return null;
    
    const colorClass = cardColors[currentPlayer];
    const imagePath = getTurnCardImagePath(currentPlayer);
    const isRenameable = currentPlayer === '1-2' || currentPlayer === '3-4';
    const longPressHandlers = currentPlayer === '1-2' 
      ? handleLongPress1_2 
      : currentPlayer === '3-4' 
      ? handleLongPress3_4 
      : {};
    
    return {
      colorClass,
      imagePath,
      isRenameable,
      longPressHandlers,
    };
  }, [currentPlayer, handleLongPress1_2, handleLongPress3_4]);

  // Show "add players to start" message when no players
  if (playerCount === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 px-4">
        {/* Player count selector */}
        <div className="flex justify-center items-center gap-4">
          <span className="text-chalk text-lg font-semibold">Joueurs:</span>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => handlePlayerCountChange(count)}
                className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded border-2 transition-all text-base ${
                  playerCount === count
                    ? 'bg-mage-gold border-mage-gold text-mage-darker font-bold shadow-lg'
                    : 'bg-transparent border-mage-gold/50 text-chalk hover:border-mage-gold hover:bg-mage-gold/10'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Message when no players */}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-2xl md:text-3xl font-semibold text-chalk/70 text-center">
            Add players to start
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Player count selector */}
      <div className="flex justify-center items-center gap-2 sm:gap-4">
        <span className="text-chalk text-base sm:text-lg font-semibold">Joueurs:</span>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => handlePlayerCountChange(count)}
              className={`min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2 rounded border-2 transition-all text-base sm:text-lg ${
                playerCount === count
                  ? 'bg-mage-gold border-mage-gold text-mage-darker font-bold shadow-lg'
                  : 'bg-transparent border-mage-gold/50 text-chalk hover:border-mage-gold hover:bg-mage-gold/10'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Large prominent current player card in the middle */}
      <div className="flex justify-center items-center">
        {currentPlayer && currentPlayerCardProps ? (
          <div className="relative">
            <button
              onClick={advanceTurn}
              {...(currentPlayerCardProps.isRenameable ? currentPlayerCardProps.longPressHandlers : {})}
              className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 border-4 border-mage-gold rounded-lg flex items-center justify-center font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white transition-all hover:scale-105 hover:shadow-2xl overflow-hidden relative ${
                (currentPlayerCardProps.imagePath && !imageError) ? '' : currentPlayerCardProps.colorClass
              }`}
              style={{ 
                textShadow: (currentPlayerCardProps.imagePath && !imageError) ? 'none' : '0 0 20px rgba(245, 158, 11, 0.8)',
                boxShadow: '0 0 40px rgba(245, 158, 11, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)'
              }}
              aria-label={currentPlayerCardProps.isRenameable ? "Advance turn (long press to rename)" : "Advance turn"}
            >
              {(currentPlayerCardProps.imagePath && !imageError) ? (
                <img
                  src={currentPlayerCardProps.imagePath}
                  alt={currentPlayer}
                  className="absolute inset-[4px] w-[calc(100%-8px)] h-[calc(100%-8px)] object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>{currentPlayerLabel}</span>
              )}
            </button>
            {currentPlayerCardProps.isRenameable && (currentPlayer === '1-2' || currentPlayer === '3-4') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentPlayer === '1-2' || currentPlayer === '3-4') {
                    handleRename(currentPlayer);
                  }
                }}
                className="absolute -top-2 -right-2 w-8 h-8 sm:w-9 sm:h-9 bg-mage-gold text-mage-darker rounded-full flex items-center justify-center text-sm sm:text-base font-bold hover:bg-mage-gold/90 transition-colors shadow-lg"
                aria-label="Rename player"
              >
                ✎
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={advanceTurn}
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 border-4 border-dashed border-mage-gold/50 rounded-lg flex items-center justify-center hover:border-mage-gold transition-colors text-chalk text-xl sm:text-2xl font-semibold"
            aria-label="Start game"
          >
            Start
          </button>
        )}
      </div>
      
      {/* Card sequence below */}
      <div className="mt-4 sm:mt-6 md:mt-8">
        <CardSequence />
      </div>

      {/* Rename Modal */}
      {renameModal && (
        <RenameModal
          currentName={renameModal.currentName}
          onSave={(newName) => handleSaveRename(renameModal.playerType, newName)}
          onClose={() => setRenameModal(null)}
          prefix={renameModal.playerType === '1-2' ? '1-' : '3-'}
        />
      )}
    </div>
  );
}

