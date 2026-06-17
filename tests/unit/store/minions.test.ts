import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('Minions store actions', () => {
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

  it('should add a new minion with default name', () => {
    const { addMinion } = useGameStore.getState();
    
    addMinion();
    
    const state = useGameStore.getState();
    expect(state.enemy.minions).toHaveLength(1);
    expect(state.enemy.minions[0].name).toBe('A');
    expect(state.enemy.minions[0].life).toBe(0);
    expect(state.enemy.minions[0].isDead).toBe(false);
  });

  it('should name minions sequentially (A, B, C...)', () => {
    const { addMinion } = useGameStore.getState();
    
    addMinion();
    addMinion();
    addMinion();
    
    const state = useGameStore.getState();
    expect(state.enemy.minions).toHaveLength(3);
    expect(state.enemy.minions[0].name).toBe('A');
    expect(state.enemy.minions[1].name).toBe('B');
    expect(state.enemy.minions[2].name).toBe('C');
  });

  it('should update minion life', () => {
    const { addMinion, updateMinionLife } = useGameStore.getState();
    
    addMinion();
    const minionId = useGameStore.getState().enemy.minions[0].id;
    updateMinionLife(minionId, 10);
    
    const state = useGameStore.getState();
    expect(state.enemy.minions[0].life).toBe(10);
  });

  it('should increment minion life', () => {
    const { addMinion, incrementMinionLife } = useGameStore.getState();
    
    addMinion();
    const minionId = useGameStore.getState().enemy.minions[0].id;
    incrementMinionLife(minionId);
    
    const state = useGameStore.getState();
    expect(state.enemy.minions[0].life).toBe(1);
  });

  it('should decrement minion life', () => {
    const { addMinion, updateMinionLife, decrementMinionLife } = useGameStore.getState();
    
    addMinion();
    const minionId = useGameStore.getState().enemy.minions[0].id;
    updateMinionLife(minionId, 10);
    decrementMinionLife(minionId);
    
    const state = useGameStore.getState();
    expect(state.enemy.minions[0].life).toBe(9);
  });

  it('should mark minion as dead when life reaches 0', () => {
    const { addMinion, updateMinionLife, decrementMinionLife } = useGameStore.getState();
    
    addMinion();
    const minionId = useGameStore.getState().enemy.minions[0].id;
    updateMinionLife(minionId, 1);
    decrementMinionLife(minionId);
    
    const state = useGameStore.getState();
    expect(state.enemy.minions[0].life).toBe(0);
    expect(state.enemy.minions[0].isDead).toBe(true);
  });

  it('should remove a minion', () => {
    const { addMinion, removeMinion } = useGameStore.getState();
    
    addMinion();
    addMinion();
    const minionId = useGameStore.getState().enemy.minions[0].id;
    
    removeMinion(minionId);
    
    const state = useGameStore.getState();
    expect(state.enemy.minions).toHaveLength(1);
  });
});

