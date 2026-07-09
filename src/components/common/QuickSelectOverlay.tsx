import { useEffect, useRef, useState } from 'react';

interface QuickSelectOverlayProps {
  options: number[];
  onSelect: (value: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
  anchorElement?: HTMLElement | null;
  hidePlusSign?: boolean; // Hide + sign for value selections (life points)
}

export function QuickSelectOverlay({
  options,
  onSelect,
  onClose,
  position,
  anchorElement,
  hidePlusSign = false,
}: QuickSelectOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);

  useEffect(() => {
    // Trigger fade-in animation
    setIsVisible(true);

    // Calculate position relative to anchor element if provided
    if (anchorElement) {
      const rect = anchorElement.getBoundingClientRect();
      const overlayWidth = 240; // Approximate width (4 × min-w-[44px] + gaps + padding)
      const overlayHeight = 60; // Approximate height per row
      
      // Position below the element, centered
      const x = rect.left + rect.width / 2 - overlayWidth / 2;
      const y = rect.bottom + 10;
      
      // Adjust if it would go off screen
      const adjustedX = Math.max(10, Math.min(x, window.innerWidth - overlayWidth - 10));
      const adjustedY = y + overlayHeight > window.innerHeight 
        ? rect.top - overlayHeight - 10 
        : y;
      
      setCalculatedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [anchorElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add listeners after a small delay to avoid immediate closure
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  if (options.length === 0) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed z-50 transition-all duration-200 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        left: `${calculatedPosition.x}px`,
        top: `${calculatedPosition.y}px`,
      }}
    >
      <div className="bg-mage-purple-dark/95 backdrop-blur-sm border-2 border-mage-gold/60 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(option)}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleSelect(option);
            }}
            className="min-w-[44px] h-12 px-4 rounded bg-mage-gold/20 hover:bg-mage-gold/40 border border-mage-gold/60 text-chalk font-bold text-lg transition-all active:scale-95"
            aria-label={`Select ${option}`}
          >
            {option > 0 && !hidePlusSign ? `+${option}` : option}
          </button>
        ))}
      </div>
    </div>
  );
}

