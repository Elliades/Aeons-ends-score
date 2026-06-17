# Aeon's End Tracker

A cross-platform game tracker application for the Aeon's End board game. Track enemy stats (boss, powers, minions), turn progression, and stronghold/player stats.

## Features

- **Enemy Tracking**: Boss score, power timers, and minion life points
- **Turn Management**: Visual turn tracker with card deck management
- **Stronghold**: Player stats (life, charge) and stronghold life points
- **Undo/Redo**: Full history support for all game actions
- **Cross-Platform**: Works as web app, Android app, and iOS app
- **Responsive**: Optimized for phone, tablet, and desktop

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Zustand** (state management)
- **Capacitor** (mobile apps)
- **Vitest** (unit testing)
- **Playwright** (E2E testing)

## Development

### Prerequisites

- Node.js 20+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Run unit tests:
```bash
npm test
```

4. Run E2E tests:
```bash
npm run test:e2e
```

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Mobile App Setup

### Android

1. Add Android platform:
```bash
npx cap add android
```

2. Sync web assets:
```bash
npx cap sync
```

3. Open in Android Studio:
```bash
npx cap open android
```

### iOS

1. Add iOS platform:
```bash
npx cap add ios
```

2. Sync web assets:
```bash
npx cap sync
```

3. Open in Xcode:
```bash
npx cap open ios
```

## Project Structure

```
src/
├── components/       # React components
│   ├── Enemy/       # Enemy section components
│   ├── Turn/        # Turn tracking components
│   ├── Stronghold/  # Stronghold section components
│   └── common/      # Shared components
├── store/           # Zustand state management
├── utils/           # Utility functions
├── hooks/           # Custom React hooks
└── styles/          # Styles and themes
```

## Testing

This project follows Test-Driven Development (TDD):

- **Unit Tests**: Vitest for utilities and store logic
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright for user flows

All tests should be written before implementation.

## License

ISC
