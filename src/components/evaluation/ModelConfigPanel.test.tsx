import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import ModelConfigPanel from './ModelConfigPanel';
import * as evaluationApi from '../../services/evaluationApi';

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
        thinking_mode: false,
        thinking_budget: 8192,
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
      expect(screen.getByText('可用模型 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gemini 2.5 Flash' })).toBeInTheDocument();
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
      expect(screen.getByText('模型列表暫時無法動態取得，請稍後重試或先手動輸入模型名稱。')).toBeInTheDocument();
    });
    expect(screen.getByText('可用模型 0')).toBeInTheDocument();
    expect(screen.getByText('預設組 0')).toBeInTheDocument();
  });
});
