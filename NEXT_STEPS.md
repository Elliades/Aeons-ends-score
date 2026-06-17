# Next Steps - Development Plan

## Current Status ✅

### Completed Features
1. **Project Setup** ✅
   - React + TypeScript + Vite configured
   - Tailwind CSS with fantasy/mage theme
   - Zustand state management
   - Capacitor setup for mobile apps
   - Vitest and Playwright testing frameworks
   - All configuration files in place

2. **Layout** ✅
   - Three-section layout matching mockup
   - ENEMY section at top
   - Large turn number in middle
   - TURN section below
   - STRONGHOLD section at bottom
   - Responsive design

3. **Undo/Redo System** ✅
   - Full history management
   - Undo/redo functionality
   - History size limits (50 states)
   - All state changes tracked

4. **ENEMY Section** ✅
   - **Boss**: Score tracking with increment/decrement
   - **Powers**: 
     - Add/remove powers
     - Default naming (pA, pB, pC...)
     - Timer increment/decrement
     - Highlight animation when timer reaches 0
     - Undo/redo support
   - **Minions**:
     - Add/remove minions
     - Default naming (A, B, C...)
     - Life increment/decrement
     - Red X mark when dead
     - Death animation with auto-removal
     - Undo/redo support

### Test Coverage
- 31 tests passing
- Store actions tested
- Component rendering tested
- User interactions tested

---

## Next Steps - Implementation Plan

### Phase 1: TURN Section (High Priority)

#### 1.1 Turn Tracker & Card Deck Logic
**Requirements:**
- Initialize deck based on player count (2 players = 2x P1, 2x P2, 2x Nemesis)
- Shuffle deck using Fisher-Yates algorithm
- Track current turn number
- Display large turn number prominently (already done in layout)
- Track current player (P1, P2, Nemesis)

**Store Actions Needed:**
- `initializeDeck(playerCount: number)`: Create and shuffle initial deck
- `advanceTurn()`: Move to next turn, draw next card
- `resetRound()`: Shuffle deck when exhausted
- `shuffleDeck()`: Fisher-Yates shuffle implementation

**Components Needed:**
- `CardSequence.tsx`: Display sequence of played/upcoming cards
- `CurrentPlayer.tsx`: Display and allow clicking current player card
- Update `TurnSection.tsx`: Integrate all turn components

**Tests:**
- Deck initialization tests
- Turn advancement tests
- Deck shuffling tests
- Round reset tests
- Component rendering tests

#### 1.2 Card Sequence Display
**Requirements:**
- Show cards that have been played (small boxes)
- Show current card (highlighted with arrow)
- Show upcoming cards (empty boxes)
- Cards should be color-coded (P1=green, P2=blue, Nemesis=red)
- Tap current player card to advance turn

**UI Components:**
- Card boxes with labels (J1, J2, M)
- Highlight current card with yellow dotted border and arrow
- Empty placeholder boxes for future cards

---

### Phase 2: STRONGHOLD Section

#### 2.1 Player Management
**Requirements:**
- Add/remove players
- Track player name, life points, and charge
- Default player names (J1, J2, etc.)
- Manual increment/decrement for life and charge
- Long press for advanced editing (presets, input box)

**Store Actions Needed:**
- `addPlayer()`: Add new player
- `removePlayer(playerId: string)`: Remove player
- `updatePlayerLife(playerId: string, life: number)`: Update life
- `updatePlayerCharge(playerId: string, charge: number)`: Update charge
- `incrementPlayerLife(playerId: string)`: Increment by 1
- `decrementPlayerLife(playerId: string)`: Decrement by 1
- Similar for charge

**Components Needed:**
- `PlayerCard.tsx`: Display player info with controls
- `PlayerList.tsx`: Container for player cards
- `ValueEditor.tsx`: Modal/popup for advanced editing (long press)
- Update `StrongholdSection.tsx`: Integrate players and stronghold life

**Tests:**
- Player management store tests
- Player card component tests
- Value editor tests

#### 2.2 Stronghold Life
**Requirements:**
- Track stronghold life points
- Manual increment/decrement
- Long press for advanced editing

**Store Actions Needed:**
- `updateStrongholdLife(life: number)`
- `incrementStrongholdLife()`
- `decrementStrongholdLife()`

