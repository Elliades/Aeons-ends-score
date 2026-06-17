import { describe, it, expect } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('gameStore', () => {
  it('should initialize with default state', () => {
    const state = useGameStore.getState();
    
    expect(state.enemy.boss).toBe(0);
    expect(state.enemy.powers).toEqual([]);
    expect(state.enemy.minions).toEqual([]);
    expect(state.turn.currentTurn).toBe(1);
    expect(state.turn.currentPlayer).toBeNull();
    expect(state.stronghold.players).toEqual([]);
    expect(state.stronghold.strongholdLife).toBe(0);
    expect(state.history).toHaveLength(1);
    expect(state.historyIndex).toBe(0);
  });
});

