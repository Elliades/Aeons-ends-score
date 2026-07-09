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

  const handleUpdate = (newValue: number) => {
    updateBoss(newValue);
  };

  return (
    <div className="flex items-center justify-center mb-4">
      <NumberInput
        value={boss}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onUpdate={handleUpdate}
        ariaLabel="boss"
        showLabel={false}
        size="5xl"
        color="white"
      />
    </div>
  );
}

