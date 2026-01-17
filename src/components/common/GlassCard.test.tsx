import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GlassCard from './GlassCard';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import React from 'react';

describe('GlassCard', () => {
  it('renders with glass styles', () => {
    render(
      <ChakraProvider theme={theme}>
        <GlassCard data-testid="glass-card">Content</GlassCard>
      </ChakraProvider>
    );

    const card = screen.getByTestId('glass-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Content');
  });
});
