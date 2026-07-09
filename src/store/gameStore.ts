import { create } from 'zustand';
import type { GameState, Power, Minion, Player } from './types';
import { saveToHistory, canUndo, canRedo, getUndoState, getRedoState } from './undoRedo';
import { createShuffledDeck } from '@/utils/cardDeck';

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
  addPower: (initialTimer?: number) => void;
  updatePowerTimer: (powerId: string, timer: number) => void;
  incrementPowerTimer: (powerId: string) => void;
  decrementPowerTimer: (powerId: string) => void;
  removePower: (powerId: string) => void;
  toggleAutoDecrementPowers: () => void;
  addMinion: () => void;
  updateMinionLife: (minionId: string, life: number) => void;
  incrementMinionLife: (minionId: string) => void;
  decrementMinionLife: (minionId: string) => void;
  removeMinion: (minionId: string) => void;
  initializeDeck: (playerCount: number) => void;
  advanceTurn: () => void;
  updateTurnPlayerLabel: (playerType: '1-2' | '3-4', customName: string) => void;

  // Player actions
  addPlayer: () => void;
  removePlayer: (playerId: string) => void;
  updatePlayerLife: (playerId: string, life: number) => void;
  incrementPlayerLife: (playerId: string) => void;
  decrementPlayerLife: (playerId: string) => void;
  addChargeSlot: (playerId: string) => void;
  removeChargeSlot: (playerId: string, slotIndex: number) => void;
  toggleChargeSlot: (playerId: string, slotIndex: number) => void;
  useCapacity: (playerId: string) => void;
  updateStrongholdLife: (value: number) => void;

  // Helper to get current state (for testing)
  getState: () => GameStore;

  // Sync method - sets state from remote sync (bypasses history)
  setStateFromSync: (state: GameState) => void;
}

