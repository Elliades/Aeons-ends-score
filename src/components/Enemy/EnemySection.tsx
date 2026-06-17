import { Boss } from './Boss';
import { Powers } from './Powers';
import { Minions } from './Minions';

export function EnemySection() {
  return (
    <div className="card">
      <div className="space-y-4">
        <Boss />
        
        {/* Powers and Minions side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Powers Section - Left */}
          <div>
            <div className="text-xl font-semibold text-chalk mb-2">Power</div>
            <Powers />
          </div>
          
          {/* Minions Section - Right */}
          <div className="border-l border-dashed border-mage-purple/30 pl-4">
            <div className="text-xl font-semibold text-chalk mb-2">MINIONS</div>
            <Minions />
          </div>
        </div>
      </div>
    </div>
  );
}

