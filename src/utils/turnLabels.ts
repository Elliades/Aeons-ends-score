import type { PlayerType } from '@/store/types';
import { useGameStore } from '@/store/gameStore';

const defaultCardLabels: Record<PlayerType, string> = {
  P1: 'J1',
  P2: 'J2',
  P3: 'J3',
  P4: 'J4',
  Joker: '★',
  Nemesis: 'N',
  '1-2': '1-2',
  '3-4': '3-4',
};

/**
 * Get the display label for a player type, using custom label if available
 * Custom labels for '1-2' and '3-4' must start with their number prefix
 */
export function getTurnPlayerLabel(playerType: PlayerType): string {
  // For '1-2' and '3-4', check for custom labels
  if (playerType === '1-2' || playerType === '3-4') {
    const customLabels = useGameStore.getState().turn.customLabels;
    if (customLabels?.[playerType]) {
      return customLabels[playerType];
    }
  }
  
  return defaultCardLabels[playerType];
}

/**
 * Hook version that reacts to state changes
 */
export function useTurnPlayerLabel(playerType: PlayerType): string {
  const customLabels = useGameStore((state) => state.turn.customLabels);
  
  if (playerType === '1-2' || playerType === '3-4') {
    if (customLabels?.[playerType]) {
      return customLabels[playerType];
    }
  }
  
  return defaultCardLabels[playerType];
}



