import { useState, useRef } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { useDrag } from '@/hooks/useDrag';
import { QuickSelectOverlay } from './QuickSelectOverlay';

interface NumberInputProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdate?: (newValue: number) => void;
  label?: string;
  ariaLabel?: string;
  showLabel?: boolean;
  size?: '2xl' | '3xl' | '4xl' | '5xl';
  color?: string;
}

export function NumberInput({
  value,
  onIncrement,
  onDecrement,
  onUpdate,
  label,
  ariaLabel,
  showLabel = true,
  size = '2xl',
  color = '#ff2200',
}: NumberInputProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOptions, setOverlayOptions] = useState<number[]>([]);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });
  const [overlayType, setOverlayType] = useState<'value' | 'increment' | 'decrement'>('value');
  const valueRef = useRef<HTMLSpanElement>(null);
  const incrementRef = useRef<HTMLButtonElement>(null);
  const decrementRef = useRef<HTMLButtonElement>(null);

  const handleValueLongPress = (event: MouseEvent | TouchEvent) => {
    if (!onUpdate) return;
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY;
    
    // Show options to set value: -10, -5, +5, +10 relative to current (absolute values)
    const options = [-10, -5, 5, 10]
      .map(offset => value + offset)
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
    if (overlayType === 'value' && onUpdate) {
      // Set absolute value
      onUpdate(selectedValue);
    } else if (overlayType === 'increment') {
      // Add the offset
      if (onUpdate) {
        onUpdate(value + selectedValue);
      } else {
        // Fallback to multiple increments
        for (let i = 0; i < selectedValue; i++) {
          onIncrement();
        }
      }
    } else if (overlayType === 'decrement') {
      // Subtract the offset
      const newValue = Math.max(0, value + selectedValue); // selectedValue is negative
      if (onUpdate) {
        onUpdate(newValue);
      } else {
        // Fallback to multiple decrements
        for (let i = 0; i < Math.abs(selectedValue); i++) {
          onDecrement();
        }
      }
    }
    setShowOverlay(false);
  };

  const valueLongPress = useLongPress({
    onLongPress: handleValueLongPress,
    onClick: undefined, // Don't trigger onClick on value
  });

  const incrementLongPress = useLongPress({
    onLongPress: handleIncrementLongPress,
    onClick: onIncrement,
  });

  const decrementLongPress = useLongPress({
    onLongPress: handleDecrementLongPress,
    onClick: onDecrement,
  });

  const {
    isDragging,
    dragValue,
    dragHandlers: valueDragHandlers,
  } = useDrag({
    onDrag: () => {
      // Update displayed value while dragging
    },
    onDragEnd: (finalValue) => {
      if (onUpdate) {
        onUpdate(finalValue);
      }
    },
    initialValue: value,
    minValue: 0,
    sensitivity: 5, // 5 pixels per unit change
  });

  return (
    <>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {showLabel && label && <span className="text-base sm:text-lg font-semibold">{label}</span>}
        <div className="flex items-center gap-2">
          <button
            ref={decrementRef}
            {...decrementLongPress}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk font-bold text-lg sm:text-xl transition-colors flex items-center justify-center"
            aria-label={ariaLabel ? `${ariaLabel} decrement` : 'Decrement'}
          >
            −
          </button>
          <span
            ref={valueRef}
            {...valueLongPress}
            {...valueDragHandlers}
            className={`${
              size === '2xl' ? 'text-xl sm:text-2xl md:text-3xl' :
              size === '3xl' ? 'text-2xl sm:text-3xl md:text-4xl' :
              size === '4xl' ? 'text-3xl sm:text-4xl md:text-5xl' :
              'text-4xl sm:text-5xl md:text-6xl'
            } font-bold min-w-[60px] sm:min-w-[80px] md:min-w-[100px] text-center cursor-grab active:cursor-grabbing select-none ${
              isDragging ? 'opacity-80' : ''
            }`}
            style={{ color }}
            aria-label={ariaLabel ? `${ariaLabel} value` : 'Value'}
          >
            {isDragging ? dragValue : value}
          </span>
          <button
            ref={incrementRef}
            {...incrementLongPress}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-mage-purple-dark hover:bg-mage-gold/20 border border-mage-gold/40 text-chalk font-bold text-lg sm:text-xl transition-colors flex items-center justify-center"
            aria-label={ariaLabel ? `${ariaLabel} increment` : 'Increment'}
          >
            +
          </button>
        </div>
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
              : valueRef.current
          }
          hidePlusSign={overlayType === 'value'}
        />
      )}
    </>
  );
}

