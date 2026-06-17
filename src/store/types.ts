export type PlayerType = 'P1' | 'P2' | 'Nemesis';

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
  charge: number;
}

export type Card = PlayerType;

export interface EnemyState {
  boss: number;
  powers: Power[];
  minions: Minion[];
}

export interface TurnState {
  currentTurn: number;
  currentPlayer: PlayerType | null;
  cardSequence: Card[];
  drawPile: Card[];
  playedCards: Card[];
  playerCount: number;
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

