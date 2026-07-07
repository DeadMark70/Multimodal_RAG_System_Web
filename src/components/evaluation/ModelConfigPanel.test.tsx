import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import * as evaluationApi from '../../services/evaluationApi';
import ModelConfigPanel from './ModelConfigPanel';

vi.mock('../../services/evaluationApi', () => ({
  listAvailableModels: vi.fn(),
  listModelConfigs: vi.fn(),
  createModelConfig: vi.fn(),
  updateModelConfig: vi.fn(),
  deleteModelConfig: vi.fn(),
}));

describe('ModelConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evaluationApi.listAvailableModels).mockResolvedValue([
      {
        name: 'gemini-2.5-flash',
        display_name: 'Gemini 2.5 Flash',
        description: 'fast model',
        input_token_limit: 1048576,
        output_token_limit: 8192,
        supported_actions: ['generateContent'],
        thinking: {
          supported: true,
          control_type: 'budget',
          levels: [],
          budget_min: 0,
          budget_max: 24576,
          supports_disable: true,
          supports_dynamic: true,
          default_level: null,
          default_budget: 8192,
          guidance: 'Uses thinking_budget.',
        },
      },
    ]);
    vi.mocked(evaluationApi.listModelConfigs).mockResolvedValue([
      {
        id: 'cfg-1',
        name: 'Balanced',
        model_name: 'gemini-2.5-flash',
        temperature: 0.7,
        top_p: 0.95,
        top_k: 40,
        max_input_tokens: 8192,
        max_output_tokens: 2048,
        thinking_mode: true,
        thinking_budget: 8192,
        thinking_level: null,
        thinking_include_thoughts: false,
      },
    ]);
  });

  it('loads available models and saved configs', async () => {
    render(
      <ChakraProvider theme={theme}>
        <ModelConfigPanel />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Available models 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Saved presets 1')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gemini 2.5 Flash' })).toBeInTheDocument();
    expect(screen.getByText(/Thinking Budget/i)).toBeInTheDocument();
  });

  it('keeps panel usable and shows fallback message when requests fail', async () => {
    vi.mocked(evaluationApi.listAvailableModels).mockRejectedValue(new Error('Missing Authorization header'));
    vi.mocked(evaluationApi.listModelConfigs).mockRejectedValue(new Error('Missing Authorization header'));

    render(
      <ChakraProvider theme={theme}>
        <ModelConfigPanel />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Could not load evaluation model settings. Sign in again and retry.')).toBeInTheDocument();
    });
    expect(screen.getByText('Available models 0')).toBeInTheDocument();
    expect(screen.getByText('Saved presets 0')).toBeInTheDocument();
  });
});
