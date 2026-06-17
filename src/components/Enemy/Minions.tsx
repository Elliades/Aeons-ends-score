import { useGameStore } from '@/store/gameStore';
import { MinionCard } from './MinionCard';
import { AddButton } from '../common/AddButton';

export function Minions() {
  const minions = useGameStore((state) => state.enemy.minions);
  const addMinion = useGameStore((state) => state.addMinion);

  return (
    <div className="flex flex-wrap gap-4">
      {minions.map((minion) => (
        <MinionCard key={minion.id} minion={minion} />
      ))}
      <AddButton onClick={addMinion} ariaLabel="Add minion" />
    </div>
  );
}
