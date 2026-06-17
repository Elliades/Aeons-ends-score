import { EnemySection } from './Enemy/EnemySection';
import { TurnSection } from './Turn/TurnSection';
import { StrongholdSection } from './Stronghold/StrongholdSection';

export function Layout() {
  return (
    <div className="min-h-screen bg-mage-darker text-chalk p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ENEMY Section - Top */}
        <section>
          <EnemySection />
        </section>

        {/* Large Turn Number - Middle (very prominent) */}
        <section className="flex justify-center my-8">
          <TurnSection />
        </section>

        {/* STRONGHOLD Section - Bottom */}
        <section>
          <StrongholdSection />
        </section>
      </div>
    </div>
  );
}

