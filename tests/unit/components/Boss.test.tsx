import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Boss } from '@/components/Enemy/Boss';
import { useGameStore } from '@/store/gameStore';

describe('Boss', () => {
  beforeEach(() => {
    // Reset store
    useGameStore.setState({
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
    } as any);
  });

  it('should display boss score', () => {
    useGameStore.setState({
      enemy: { boss: 50, powers: [], minions: [] },
    } as any);
    
    render(<Boss />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should increment boss score on + click', async () => {
    const user = userEvent.setup();
    render(<Boss />);
    
    const incrementButton = screen.getByLabelText(/increment/i);
    await user.click(incrementButton);
    
    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.enemy.boss).toBe(1);
    });
  });

  it('should decrement boss score on - click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      enemy: { boss: 10, powers: [], minions: [] },
    } as any);
    
    render(<Boss />);
    
    const decrementButton = screen.getByLabelText(/decrement/i);
    await user.click(decrementButton);
    
    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.enemy.boss).toBe(9);
    });
  });
});

