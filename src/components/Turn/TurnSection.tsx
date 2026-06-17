import { useGameStore } from '@/store/gameStore';

export function TurnSection() {
  const currentTurn = useGameStore((state) => state.turn.currentTurn);

  return (
    <div className="w-full">
      {/* Large prominent turn number in the middle */}
      <div className="flex justify-center items-center">
        <div className="text-8xl md:text-9xl font-bold text-chalk" style={{ 
          textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
          fontFamily: 'monospace'
        }}>
          {currentTurn}
        </div>
      </div>
      
      {/* Turn sequence and player cards below */}
      <div className="mt-8 space-y-4">
        <div className="text-xl font-semibold text-chalk">TURN</div>
        {/* Turn sequence and player cards will go here */}
        <div className="text-center text-chalk-dim text-sm">Turn tracker coming soon</div>
      </div>
    </div>
  );
}

