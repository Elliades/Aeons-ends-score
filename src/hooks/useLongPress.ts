import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (event: MouseEvent | TouchEvent) => void;
  onClick?: (event: MouseEvent | TouchEvent) => void;
  delay?: number;
  threshold?: number; // Distance threshold to cancel long press
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const hasHandledRef = useRef(false);
  const isTouchRef = useRef(false);

  const start = useCallback(
    (event: MouseEvent | TouchEvent) => {
      longPressTriggeredRef.current = false;
      hasHandledRef.current = false;
      targetRef.current = event.target;
      isTouchRef.current = 'touches' in event;
      
      // Get initial position
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      startPosRef.current = { x: clientX, y: clientY };

      timeoutRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!startPosRef.current) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const distance = Math.sqrt(
        Math.pow(clientX - startPosRef.current.x, 2) +
        Math.pow(clientY - startPosRef.current.y, 2)
      );

      if (distance > threshold) {
        clear();
      }
    },
    [threshold, clear]
  );

  const handleEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const isTouchEvent = 'touches' in event || 'changedTouches' in event;
      
      // Prevent double handling: if touch event was handled, ignore subsequent mouse event
      if (!isTouchEvent && isTouchRef.current) {
        return;
      }
      
      // Prevent double handling: if already handled, ignore
      if (hasHandledRef.current) {
        return;
      }
      
      clear();
      
      if (!longPressTriggeredRef.current && onClick) {
        hasHandledRef.current = true;
        onClick(event);
      }
      
      longPressTriggeredRef.current = false;
      startPosRef.current = null;
      
      // Reset after a short delay to allow mouse events to be blocked
      setTimeout(() => {
        hasHandledRef.current = false;
        isTouchRef.current = false;
      }, 300);
    },
    [onClick, clear]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => {
      // On touch devices, mouse events fire after touch events - ignore them
      if (isTouchRef.current) {
        return;
      }
      start(e.nativeEvent);
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent mouse events from firing
      start(e.nativeEvent);
    },
    onMouseUp: (e: React.MouseEvent) => {
      // On touch devices, mouse events fire after touch events - ignore them
      if (isTouchRef.current) {
        e.preventDefault();
        return;
      }
      handleEnd(e.nativeEvent);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent click event from firing
      handleEnd(e.nativeEvent);
    },
    onMouseLeave: () => {
      clear();
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleMove(e.nativeEvent);
    },
    onMouseMove: (e: React.MouseEvent) => {
      handleMove(e.nativeEvent);
    },
  };
}

