import { useGameStore } from '@/store/gameStore';
import { Players } from './Players';
import { NumberInput } from '@/components/common/NumberInput';
import { useState } from 'react';

export function StrongholdSection() {
  const [isExpanded, setIsExpanded] = useState(true);
  const strongholdLife = useGameStore((state) => state.stronghold.strongholdLife);
  const players = useGameStore((state) => state.stronghold.players);
  const updateStrongholdLife = useGameStore((state) => state.updateStrongholdLife);

  const handleIncrement = () => {
    updateStrongholdLife(strongholdLife + 1);
  };

  const handleDecrement = () => {
    updateStrongholdLife(Math.max(0, strongholdLife - 1));
  };

  const handleUpdate = (newValue: number) => {
    updateStrongholdLife(newValue);
  };

  return (
    <div className="panel-dark p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-bold text-mage-green">STRONGHOLD</div>
        <div className="flex items-center gap-2">
        <NumberInput
          value={strongholdLife}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
            onUpdate={handleUpdate}
          ariaLabel="stronghold life"
          showLabel={false}
        />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-mage-red hover:text-mage-red/80 transition-colors p-1 font-bold text-xl"
            aria-label={isExpanded ? 'Close section' : 'Expand section'}
          >
            {isExpanded ? '×' : '☰'}
          </button>
        </div>
      </div>
      {isExpanded && (
      <div className="mt-4">
        <div className="text-xl font-semibold text-chalk mb-4">Players</div>
        <Players />
      </div>
      )}
      {!isExpanded && players.length > 0 && (
        <div className="mt-2 text-sm text-chalk/70">
          {players.length} player{players.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

