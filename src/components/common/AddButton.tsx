interface AddButtonProps {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
}

export function AddButton({ onClick, label, ariaLabel }: AddButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-2 border-dashed border-mage-gold/50 rounded-lg flex items-center justify-center hover:border-mage-gold hover:bg-mage-gold/10 transition-colors bg-mage-purple-dark/30"
        aria-label={ariaLabel || 'Add'}
      >
        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-mage-gold">+</span>
      </button>
      {label && <span className="text-xs sm:text-sm text-chalk-dim">{label}</span>}
    </div>
  );
}

