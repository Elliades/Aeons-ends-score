import { useGameStore } from '@/store/gameStore';
import { MinionCard } from './MinionCard';
import { AddButton } from '../common/AddButton';

export function Minions() {
  const minions = useGameStore((state) => state.enemy.minions);
  const addMinion = useGameStore((state) => state.addMinion);

  const MAX_MINIONS = 6;
  // Filter out dead minions for counting and display, and sort alphabetically
  const aliveMinions = minions
    .filter((m) => !m.isDead)
    .sort((a, b) => a.name.localeCompare(b.name));
  const isMaxReached = aliveMinions.length >= MAX_MINIONS;

  // Group minions into rows of 3, with only ONE placeholder at the end
  type MinionOrNull = (typeof minions)[number] | null;
  const items: MinionOrNull[] = [...aliveMinions];
  
  // Add only ONE placeholder at the end if not max reached (including when array is empty)
  if (!isMaxReached) {
    items.push(null);
  }
  
  // Group into rows of 3
  const rows: MinionOrNull[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2 sm:gap-4">
          {row.map((minion, colIndex) => 
            minion ? (
              <MinionCard key={minion.id} minion={minion} index={rowIndex * 3 + colIndex} totalCount={aliveMinions.length} />
            ) : (
              <AddButton key={`add-${rowIndex}-${colIndex}`} onClick={addMinion} ariaLabel="Add minion" />
            )
          )}
        </div>
      ))}
    </div>
  );
}
