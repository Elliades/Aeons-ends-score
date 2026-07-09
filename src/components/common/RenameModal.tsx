import { useState, useEffect, useRef } from 'react';

interface RenameModalProps {
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
  prefix: string; // The number prefix that must be preserved (e.g., "1-" or "3-")
}

export function RenameModal({ currentName, onSave, onClose, prefix }: RenameModalProps) {
  const [inputValue, setInputValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when modal opens
    inputRef.current?.focus();
    // Select the text after the prefix
    const timeout = setTimeout(() => {
      if (inputRef.current) {
        const prefixLength = prefix.length;
        inputRef.current.setSelectionRange(prefixLength, inputValue.length);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [prefix, inputValue.length]);

  const handleSave = () => {
    let finalValue = inputValue.trim();
    
    // Ensure it starts with the prefix
    if (!finalValue.startsWith(prefix)) {
      finalValue = `${prefix}${finalValue}`;
    }
    
    onSave(finalValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-mage-purple-dark border-2 border-mage-gold rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-chalk text-xl font-bold mb-4">Rename Player</h3>
        
        <div className="mb-4">
          <label className="block text-chalk text-sm mb-2">
            Name (must start with {prefix})
          </label>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 bg-mage-purple-darker border-2 border-mage-gold/60 rounded text-chalk text-lg focus:outline-none focus:border-mage-gold"
            placeholder={`${prefix}...`}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-mage-purple-darker border-2 border-mage-gold/60 rounded text-chalk font-semibold hover:bg-mage-purple-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-mage-gold text-mage-darker font-bold rounded hover:bg-mage-gold/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}



