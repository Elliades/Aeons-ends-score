interface NumberInputProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label?: string;
  ariaLabel?: string;
  showLabel?: boolean;
}

export function NumberInput({
  value,
  onIncrement,
  onDecrement,
  label,
  ariaLabel,
  showLabel = true,
}: NumberInputProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {showLabel && label && <span className="text-lg font-semibold">{label}</span>}
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          className="w-8 h-8 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk font-bold text-lg transition-colors"
          aria-label={ariaLabel ? `${ariaLabel} decrement` : 'Decrement'}
        >
          −
        </button>
        <span className="text-2xl font-bold min-w-[60px] text-center">
          {value}
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk font-bold text-lg transition-colors"
          aria-label={ariaLabel ? `${ariaLabel} increment` : 'Increment'}
        >
          +
        </button>
      </div>
    </div>
  );
}

