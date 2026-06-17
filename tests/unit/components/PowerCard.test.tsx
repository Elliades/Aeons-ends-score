import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PowerCard } from '@/components/Enemy/PowerCard';
import { useGameStore } from '@/store/gameStore';

describe('PowerCard', () => {
  beforeEach(() => {
    // Reset store
    const initialState = {
      enemy: { boss: 0, powers: [], minions: [] },
      turn: {
        currentTurn: 1,
        currentPlayer: null,
        cardSequence: [],
        drawPile: [],
        playedCards: [],
        playerCount: 2,
      },
      stronghold: { players: [], strongholdLife: 0 },
      history: [
        {
          enemy: { boss: 0, powers: [], minions: [] },
          turn: {
            currentTurn: 1,
            currentPlayer: null,
            cardSequence: [],
            drawPile: [],
            playedCards: [],
            playerCount: 2,
          },
          stronghold: { players: [], strongholdLife: 0 },
        },
      ],
      historyIndex: 0,
      maxHistorySize: 50,
    };
    useGameStore.setState(initialState as any);
  });

  it('should display power name and timer', () => {
    const power = { id: '1', name: 'pA', timer: 5 };
    render(<PowerCard power={power} />);

    expect(screen.getByText('pA')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should increment timer on + click', async () => {
    const user = userEvent.setup();
    const { addPower } = useGameStore.getState();
    addPower();
    const state = useGameStore.getState();
    const power = state.enemy.powers[0];
    
    render(<PowerCard power={power} />);
    
    const incrementButton = screen.getByLabelText(/power .* increment/i);
    await user.click(incrementButton);
    
    // Check that the timer was incremented
    const newState = useGameStore.getState();
    const updatedPower = newState.enemy.powers.find(p => p.id === power.id);
    expect(updatedPower?.timer).toBe(power.timer + 1);
  });

  it('should highlight when timer is 0', () => {
    const power = { id: '1', name: 'pA', timer: 0 };
    const { container } = render(<PowerCard power={power} />);
    
    const card = container.querySelector('.animate-pulse-slow');
    expect(card).not.toBeNull();
    expect(card).toBeInTheDocument();
  });
});

