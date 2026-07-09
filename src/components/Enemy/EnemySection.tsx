import { Boss } from './Boss';
import { Powers } from './Powers';
import { Minions } from './Minions';
import { useGameStore } from '@/store/gameStore';

export function EnemySection() {
  const autoDecrementPowers = useGameStore((state) => state.enemy.autoDecrementPowers);
  const toggleAutoDecrementPowers = useGameStore((state) => state.toggleAutoDecrementPowers);

  return (
    <div className="panel-dark p-4">
      <div className="space-y-4">
        <Boss />
        
        {/* Powers and Minions side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Powers Section - Left */}
          <div className="panel-dark p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl font-semibold text-chalk">Powers</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-chalk/70">Auto-dec</span>
                <button
                  onClick={toggleAutoDecrementPowers}
                  className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors min-h-[44px] ${
                    autoDecrementPowers ? 'bg-mage-gold' : 'bg-mage-purple-dark border border-mage-gold/30'
                  }`}
                  aria-label="Toggle auto-decrement powers"
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white transition-transform ${
                      autoDecrementPowers ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <Powers />
          </div>
          
          {/* Minions Section - Right */}
          <div className="panel-dark p-3 border-l-0 md:border-l-2 md:border-mage-gold/30 md:pl-4">
            <div className="text-xl font-semibold text-chalk mb-2">MINIONS</div>
            <Minions />
          </div>
        </div>
      </div>
    </div>
  );
}

