import { create } from 'zustand';
import type { GameState, Power, Minion } from './types';
import { saveToHistory, canUndo, canRedo, getUndoState, getRedoState } from './undoRedo';

interface GameStore extends GameState {
  // History for undo/redo
  history: GameState[];
  historyIndex: number;
  maxHistorySize: number;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Helper to save state
  saveState: () => void;

  // Enemy actions
  updateBoss: (value: number) => void;
  addPower: () => void;
  updatePowerTimer: (powerId: string, timer: number) => void;
  incrementPowerTimer: (powerId: string) => void;
  decrementPowerTimer: (powerId: string) => void;
  removePower: (powerId: string) => void;
  addMinion: () => void;
  updateMinionLife: (minionId: string, life: number) => void;
  incrementMinionLife: (minionId: string) => void;
  decrementMinionLife: (minionId: string) => void;
  removeMinion: (minionId: string) => void;

  // Helper to get current state (for testing)
  getState: () => GameStore;
}

const initialState: GameState = {
  enemy: {
    boss: 0,
    powers: [],
    minions: [],
  },
  turn: {
    currentTurn: 1,
    currentPlayer: null,
    cardSequence: [],
    drawPile: [],
    playedCards: [],
    playerCount: 2,
  },
  stronghold: {
    players: [],
    strongholdLife: 0,
  },
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  history: [{ ...initialState }],
  historyIndex: 0,
  maxHistorySize: 50,

  saveState: () => {
    const state = get();
    const currentGameState: GameState = {
      enemy: state.enemy,
      turn: state.turn,
      stronghold: state.stronghold,
    };
    const newHistory = saveToHistory(currentGameState, {
      history: state.history,
      historyIndex: state.historyIndex,
      maxHistorySize: state.maxHistorySize,
    });
    set({
      history: newHistory.history,
      historyIndex: newHistory.historyIndex,
    });
  },

  undo: () => {
    const state = get();
    const undoState = getUndoState({
      history: state.history,
      historyIndex: state.historyIndex,
      maxHistorySize: state.maxHistorySize,
    });
    if (undoState) {
      set({
        ...undoState,
        historyIndex: state.historyIndex - 1,
      });
    }
  },

  redo: () => {
    const state = get();
    const redoState = getRedoState({
      history: state.history,
      historyIndex: state.historyIndex,
      maxHistorySize: state.maxHistorySize,
    });
    if (redoState) {
      set({
        ...redoState,
        historyIndex: state.historyIndex + 1,
      });
    }
  },

  canUndo: () => {
    const state = get();
    return canUndo({
      history: state.history,
      historyIndex: state.historyIndex,
      maxHistorySize: state.maxHistorySize,
    });
  },

  canRedo: () => {
    const state = get();
    return canRedo({
      history: state.history,
      historyIndex: state.historyIndex,
      maxHistorySize: state.maxHistorySize,
    });
  },

  updateBoss: (value: number) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          boss: value,
        },
      };
      
      // Save to history
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  addPower: () => {
    set((state) => {
      const existingPowers = state.enemy.powers;
      const nextLetter = String.fromCharCode(65 + existingPowers.length); // A, B, C...
      const newPower: Power = {
        id: crypto.randomUUID(),
        name: `p${nextLetter}`,
        timer: 0,
      };
      
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: [...state.enemy.powers, newPower],
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  updatePowerTimer: (powerId: string, timer: number) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: state.enemy.powers.map((power) =>
            power.id === powerId ? { ...power, timer } : power
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  incrementPowerTimer: (powerId: string) => {
    set((state) => {
      const power = state.enemy.powers.find((p) => p.id === powerId);
      if (!power) return state;
      
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: state.enemy.powers.map((p) =>
            p.id === powerId ? { ...p, timer: p.timer + 1 } : p
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  decrementPowerTimer: (powerId: string) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: state.enemy.powers.map((p) =>
            p.id === powerId ? { ...p, timer: Math.max(0, p.timer - 1) } : p
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  removePower: (powerId: string) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: state.enemy.powers.filter((p) => p.id !== powerId),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  addMinion: () => {
    set((state) => {
      const existingMinions = state.enemy.minions;
      const nextLetter = String.fromCharCode(65 + existingMinions.length); // A, B, C...
      const newMinion: Minion = {
        id: crypto.randomUUID(),
        name: nextLetter,
        life: 0,
        isDead: false,
      };
      
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          minions: [...state.enemy.minions, newMinion],
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  updateMinionLife: (minionId: string, life: number) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          minions: state.enemy.minions.map((minion) =>
            minion.id === minionId
              ? { ...minion, life, isDead: life <= 0 }
              : minion
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  incrementMinionLife: (minionId: string) => {
    set((state) => {
      const minion = state.enemy.minions.find((m) => m.id === minionId);
      if (!minion) return state;
      
      const newLife = minion.life + 1;
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          minions: state.enemy.minions.map((m) =>
            m.id === minionId
              ? { ...m, life: newLife, isDead: false }
              : m
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  decrementMinionLife: (minionId: string) => {
    set((state) => {
      const minion = state.enemy.minions.find((m) => m.id === minionId);
      if (!minion) return state;
      
      const newLife = Math.max(0, minion.life - 1);
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          minions: state.enemy.minions.map((m) =>
            m.id === minionId
              ? { ...m, life: newLife, isDead: newLife <= 0 }
              : m
          ),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  removeMinion: (minionId: string) => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          minions: state.enemy.minions.filter((m) => m.id !== minionId),
        },
      };
      
      const currentGameState: GameState = {
        enemy: newState.enemy,
        turn: newState.turn,
        stronghold: newState.stronghold,
      };
      const newHistory = saveToHistory(currentGameState, {
        history: state.history,
        historyIndex: state.historyIndex,
        maxHistorySize: state.maxHistorySize,
      });
      
      return {
        ...newState,
        history: newHistory.history,
        historyIndex: newHistory.historyIndex,
      };
    });
  },

  getState: () => get(),
}));