const initialState: GameState = {
  enemy: {
    boss: 0,
    powers: [],
    minions: [],
    autoDecrementPowers: false,
  },
  turn: {
    currentTurn: 1,
    currentPlayer: null,
    cardSequence: [],
    drawPile: [],
    playedCards: [],
    playerCount: 0,
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

  addPower: (initialTimer: number = 0) => {
    set((state) => {
      const existingPowers = state.enemy.powers;
      const MAX_POWERS = 6;
      if (existingPowers.length >= MAX_POWERS) {
        return state; // Don't add if max reached
      }
      const nextLetter = String.fromCharCode(65 + existingPowers.length); // A, B, C...
      const newPower: Power = {
        id: crypto.randomUUID(),
        name: `p${nextLetter}`,
        timer: initialTimer,
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

  toggleAutoDecrementPowers: () => {
    set((state) => {
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          autoDecrementPowers: !state.enemy.autoDecrementPowers,
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
      const existingMinions = state.enemy.minions.filter((m) => !m.isDead);
      const MAX_MINIONS = 6;
      if (existingMinions.length >= MAX_MINIONS) {
        return state; // Don't add if max reached
      }
      
      // Find the first missing letter in sequence A-F
      const usedLetters = new Set(existingMinions.map((m) => m.name));
      let nextLetter = 'A';
      for (let i = 0; i < MAX_MINIONS; i++) {
        const letter = String.fromCharCode(65 + i); // A, B, C, D, E, F
        if (!usedLetters.has(letter)) {
          nextLetter = letter;
          break;
        }
      }
      
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

  initializeDeck: (playerCount: number) => {
    set((state) => {
      const drawPile = createShuffledDeck(playerCount);
      const newState = {
        ...state,
        turn: {
          ...state.turn,
          playerCount,
          drawPile,
          playedCards: [],
          cardSequence: [],
          currentPlayer: null,
          currentTurn: 1,
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

  advanceTurn: () => {
    set((state) => {
      let { drawPile, playedCards, currentTurn, cardSequence } = state.turn;
      
      // If deck is empty, reset and shuffle
      if (drawPile.length === 0) {
        drawPile = createShuffledDeck(state.turn.playerCount);
        playedCards = [];
        cardSequence = [];
      }
      
      // Draw next card
      const drawnCard = drawPile[0];
      const newDrawPile = drawPile.slice(1);
      const newPlayedCards = [...playedCards, drawnCard];
      const newCardSequence = [...cardSequence, drawnCard];
      
      // Auto-decrement powers if Nemesis card is drawn and toggle is enabled
      let updatedPowers = state.enemy.powers;
      if (drawnCard === 'Nemesis' && state.enemy.autoDecrementPowers) {
        updatedPowers = state.enemy.powers.map((power) => ({
          ...power,
          timer: Math.max(0, power.timer - 1),
        }));
      }
      
      const newState = {
        ...state,
        enemy: {
          ...state.enemy,
          powers: updatedPowers,
        },
        turn: {
          ...state.turn,
          drawPile: newDrawPile,
          playedCards: newPlayedCards,
          cardSequence: newCardSequence,
          currentPlayer: drawnCard,
          currentTurn: currentTurn + 1,
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

  addPlayer: () => {
    set((state) => {
      const existingPlayers = state.stronghold.players;
      const playerNumber = existingPlayers.length + 1;
      const playerName = `P${playerNumber}`;
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: playerName,
        life: 10,
        chargeStacks: new Array(5).fill(false), // 5 empty charge slots by default
      };
      
      const newPlayers = [...state.stronghold.players, newPlayer];
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: newPlayers,
        },
        turn: {
          ...state.turn,
          playerCount: newPlayers.length,
        },
      };
      
      // Update deck with new player count
      const newDrawPile = createShuffledDeck(newState.turn.playerCount);
      newState.turn.drawPile = newDrawPile;
      newState.turn.playedCards = [];
      newState.turn.cardSequence = [];
      newState.turn.currentPlayer = null;
      newState.turn.currentTurn = 1;
      
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

  removePlayer: (playerId: string) => {
    set((state) => {
      const newPlayers = state.stronghold.players.filter((p) => p.id !== playerId);
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: newPlayers,
        },
        turn: {
          ...state.turn,
          playerCount: newPlayers.length,
        },
      };
      
      // Update deck with new player count and start new round
      const newDrawPile = createShuffledDeck(newState.turn.playerCount);
      newState.turn.drawPile = newDrawPile;
      newState.turn.playedCards = [];
      newState.turn.cardSequence = [];
      newState.turn.currentPlayer = null;
      newState.turn.currentTurn = 1;
      
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

  updatePlayerLife: (playerId: string, life: number) => {
    set((state) => {
      const player = state.stronghold.players.find((p) => p.id === playerId);
      if (!player) return state;
      
      // If player has 0 life and taking damage, transfer to stronghold
      const oldLife = player.life;
      const newLife = Math.max(0, life);
      let strongholdDamage = 0;
      
      // If player has 0 life and we're trying to reduce it further, transfer damage
      if (oldLife === 0 && life < 0) {
        strongholdDamage = Math.abs(life);
      }
      
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId ? { ...p, life: newLife } : p
          ),
          strongholdLife: Math.max(0, state.stronghold.strongholdLife + strongholdDamage),
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

  incrementPlayerLife: (playerId: string) => {
    set((state) => {
      const player = state.stronghold.players.find((p) => p.id === playerId);
      if (!player) return state;
      
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId ? { ...p, life: p.life + 1 } : p
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

  decrementPlayerLife: (playerId: string) => {
    set((state) => {
      const player = state.stronghold.players.find((p) => p.id === playerId);
      if (!player) return state;
      
      const newLife = Math.max(0, player.life - 1);
      let strongholdDamage = 0;
      
      // If player has 0 life, damage transfers to stronghold
      if (player.life === 0) {
        strongholdDamage = 1;
      }
      
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId ? { ...p, life: newLife } : p
          ),
          strongholdLife: Math.max(0, state.stronghold.strongholdLife + strongholdDamage),
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

  addChargeSlot: (playerId: string) => {
    set((state) => {
      const MAX_CHARGES = 6;
      const player = state.stronghold.players.find((p) => p.id === playerId);
      // Don't add if already at max
      if (player && player.chargeStacks.length >= MAX_CHARGES) {
        return state;
      }
      
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId ? { ...p, chargeStacks: [...p.chargeStacks, false] } : p
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

  removeChargeSlot: (playerId: string, slotIndex: number) => {
    set((state) => {
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId
              ? { ...p, chargeStacks: p.chargeStacks.filter((_, i) => i !== slotIndex) }
              : p
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

  toggleChargeSlot: (playerId: string, slotIndex: number) => {
    set((state) => {
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  chargeStacks: p.chargeStacks.map((filled, i) =>
                    i === slotIndex ? !filled : filled
                  ),
                }
              : p
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

  useCapacity: (playerId: string) => {
    set((state) => {
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          players: state.stronghold.players.map((p) =>
            p.id === playerId ? { ...p, chargeStacks: p.chargeStacks.map(() => false) } : p
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

  updateStrongholdLife: (value: number) => {
    set((state) => {
      const newState = {
        ...state,
        stronghold: {
          ...state.stronghold,
          strongholdLife: Math.max(0, value),
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

  updateTurnPlayerLabel: (playerType: '1-2' | '3-4', customName: string) => {
    set((state) => {
      // Validate that custom name starts with the correct number prefix
      const expectedPrefix = playerType === '1-2' ? '1-' : '3-';
      if (!customName.startsWith(expectedPrefix)) {
        // If it doesn't start with the prefix, prepend it
        customName = `${expectedPrefix}${customName}`;
      }
      
      const newState = {
        ...state,
        turn: {
          ...state.turn,
          customLabels: {
            ...state.turn.customLabels,
            [playerType]: customName,
          },
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

  setStateFromSync: (state: GameState) => {
    set({
      enemy: state.enemy,
      turn: state.turn,
      stronghold: state.stronghold,
      // Don't update history when syncing from remote
    });
  },
}));

