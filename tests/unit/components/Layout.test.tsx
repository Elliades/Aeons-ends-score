import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '@/components/Layout';

describe('Layout', () => {
  it('should render all three main sections', () => {
    render(<Layout />);

    expect(screen.getByText("BOSS")).toBeInTheDocument();
    expect(screen.getByText("TURN")).toBeInTheDocument();
    expect(screen.getByText("STRONGHOLD")).toBeInTheDocument();
  });

  it('should render the large turn number', () => {
    render(<Layout />);

    // The turn number should be displayed prominently
    const turnDisplay = screen.getByText("1");
    expect(turnDisplay).toBeInTheDocument();
  });
});

