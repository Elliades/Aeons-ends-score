import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PowerCard } from './PowerCard';
import { useLongPress } from '@/hooks/useLongPress';
import { QuickSelectOverlay } from '@/components/common/QuickSelectOverlay';

export function Powers() {
  const powers = useGameStore((state) => state.enemy.powers);
  const addPower = useGameStore((state) => state.addPower);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [overlayAnchor, setOverlayAnchor] = useState<HTMLElement | null>(null);

  const MAX_POWERS = 6;
  const isMaxReached = powers.length >= MAX_POWERS;

  const handleAddPowerClick = () => {
    addPower(0); // Default timer of 0
  };

  const handleAddPowerLongPress = (event: MouseEvent | TouchEvent, buttonElement: HTMLElement) => {
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    // Show options to set initial timer to 1, 2, 3, or 4
    setOverlayPosition({ x: clientX, y: clientY });
    setOverlayAnchor(buttonElement);
    setShowOverlay(true);
  };

  const handleOverlaySelect = (selectedValue: number) => {
    addPower(selectedValue);
    setShowOverlay(false);
  };

  // Group powers into rows of 3, with only ONE placeholder at the end
  type PowerOrNull = (typeof powers)[number] | null;
  const items: PowerOrNull[] = [...powers];
  
  // Add only ONE placeholder at the end if not max reached
  if (!isMaxReached) {
    items.push(null);
  }
  
  // Group into rows of 3
  const rows: PowerOrNull[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
          {row.map((power, colIndex) => 
            power ? (
              <PowerCard key={power.id} power={power} index={rowIndex * 3 + colIndex} totalCount={powers.length} />
            ) : (
              <AddPowerButton
                key={`add-${rowIndex}-${colIndex}`}
                onAdd={handleAddPowerClick}
                onLongPress={handleAddPowerLongPress}
              />
            )
          )}
        </div>
      ))}
      {showOverlay && (
        <QuickSelectOverlay
          options={[1, 2, 3, 4]}
          onSelect={handleOverlaySelect}
          onClose={() => setShowOverlay(false)}
          position={overlayPosition}
          anchorElement={overlayAnchor}
          hidePlusSign={true}
        />
      )}
    </div>
  );
}

// AddPowerButton component with long-press support
interface AddPowerButtonProps {
  onAdd: () => void;
  onLongPress: (event: MouseEvent | TouchEvent, element: HTMLElement) => void;
}

function AddPowerButton({ onAdd, onLongPress }: AddPowerButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const longPress = useLongPress({
    onLongPress: (event) => {
      if (buttonRef.current) {
        onLongPress(event, buttonRef.current);
      }
    },
    onClick: onAdd,
  });

  return (
    <div className="flex items-center justify-center">
      <button
        ref={buttonRef}
        {...longPress}
        className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-mage-gold/50 rounded-lg flex items-center justify-center hover:border-mage-gold hover:bg-mage-gold/10 transition-colors bg-mage-purple-dark/30"
        aria-label="Add power"
      >
        <span className="text-xl sm:text-2xl font-bold text-mage-gold">+</span>
      </button>
    </div>
  );
}
