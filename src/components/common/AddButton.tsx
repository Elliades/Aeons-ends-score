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
        className="w-20 h-20 border-2 border-dashed border-chalk/50 rounded-lg flex items-center justify-center hover:border-chalk hover:bg-mage-purple/10 transition-colors"
        aria-label={ariaLabel || 'Add'}
      >
        <span className="text-2xl font-bold text-chalk">+</span>
      </button>
      {label && <span className="text-xs text-chalk-dim">{label}</span>}
    </div>
  );
}

