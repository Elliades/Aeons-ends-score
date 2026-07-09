import { useState, useRef } from 'react';
import type { Player } from '@/store/types';
import { useGameStore } from '@/store/gameStore';
import { useLongPress } from '@/hooks/useLongPress';
import { useDrag } from '@/hooks/useDrag';
import { QuickSelectOverlay } from '@/components/common/QuickSelectOverlay';

interface PlayerCardProps {
  player: Player;
  playerIndex: number;
}

export function PlayerCard({ player, playerIndex }: PlayerCardProps) {
  const MAX_CHARGES = 6;
  const isMaxChargesReached = player.chargeStacks.length >= MAX_CHARGES;
  
  // Player border colors matching turn cards: P1=yellow, P2=blue, P3=green, P4=white
  const playerBorderColors = [
    'border-yellow-500/60',  // Player 1 - Yellow border
    'border-blue-500/60',    // Player 2 - Blue border
    'border-green-500/60',   // Player 3 - Green border
    'border-white/60',       // Player 4 - White border
    'border-purple-500/40',  // Player 5+ - Fallback borders
    'border-cyan-500/40',
    'border-teal-500/40',
    'border-indigo-500/40',
    'border-emerald-500/40',
    'border-violet-500/40',
  ];
  
  const colorIndex = playerIndex % 10;
  const playerBorderColor = playerBorderColors[colorIndex];
  
  // Get background image for each player
  // Each player has their own individual background image
  const getBackgroundImage = (index: number): string => {
    const playerPos = index % 4;
    const playerNumber = playerPos + 1; // P1, P2, P3, P4
    return `url(/background/p${playerNumber}.png)`;
  };
  
  const backgroundImage = getBackgroundImage(playerIndex);
  const incrementPlayerLife = useGameStore((state) => state.incrementPlayerLife);
  const decrementPlayerLife = useGameStore((state) => state.decrementPlayerLife);
  const updatePlayerLife = useGameStore((state) => state.updatePlayerLife);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const addChargeSlot = useGameStore((state) => state.addChargeSlot);
  const removeChargeSlot = useGameStore((state) => state.removeChargeSlot);
  const toggleChargeSlot = useGameStore((state) => state.toggleChargeSlot);
  const useCapacity = useGameStore((state) => state.useCapacity);
  const [isAnimating, setIsAnimating] = useState(false);
  const [emptyingSlots, setEmptyingSlots] = useState<Set<number>>(new Set());
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOptions, setOverlayOptions] = useState<number[]>([]);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [overlayType, setOverlayType] = useState<'value' | 'increment' | 'decrement'>('value');
  const lifeInputRef = useRef<HTMLInputElement>(null);
  const incrementLifeRef = useRef<HTMLButtonElement>(null);
  const decrementLifeRef = useRef<HTMLButtonElement>(null);

  const isDead = player.life === 0;
  const allChargesFilled = player.chargeStacks.length > 0 && player.chargeStacks.every((filled) => filled);

  const handleIncrementLife = () => {
    incrementPlayerLife(player.id);
  };

  const handleDecrementLife = () => {
    decrementPlayerLife(player.id);
  };

  const handleLifeChange = (value: number) => {
    updatePlayerLife(player.id, value);
  };

  const handleRemovePlayer = () => {
    removePlayer(player.id);
  };

  const handleAddChargeSlot = () => {
    addChargeSlot(player.id);
  };

  const handleRemoveChargeSlot = (slotIndex: number) => {
    removeChargeSlot(player.id, slotIndex);
  };

  const handleToggleChargeSlot = (slotIndex: number) => {
    toggleChargeSlot(player.id, slotIndex);
  };

  const handleUseCapacity = () => {
    setIsAnimating(true);
    // Mark all filled slots as emptying
    const filledIndices = player.chargeStacks
      .map((filled, index) => (filled ? index : -1))
      .filter((index) => index !== -1);
    setEmptyingSlots(new Set(filledIndices));
    
    useCapacity(player.id);
    
    // Clear animation after duration
    setTimeout(() => {
      setIsAnimating(false);
      setEmptyingSlots(new Set());
    }, 500);
  };

  const handleLifeLongPress = (event: MouseEvent | TouchEvent) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    // Show options to set value: -10, -5, +5, +10 relative to current (absolute values)
    const options = [-10, -5, 5, 10]
      .map(offset => player.life + offset)
      .filter(v => v >= 0)
      .slice(0, 4); // Max 4 options
    setOverlayOptions(options);
    setOverlayType('value');
    setOverlayPosition({ x: clientX, y: clientY });
    setShowOverlay(true);
  };

  const handleIncrementLifeLongPress = (event: MouseEvent | TouchEvent) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    setOverlayOptions([2, 4, 5]);
    setOverlayType('increment');
    setOverlayPosition({ x: clientX, y: clientY });
    setShowOverlay(true);
  };

  const handleDecrementLifeLongPress = (event: MouseEvent | TouchEvent) => {
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
      handleLifeChange(selectedValue);
    } else if (overlayType === 'increment') {
      // Add the offset
      const newValue = player.life + selectedValue;
      handleLifeChange(newValue);
    } else if (overlayType === 'decrement') {
      // Subtract the offset
      const newValue = Math.max(0, player.life + selectedValue); // selectedValue is negative
      handleLifeChange(newValue);
    }
    setShowOverlay(false);
  };

  const lifeLongPress = useLongPress({
    onLongPress: handleLifeLongPress,
    onClick: undefined,
  });

  const incrementLifeLongPress = useLongPress({
    onLongPress: handleIncrementLifeLongPress,
    onClick: handleIncrementLife,
  });

  const decrementLifeLongPress = useLongPress({
    onLongPress: handleDecrementLifeLongPress,
    onClick: handleDecrementLife,
  });

  const {
    isDragging,
    dragValue,
    dragHandlers: lifeDragHandlers,
  } = useDrag({
    onDrag: (_delta, _currentValue) => {
      // Update displayed value while dragging
    },
    onDragEnd: (finalValue) => {
      handleLifeChange(finalValue);
    },
    initialValue: player.life,
    minValue: 0,
    sensitivity: 5, // 5 pixels per life point
  });


  return (
    <div 
      className={`relative flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all overflow-hidden ${
        isDead 
          ? `${playerBorderColor} opacity-50` 
          : `${playerBorderColor}`
      }`}
      style={{
        backgroundImage: backgroundImage,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        backgroundPosition: '0% 0%',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        boxShadow: 'rgba(139, 92, 246, 0.3) 0px 0px 20px, rgba(245, 158, 11, 0.1) 0px 0px 40px',
      }}
    >
      {/* Red cross button - on white border with invisible border creating gap */}
      <button
        onClick={handleRemovePlayer}
        className="absolute -top-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center z-10 border-4 border-transparent"
        aria-label={`remove ${player.name}`}
      >
        ×
      </button>

      {/* Player name - upper and bigger */}
      <div className="relative text-base sm:text-lg md:text-xl font-bold text-chalk self-start uppercase z-10">{player.name}</div>

      {/* Life points section - upper and bigger */}
      <div className="flex items-center justify-center gap-0 w-full -mt-4">
        <button
          ref={decrementLifeRef}
          {...decrementLifeLongPress}
          className="min-h-[44px] rounded bg-transparent hover:bg-mage-purple/10 text-chalk text-2xl sm:text-3xl font-bold transition-colors flex items-center justify-center -mr-0.5 px-2 sm:px-3 py-1"
          aria-label={`${player.name} decrement life`}
        >
          −
        </button>
        <input
          ref={lifeInputRef}
          {...lifeLongPress}
          {...lifeDragHandlers}
          type="number"
          value={isDragging ? dragValue : player.life}
          onChange={(e) => handleLifeChange(parseInt(e.target.value) || 0)}
          className={`text-3xl sm:text-4xl lg:text-5xl font-bold w-auto min-w-[3ch] max-w-[6ch] text-center bg-transparent px-1 cursor-grab active:cursor-grabbing ${
            isDead ? 'text-chalk/50' : ''
          } ${isDragging ? 'opacity-80' : ''}`}
          style={isDead ? undefined : { color: '#ff2200' }}
          aria-label={`${player.name} life points`}
          readOnly={isDragging}
        />
        <button
          ref={incrementLifeRef}
          {...incrementLifeLongPress}
          className="min-h-[44px] rounded bg-transparent hover:bg-mage-purple/10 text-chalk text-2xl sm:text-3xl font-bold transition-colors flex items-center justify-center -ml-0.5 px-2 sm:px-3 py-1"
          aria-label={`${player.name} increment life`}
        >
          +
        </button>
      </div>

      {/* Charge slots */}
      <div className="grid grid-cols-3 gap-2 justify-items-center items-center">
        {player.chargeStacks.map((filled, index) => {
          const isLastSlot = index === player.chargeStacks.length - 1;
          const middleIndex = Math.floor((player.chargeStacks.length - 1) / 2);
          const showCapacityInMiddle = allChargesFilled && index === middleIndex;
          
          return (
            <div key={index} className="relative">
              {showCapacityInMiddle ? (
                // Show Capacity button in the middle slot
                <button
                  onClick={handleUseCapacity}
                  disabled={isAnimating}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-mage-purple bg-mage-purple hover:bg-mage-purple/80 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center ${
                    isAnimating ? 'opacity-50' : 'capacity-button'
                  }`}
                  aria-label={`use capacity for ${player.name}`}
                >
                  Cap
                </button>
              ) : (
                // Show regular charge slot
                <button
                  onClick={() => {
                    // Ensure click works even if remove button is present
                    handleToggleChargeSlot(index);
                  }}
                  disabled={emptyingSlots.has(index)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 transition-all cursor-pointer z-0 ${
                    emptyingSlots.has(index)
                      ? 'charge-emptying'
                      : filled
                      ? 'bg-mage-gold border-mage-gold-light'
                      : 'bg-transparent border-mage-gold/50 hover:border-mage-gold'
                  }`}
                  aria-label={`${player.name} charge slot ${index + 1} ${filled ? 'filled' : 'empty'}`}
                />
              )}
              {player.chargeStacks.length > 1 && isLastSlot && !showCapacityInMiddle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRemoveChargeSlot(index);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center z-20 pointer-events-auto"
                  aria-label={`remove charge slot ${index + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {/* Add charge slot button - only show if not at max */}
        {!isMaxChargesReached && (
          <div className="flex items-center justify-center">
            <button
              onClick={handleAddChargeSlot}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-dashed border-mage-gold/50 hover:border-mage-gold transition-colors flex items-center justify-center text-mage-gold bg-mage-purple-dark/30 text-lg sm:text-xl"
              aria-label={`add charge slot to ${player.name}`}
            >
              +
            </button>
          </div>
        )}
      </div>
      {showOverlay && (
        <QuickSelectOverlay
          options={overlayOptions}
          onSelect={handleOverlaySelect}
          onClose={() => setShowOverlay(false)}
          position={overlayPosition}
          anchorElement={
            overlayType === 'increment'
              ? incrementLifeRef.current
              : overlayType === 'decrement'
              ? decrementLifeRef.current
              : lifeInputRef.current
          }
          hidePlusSign={overlayType === 'value'}
        />
      )}
    </div>
  );
}

