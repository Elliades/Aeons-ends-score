import type { Card } from '@/store/types';

/**
 * Creates a deck of cards based on player count
 * • 0 players: empty deck
 * • 1 player: 4x Joker + 2x Nemesis = 6 cards
 * • 2 players: 2x P1 + 2x P2 + 2x Nemesis = 6 cards
 * • 3 players: 1x P1 + 1x P2 + 1x P3 + 1x Joker + 2x Nemesis = 6 cards
 * • 4 players: 1x P1 + 1x P2 + 1x P3 + 1x P4 + 2x Nemesis + 1x 1-2 + 1x 3-4 = 8 cards
 */
export function createDeck(playerCount: number): Card[] {
  const deck: Card[] = [];
  
  if (playerCount === 0) {
    // 0 players: empty deck
    return deck;
  } else if (playerCount === 1) {
    // 1 player: 4x Joker, 2x Nemesis
    deck.push('Joker', 'Joker', 'Joker', 'Joker', 'Nemesis', 'Nemesis');
  } else if (playerCount === 2) {
    // 2 players: 2x P1, 2x P2, 2x Nemesis
    deck.push('P1', 'P1', 'P2', 'P2', 'Nemesis', 'Nemesis');
  } else if (playerCount === 3) {
    // 3 players: 1x P1, 1x P2, 1x P3, 1x Joker, 2x Nemesis
    deck.push('P1', 'P2', 'P3', 'Joker', 'Nemesis', 'Nemesis');
  } else if (playerCount === 4) {
    // 4 players: 1x P1, 1x P2, 1x P3, 1x P4, 2x Nemesis, 1x 1-2, 1x 3-4
    deck.push('P1', 'P2', 'P3', 'P4', 'Nemesis', 'Nemesis', '1-2', '3-4');
  } else {
    // Default to 2 players if invalid count
    deck.push('P1', 'P1', 'P2', 'P2', 'Nemesis', 'Nemesis');
  }
  
  return deck;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates and shuffles a deck for the game
 */
export function createShuffledDeck(playerCount: number): Card[] {
  const deck = createDeck(playerCount);
  return shuffle(deck);
}