**Components Needed:**
- Integrate into `StrongholdSection.tsx` (already has placeholder)

---

### Phase 3: Advanced Features

#### 3.1 Long Press / Advanced Editing
**Requirements:**
- Long press on any number input opens modal
- Modal shows:
  - Quick preset buttons (-10, -5, +5, +10, etc.)
  - Custom input box for exact value
  - Apply/Cancel buttons

**Components Needed:**
- `ValueEditor.tsx`: Modal component
- `useLongPress.ts`: Custom hook for long press detection
- Integration in all number inputs

**Tests:**
- Long press hook tests
- Value editor modal tests

#### 3.2 Power Timer Auto-Decrease
**Requirements:**
- Automatically decrease power timers when Nemesis turn occurs
- Highlight animation when timer reaches 0 (already done)

**Implementation:**
- Hook into turn advancement
- When current player is Nemesis, decrease all power timers
- Store action: `decreaseAllPowerTimers()`

#### 3.3 Undo/Redo UI Controls
**Requirements:**
- Add undo/redo buttons to UI
- Disable buttons when undo/redo not available
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

**Components Needed:**
- Undo/Redo button component
- Keyboard shortcut handler
- Integration in layout

---

### Phase 4: Polish & Animations

#### 4.1 Animations
**Requirements:**
- Smooth transitions for all state changes
- Power timer highlight animation (already done)
- Minion death animation (already done)
- Card draw animation
- Turn transition animation

**Implementation:**
- Use CSS animations/transitions
- Consider Framer Motion for complex animations (if needed)

#### 4.2 Responsive Design Refinement
**Requirements:**
- Test on different screen sizes
- Optimize mobile layout
- Ensure touch targets are adequate (44x44px minimum)
- Tablet layout optimization

#### 4.3 Theme Refinement
**Requirements:**
- Finalize fantasy/mage aesthetic
- Ensure sufficient color contrast
- Test dark theme readability
- Add subtle magical effects

---

### Phase 5: Mobile App Setup

#### 5.1 Capacitor Configuration
**Requirements:**
- Configure Android app
- Configure iOS app
- Test native features if needed
- App icons and splash screens

**Steps:**
```bash
npx cap add android
npx cap add ios
npx cap sync
```

#### 5.2 PWA Features
**Requirements:**
- Service worker for offline support
- App manifest
- Install prompt
- Offline functionality

---

### Phase 6: Testing & Quality Assurance

#### 6.1 E2E Tests
**Requirements:**
- Test complete game flows
- Test undo/redo flows
- Test turn progression
- Test enemy management
- Test stronghold management
- Cross-browser testing
- Mobile viewport testing

**Playwright Tests:**
- Full game session flow
- Add/remove entities
- Turn progression
- Undo/redo operations
- Responsive layout tests

#### 6.2 Code Coverage
**Requirements:**
- Aim for >80% code coverage
- Cover edge cases
- Test error handling
- Test boundary conditions

#### 6.3 Performance Optimization
**Requirements:**
- Bundle size optimization
- Lazy loading if needed
- Performance profiling
- Memory leak checks

---

### Phase 7: Documentation & Release

#### 7.1 Documentation
**Requirements:**
- Update README with features
- Add user guide
- API documentation (if needed)
- Architecture documentation updates

#### 7.2 Release Preparation
**Requirements:**
- Version numbering
- Changelog
- Build for production
- Test production build
- Deploy instructions

---

## Development Priority Order

1. **TURN Section** (Phase 1) - Core gameplay functionality
2. **STRONGHOLD Section** (Phase 2) - Complete game tracking
3. **Advanced Features** (Phase 3) - Polish and UX improvements
4. **Polish & Animations** (Phase 4) - Visual refinement
5. **Mobile App Setup** (Phase 5) - Cross-platform support
6. **Testing & QA** (Phase 6) - Quality assurance
7. **Documentation & Release** (Phase 7) - Finalization

---

## Notes

- All new features should follow TDD (Test-Driven Development)
- Maintain >80% code coverage
- Follow `.cursorrules` guidelines
- Keep components small and focused
- Ensure undo/redo works for all state changes
- Test on multiple devices/viewports
- Maintain accessibility standards

---

## Current Branch
- Branch: `aeons-end-tracker`
- Ready for continued development

