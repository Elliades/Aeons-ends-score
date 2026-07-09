import { useGameStore } from '@/store/gameStore';
import { PlayerCard } from './PlayerCard';
import { AddButton } from '../common/AddButton';

export function Players() {
  const players = useGameStore((state) => state.stronghold.players);
  const addPlayer = useGameStore((state) => state.addPlayer);

  const MAX_PLAYERS = 4;
  const isMaxReached = players.length >= MAX_PLAYERS;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {players.map((player, index) => (
        <PlayerCard key={player.id} player={player} playerIndex={index} />
      ))}
      {!isMaxReached && (
        <div className="flex items-center justify-center">
          <AddButton onClick={addPlayer} ariaLabel="Add player" />
        </div>
      )}
    </div>
  );
}

