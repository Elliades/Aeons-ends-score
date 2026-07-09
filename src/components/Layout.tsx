import { useState, useEffect } from 'react';
import { Boss } from './Enemy/Boss';
import { Powers } from './Enemy/Powers';
import { Minions } from './Enemy/Minions';
import { TurnSection } from './Turn/TurnSection';
import { Players } from './Stronghold/Players';
import { useGameStore } from '@/store/gameStore';
import { NumberInput } from './common/NumberInput';
import { ConnectionStatus } from './common/ConnectionStatus';

export function Layout() {
  const strongholdLife = useGameStore((state) => state.stronghold.strongholdLife);
  const updateStrongholdLife = useGameStore((state) => state.updateStrongholdLife);
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    let aspectRatio: number | null = null;

    const calculateContainerSize = () => {
      if (!aspectRatio) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let containerWidth = viewportWidth;
      let containerHeight = containerWidth / aspectRatio;

      if (containerHeight > viewportHeight) {
        containerHeight = viewportHeight;
        containerWidth = containerHeight * aspectRatio;
      }

      setContainerStyle({
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        maxWidth: '100%',
        maxHeight: '100vh',
      });
    };

    const img = new Image();
    img.src = '/background/background.png';
    img.onload = () => {
      aspectRatio = img.naturalWidth / img.naturalHeight;
      calculateContainerSize();
    };

    window.addEventListener('resize', calculateContainerSize);
    return () => window.removeEventListener('resize', calculateContainerSize);
  }, []);

  const handleIncrement = () => {
    updateStrongholdLife(strongholdLife + 1);
  };

  const handleDecrement = () => {
    updateStrongholdLife(Math.max(0, strongholdLife - 1));
  };

  const handleUpdate = (newValue: number) => {
    updateStrongholdLife(newValue);
  };

  const strongholdInput = (
    <NumberInput
      value={strongholdLife}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onUpdate={handleUpdate}
      ariaLabel="stronghold life"
      showLabel={false}
      size="5xl"
      color="white"
    />
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-chalk relative bg-mage-darker">
      <ConnectionStatus />

      {/* ── MOBILE LAYOUT (< md): normal document flow, scrollable ── */}
      <div className="md:hidden w-full flex flex-col gap-6 p-4 pt-14">
        {/* Enemy section: Boss centred, Powers left / Minions right */}
        <section className="w-full flex flex-col gap-4">
          <div className="flex justify-center">
            <Boss />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-center">
              <Powers />
            </div>
            <div className="flex justify-center">
              <Minions />
            </div>
          </div>
        </section>

        {/* Turn section */}
        <section className="w-full">
          <TurnSection />
        </section>

        {/* Stronghold + Players */}
        <section className="w-full flex flex-col gap-4 pb-6">
          <div className="flex justify-center">
            {strongholdInput}
          </div>
          <Players />
        </section>
      </div>

      {/* ── DESKTOP LAYOUT (md+): background-image board with absolute zones ── */}
      <div className="hidden md:flex items-center justify-center min-h-screen">
        <div
          className="relative"
          style={{
            backgroundImage: 'url(/background/background.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            ...containerStyle,
          }}
        >
          {/* Overlay for better readability */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* Content positioned relative to background image */}
          <div className="relative z-10 w-full h-full">
            {/* TOP SECTION: Boss, Powers (left), Minions (right) */}
            <section
              className="absolute top-0 left-0 right-0"
              style={{ height: '30%', paddingTop: '0.5%', paddingLeft: '2%', paddingRight: '2%' }}
            >
              <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '6%' }}>
                <Boss />
              </div>

              <div
                className="grid grid-cols-2 gap-4 lg:gap-6 w-full h-full"
                style={{ marginTop: '6%' }}
              >
                <div className="w-full flex items-start justify-start pl-2 pt-2">
                  <Powers />
                </div>
                <div className="w-full flex items-start justify-end pr-2 pt-2">
                  <Minions />
                </div>
              </div>
            </section>

            {/* MIDDLE SECTION: Turn */}
            <section
              className="absolute top-[25%] left-0 right-0 flex items-center justify-center"
              style={{ height: '40%', paddingLeft: '2%', paddingRight: '2%' }}
            >
              <div className="w-full max-w-4xl lg:max-w-5xl mx-auto">
                <TurnSection />
              </div>
            </section>

            {/* BOTTOM SECTION: Stronghold + Players */}
            <section
              className="absolute left-0 right-0 overflow-visible"
              style={{ bottom: '6%', height: '30%', paddingBottom: '1%', paddingLeft: '2%', paddingRight: '2%' }}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  {strongholdInput}
                </div>
                <div>
                  <Players />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
