import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('Powers store actions', () => {
  beforeEach(() => {
    // Reset store
    const initialState = {
      enemy: { boss: 0, powers: [], minions: [] },
      turn: {
        currentTurn: 1,
        currentPlayer: null,
        cardSequence: [],
        drawPile: [],
        playedCards: [],
        playerCount: 2,
      },
      stronghold: { players: [], strongholdLife: 0 },
      history: [
        {
          enemy: { boss: 0, powers: [], minions: [] },
          turn: {
            currentTurn: 1,
            currentPlayer: null,
            cardSequence: [],
            drawPile: [],
            playedCards: [],
            playerCount: 2,
          },
          stronghold: { players: [], strongholdLife: 0 },
        },
      ],
      historyIndex: 0,
      maxHistorySize: 50,
    };
    useGameStore.setState(initialState as any);
  });

  it('should add a new power with default name', () => {
    const { addPower } = useGameStore.getState();
    
    addPower();
    
    const state = useGameStore.getState();
    expect(state.enemy.powers).toHaveLength(1);
    expect(state.enemy.powers[0].name).toBe('pA');
    expect(state.enemy.powers[0].timer).toBe(0);
  });

  it('should name powers sequentially (pA, pB, pC...)', () => {
    const { addPower } = useGameStore.getState();
    
    addPower();
    addPower();
    addPower();
    
    const state = useGameStore.getState();
    expect(state.enemy.powers).toHaveLength(3);
    expect(state.enemy.powers[0].name).toBe('pA');
    expect(state.enemy.powers[1].name).toBe('pB');
    expect(state.enemy.powers[2].name).toBe('pC');
  });

  it('should update power timer', () => {
    const { addPower, updatePowerTimer } = useGameStore.getState();
    
    addPower();
    const powerId = useGameStore.getState().enemy.powers[0].id;
    updatePowerTimer(powerId, 5);
    
    const state = useGameStore.getState();
    expect(state.enemy.powers[0].timer).toBe(5);
  });

  it('should increment power timer', () => {
    const { addPower, incrementPowerTimer } = useGameStore.getState();
    
    addPower();
    const powerId = useGameStore.getState().enemy.powers[0].id;
    incrementPowerTimer(powerId);
    
    const state = useGameStore.getState();
    expect(state.enemy.powers[0].timer).toBe(1);
  });

  it('should decrement power timer', () => {
    const { addPower, updatePowerTimer, decrementPowerTimer } = useGameStore.getState();
    
    addPower();
    const powerId = useGameStore.getState().enemy.powers[0].id;
    updatePowerTimer(powerId, 5);
    decrementPowerTimer(powerId);
    
    const state = useGameStore.getState();
    expect(state.enemy.powers[0].timer).toBe(4);
  });

  it('should remove a power', () => {
    const { addPower, removePower } = useGameStore.getState();
    
    addPower();
    addPower();
    const powerId = useGameStore.getState().enemy.powers[0].id;
    
    removePower(powerId);
    
    const state = useGameStore.getState();
    expect(state.enemy.powers).toHaveLength(1);
  });
});

