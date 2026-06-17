# Aeon's End Tracker - Architecture Plan

## Requirements Analysis

### Core Features

#### 1. ENEMY Section
- **Boss**: Score tracking (number)
- **Powers**: 
  - Multiple power slots (addable via dotted square)
  - Default naming: 'pA', 'pB', 'pC'...
  - Timer count (number)
  - Auto-decrease on nemesis turn
  - Highlight animation when timer reaches 0
  - Manual increment/decrement
- **Minions**:
  - Multiple minion slots (addable via dotted square)
  - Default naming: 'A', 'B', 'C'...
  - Life points (number)
  - Manual increment/decrement
  - Death animation when life reaches 0
  - Disappear when dead

#### 2. TURN Section
- Current turn prominently displayed (large, centered)
- Card sequence showing:
  - Which player has played
  - Which cards are drawn next
- Draw pile logic:
  - 2 players = 2x P1, 2x P2, 2x Nemesis cards
  - Shuffle when full
- Tap current player to advance turn
- New round starts when all cards drawn
- Shuffle and restart on new round

#### 3. STRONGHOLD Section
- Players:
  - Name
  - Life points
  - Charge
- Stronghold life points

#### 4. General Features
- Manual increment/decrement (one by one)
- Long press / card press: More options (preselections, input box)
- Undo/Redo functionality
- Fantasy/mage theme (Aeon's End aesthetic)
- Intuitiveness > looks
- Cross-platform: Web app / Android app / iOS app
- Responsive: Phone, laptop, tablet

#### 5. Technical Requirements
- Test-driven development
- E2E tests
- Simple but effective tech stack

## Tech Stack Decision

### Frontend Framework
**React + TypeScript + Vite**
- Modern, fast development
- Excellent TypeScript support
- Simple build setup
- Great for web-first approach

### Mobile App Wrapper
**Capacitor**
- Wraps web app as native mobile apps
- Supports Android and iOS
- Simple configuration
- No need to rewrite for mobile

### Styling
**Tailwind CSS**
- Utility-first, fast development
- Customizable for fantasy theme
- Responsive by default
- Dark theme support (good for game board feel)

### State Management
**Zustand**
- Simple, lightweight
- Minimal boilerplate
- Easy to implement undo/redo
- Good TypeScript support

### Testing
- **Vitest**: Unit tests (fast, Vite-native)
- **Playwright**: E2E tests (cross-browser, mobile support)

### Undo/Redo
- Custom implementation with Zustand middleware or history stack

## Project Structure

```
aeons-end-tracker/
├── src/
│   ├── components/
│   │   ├── Enemy/
│   │   │   ├── Boss.tsx
│   │   │   ├── Powers.tsx
│   │   │   ├── PowerCard.tsx
│   │   │   ├── Minions.tsx
│   │   │   └── MinionCard.tsx
│   │   ├── Turn/
│   │   │   ├── TurnTracker.tsx
│   │   │   ├── CurrentTurn.tsx
│   │   │   └── CardSequence.tsx
│   │   ├── Stronghold/
│   │   │   ├── StrongholdSection.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   └── StrongholdLife.tsx
│   │   ├── common/
│   │   │   ├── NumberInput.tsx
│   │   │   ├── AddButton.tsx
│   │   │   └── ValueEditor.tsx (for long press)
│   │   └── Layout.tsx
│   ├── store/
│   │   ├── gameStore.ts
│   │   ├── undoRedo.ts
│   │   └── types.ts
│   ├── utils/
│   │   ├── cardDeck.ts
│   │   └── animations.ts
│   ├── hooks/
│   │   ├── useUndoRedo.ts
│   │   └── useLongPress.ts
│   ├── styles/
│   │   └── theme.css
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/
│   │   ├── store/
│   │   ├── utils/
│   │   └── components/
│   └── e2e/
│       ├── enemy.spec.ts
│       ├── turn.spec.ts
│       └── stronghold.spec.ts
├── public/
├── capacitor.config.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .cursorrules
```

## State Management Design

### Game State Structure
```typescript
interface GameState {
  enemy: {
    boss: number;
    powers: Power[];
    minions: Minion[];
  };
  turn: {
    currentTurn: number;
    currentPlayer: PlayerType;
    cardSequence: Card[];
    drawPile: Card[];
    playedCards: Card[];
  };
  stronghold: {
    players: Player[];
    strongholdLife: number;
  };
  history: GameState[]; // for undo/redo
  historyIndex: number;
}

interface Power {
  id: string;
  name: string;
  timer: number;
}

interface Minion {
  id: string;
  name: string;
  life: number;
  isDead: boolean;
}

interface Player {
  id: string;
  name: string;
  life: number;
  charge: number;
}

type PlayerType = 'P1' | 'P2' | 'Nemesis';
type Card = PlayerType;
```

## Key Implementation Details

### 1. Undo/Redo System
- Store state snapshots in history array
- Limit history size (e.g., 50 states)
- Each action creates a new state snapshot
- Undo: Go back in history
- Redo: Go forward in history

### 2. Card Deck Logic
- Initialize deck based on player count
- Shuffle using Fisher-Yates algorithm
- Track current index in deck
- Reset and shuffle when deck exhausted

### 3. Animations
- Power timer empty: Highlight animation (pulse/glow)
- Minion death: Breakup animation (particles/fade)
- Use CSS animations or Framer Motion (lightweight)

### 4. Responsive Design
- Mobile-first approach
- Three sections stack vertically on mobile
- Horizontal layout on tablet/desktop
- Touch-friendly button sizes (min 44x44px)

### 5. Theme (Fantasy/Mage)
- Dark background (chalkboard-like or dark wood)
- Mystical colors (purples, blues, golds)
- Card-like UI elements
- Subtle magical effects

## Testing Strategy

### Unit Tests (Vitest)
- State management functions
- Card deck logic
- Number input validation
- Undo/redo logic

### Component Tests
- Component rendering
- User interactions
- State updates

### E2E Tests (Playwright)
- Full game flow
- Undo/redo functionality
- Turn progression
- Enemy management
- Stronghold management
- Cross-browser testing
- Mobile viewport testing

## Development Phases

1. **Phase 0**: Project setup and tooling
2. **Phase 1**: Core state management + undo/redo
3. **Phase 2**: ENEMY section (Boss, Powers, Minions)
4. **Phase 3**: TURN section (turn tracking, card deck)
5. **Phase 4**: STRONGHOLD section (players, stronghold)
6. **Phase 5**: Animations and polish
7. **Phase 6**: Mobile app setup (Capacitor)
8. **Phase 7**: Testing and refinement

