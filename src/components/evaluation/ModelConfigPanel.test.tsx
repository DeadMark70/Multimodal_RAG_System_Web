import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import ModelConfigPanel from './ModelConfigPanel';

vi.mock('../../services/evaluationApi', () => ({
  listAvailableModels: vi.fn().mockResolvedValue([
    {
      name: 'gemini-2.5-flash',
      display_name: 'Gemini 2.5 Flash',
      description: 'fast model',
      input_token_limit: 1048576,
      output_token_limit: 8192,
      supported_actions: ['generateContent'],
    },
  ]),
  listModelConfigs: vi.fn().mockResolvedValue([
    {
      id: 'cfg-1',
      name: 'Balanced',
      model_name: 'gemini-2.5-flash',
      temperature: 0.7,
      top_p: 0.95,
      top_k: 40,
      max_input_tokens: 8192,
      max_output_tokens: 2048,
      thinking_mode: false,
      thinking_budget: 8192,
    },
  ]),
  createModelConfig: vi.fn(),
  updateModelConfig: vi.fn(),
  deleteModelConfig: vi.fn(),
}));

describe('ModelConfigPanel', () => {
  it('loads available models and saved configs', async () => {
    render(
      <ChakraProvider theme={theme}>
        <ModelConfigPanel />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('可用模型 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gemini 2.5 Flash' })).toBeInTheDocument();
  });
});

