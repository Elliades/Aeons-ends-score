import { useGameStore } from '@/store/gameStore';
import { PowerCard } from './PowerCard';
import { AddButton } from '../common/AddButton';

export function Powers() {
  const powers = useGameStore((state) => state.enemy.powers);
  const addPower = useGameStore((state) => state.addPower);

  return (
    <div className="flex flex-wrap gap-4">
      {powers.map((power) => (
        <PowerCard key={power.id} power={power} />
      ))}
      <AddButton onClick={addPower} ariaLabel="Add power" />
    </div>
  );
}
