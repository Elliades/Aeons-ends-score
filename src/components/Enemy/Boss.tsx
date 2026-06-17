import { useGameStore } from '@/store/gameStore';
import { NumberInput } from '../common/NumberInput';

export function Boss() {
  const boss = useGameStore((state) => state.enemy.boss);
  const updateBoss = useGameStore((state) => state.updateBoss);

  const handleIncrement = () => {
    updateBoss(boss + 1);
  };

  const handleDecrement = () => {
    updateBoss(Math.max(0, boss - 1));
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl font-bold text-mage-red">BOSS</div>
      <NumberInput
        value={boss}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        ariaLabel="boss"
        showLabel={false}
      />
    </div>
  );
}

