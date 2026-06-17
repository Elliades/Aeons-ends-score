import type { GameState } from './types';

export interface HistoryState {
  history: GameState[];
  historyIndex: number;
  maxHistorySize: number;
}

export function createHistoryState(maxHistorySize = 50): HistoryState {
  return {
    history: [],
    historyIndex: -1,
    maxHistorySize,
  };
}

export function saveToHistory(
  currentState: GameState,
  historyState: HistoryState
): HistoryState {
  const newHistory = [...historyState.history];
  
  // Remove any future history if we're not at the end
  if (historyState.historyIndex < newHistory.length - 1) {
    newHistory.splice(historyState.historyIndex + 1);
  }
  
  // Add current state to history
  newHistory.push(deepClone(currentState));
  
  // Limit history size (keep most recent states)
  if (newHistory.length > historyState.maxHistorySize) {
    newHistory.shift();
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1,
      maxHistorySize: historyState.maxHistorySize,
    };
  }
  
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
    maxHistorySize: historyState.maxHistorySize,
  };
}

export function canUndo(historyState: HistoryState): boolean {
  return historyState.historyIndex > 0;
}

export function canRedo(historyState: HistoryState): boolean {
  return historyState.historyIndex < historyState.history.length - 1;
}

export function getUndoState(historyState: HistoryState): GameState | null {
  if (!canUndo(historyState)) {
    return null;
  }
  return deepClone(historyState.history[historyState.historyIndex - 1]);
}

export function getRedoState(historyState: HistoryState): GameState | null {
  if (!canRedo(historyState)) {
    return null;
  }
  return deepClone(historyState.history[historyState.historyIndex + 1]);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

