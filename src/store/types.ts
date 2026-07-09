export type PlayerType = 'P1' | 'P2' | 'P3' | 'P4' | 'Joker' | 'Nemesis' | '1-2' | '3-4';

export interface Power {
  id: string;
  name: string;
  timer: number;
}

export interface Minion {
  id: string;
  name: string;
  life: number;
  isDead: boolean;
}

export interface Player {
  id: string;
  name: string;
  life: number;
  chargeStacks: boolean[]; // Array of charge slots, true = filled, false = empty
}

export type Card = PlayerType;

export interface EnemyState {
  boss: number;
  powers: Power[];
  minions: Minion[];
  autoDecrementPowers: boolean; // Auto-decrement powers when Nemesis card is drawn
}

export interface TurnState {
  currentTurn: number;
  currentPlayer: PlayerType | null;
  cardSequence: Card[];
  drawPile: Card[];
  playedCards: Card[];
  playerCount: number;
  customLabels?: {
    '1-2'?: string;
    '3-4'?: string;
  };
}

export interface StrongholdState {
  players: Player[];
  strongholdLife: number;
}

export interface GameState {
  enemy: EnemyState;
  turn: TurnState;
  stronghold: StrongholdState;
}

