import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { GameState } from '@/store/types';

describe('undo/redo system', () => {
  beforeEach(() => {
    // Reset store to initial state
    const state = useGameStore.getState();
    useGameStore.setState({
      ...state,
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
    });
  });

  it('should save state to history when making a change', () => {
    const { updateBoss, getState } = useGameStore.getState();
    
    // Update boss score
    updateBoss(10);
    
    const state = getState();
    expect(state.enemy.boss).toBe(10);
    expect(state.history.length).toBeGreaterThan(1);
    expect(state.historyIndex).toBeGreaterThan(0);
  });

  it('should undo to previous state', () => {
    const { updateBoss, undo, getState } = useGameStore.getState();
    
    updateBoss(10);
    const stateBeforeUndo = getState();
    expect(stateBeforeUndo.enemy.boss).toBe(10);
    
    undo();
    const stateAfterUndo = getState();
    expect(stateAfterUndo.enemy.boss).toBe(0);
    expect(stateAfterUndo.historyIndex).toBe(0);
  });

  it('should redo to next state after undo', () => {
    const { updateBoss, undo, redo, getState } = useGameStore.getState();
    
    updateBoss(10);
    undo();
    
    const stateBeforeRedo = getState();
    expect(stateBeforeRedo.enemy.boss).toBe(0);
    
    redo();
    const stateAfterRedo = getState();
    expect(stateAfterRedo.enemy.boss).toBe(10);
  });

  it('should limit history size', () => {
    const { updateBoss, getState } = useGameStore.getState();
    const maxHistorySize = getState().maxHistorySize;
    
    // Make more changes than max history size
    for (let i = 1; i <= maxHistorySize + 10; i++) {
      updateBoss(i);
    }
    
    const state = getState();
    expect(state.history.length).toBeLessThanOrEqual(maxHistorySize);
  });

  it('should clear future history when making new change after undo', () => {
    const { updateBoss, undo, getState } = useGameStore.getState();
    
    updateBoss(10);
    updateBoss(20);
    undo(); // Go back to state with boss = 10
    updateBoss(30); // Make new change
    
    const state = getState();
    expect(state.enemy.boss).toBe(30);
    // Should not be able to redo to 20
    expect(state.historyIndex).toBe(state.history.length - 1);
  });
});

