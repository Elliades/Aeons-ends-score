import { useRef, useCallback, useState, useEffect } from 'react';

interface UseDragOptions {
  onDrag: (delta: number, currentValue: number) => void;
  onDragEnd: (finalValue: number) => void;
  initialValue: number;
  minValue?: number;
  maxValue?: number;
  sensitivity?: number; // Pixels per unit change
  movementThreshold?: number; // Pixels to move before drag starts
}

export function useDrag({
  onDrag,
  onDragEnd,
  initialValue,
  minValue = 0,
  maxValue = Infinity,
  sensitivity = 5, // Default: 5 pixels = 1 unit change
  movementThreshold = 3, // Default: 3 pixels movement to start drag
}: UseDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(initialValue);
  const [isActive, setIsActive] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(initialValue);
  const lastUpdateRef = useRef<number>(initialValue);
  const hasMovedRef = useRef(false);

  const handleStart = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      startXRef.current = clientX;
      startYRef.current = clientY;
      startValueRef.current = initialValue;
      lastUpdateRef.current = initialValue;
      setDragValue(initialValue);
      hasMovedRef.current = false;
      setIsDragging(false); // Will be set to true after threshold
      setIsActive(true);
    },
    [initialValue]
  );


  // Sync drag value when initial value changes (but not while dragging)
  useEffect(() => {
    if (!isActive && !isDragging) {
      setDragValue(initialValue);
      startValueRef.current = initialValue;
      lastUpdateRef.current = initialValue;
    }
  }, [initialValue, isActive, isDragging]);

  // Set up global event listeners when dragging starts
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - startXRef.current;

      // Only start dragging if moved beyond threshold (horizontal movement prioritized)
      if (!hasMovedRef.current && Math.abs(deltaX) > movementThreshold) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }

      if (!hasMovedRef.current) return;

      // Only process horizontal movement for value changes
      const deltaValue = Math.round(deltaX / sensitivity);
      const newValue = Math.max(
        minValue,
        Math.min(maxValue, startValueRef.current + deltaValue)
      );

      // Only update if value changed to avoid unnecessary re-renders
      if (newValue !== lastUpdateRef.current) {
        setDragValue(newValue);
        lastUpdateRef.current = newValue;
        onDrag(deltaValue, newValue);
      }
    };

    const handleGlobalEnd = () => {
      if (startXRef.current === null) return;

      if (hasMovedRef.current) {
        onDragEnd(dragValue);
      }
      setIsDragging(false);
      setIsActive(false);
      hasMovedRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
    };

    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchend', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isActive, sensitivity, minValue, maxValue, onDrag, onDragEnd, dragValue, movementThreshold]);

  return {
    isDragging: isDragging || hasMovedRef.current,
    dragValue,
    dragHandlers: {
      onMouseDown: (e: React.MouseEvent) => {
        if (e.preventDefault) {
          e.preventDefault();
        }
        handleStart(e.nativeEvent);
      },
      onTouchStart: (e: React.TouchEvent) => {
        handleStart(e.nativeEvent);
      },
    },
  };
}

