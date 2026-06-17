import type { Power } from '@/store/types';
import { useGameStore } from '@/store/gameStore';

interface PowerCardProps {
  power: Power;
}

export function PowerCard({ power }: PowerCardProps) {
  const incrementPowerTimer = useGameStore((state) => state.incrementPowerTimer);
  const decrementPowerTimer = useGameStore((state) => state.decrementPowerTimer);

  const handleIncrement = () => {
    incrementPowerTimer(power.id);
  };

  const handleDecrement = () => {
    decrementPowerTimer(power.id);
  };

  const isTimerZero = power.timer === 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-20 h-20 border-2 rounded-lg flex flex-col items-center justify-center transition-colors ${
          isTimerZero
            ? 'border-yellow-400 bg-yellow-400/20 animate-pulse-slow'
            : 'border-chalk'
        }`}
      >
        <div className="text-sm font-semibold text-chalk">{power.name}</div>
        <div
          className={`text-2xl font-bold ${
            isTimerZero ? 'text-yellow-400' : 'text-blue-400'
          }`}
        >
          {power.timer}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDecrement}
          className="w-6 h-6 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk text-sm font-bold transition-colors"
          aria-label={`power ${power.name} decrement`}
        >
          −
        </button>
        <button
          onClick={handleIncrement}
          className="w-6 h-6 rounded bg-mage-dark hover:bg-mage-purple/20 border border-mage-purple/30 text-chalk text-sm font-bold transition-colors"
          aria-label={`power ${power.name} increment`}
        >
          +
        </button>
      </div>
    </div>
  );
}

