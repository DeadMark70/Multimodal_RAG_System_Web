import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThinkingConfigControl from './ThinkingConfigControl';
import type { AvailableModel, ModelConfigInput } from '../../types/evaluation';

function renderControl(model: AvailableModel | null, formOverride: Partial<ModelConfigInput> = {}) {
  const onChange = vi.fn();
  const form: ModelConfigInput = {
    name: 'Preset',
    model_name: model?.name ?? '',
    temperature: 0.7,
    top_p: 0.95,
    top_k: 40,
    max_input_tokens: 8192,
    max_output_tokens: 8192,
    thinking_mode: true,
    thinking_budget: 8192,
    thinking_level: null,
    thinking_include_thoughts: false,
    ...formOverride,
  };

  render(
    <ChakraProvider>
      <ThinkingConfigControl selectedModel={model} form={form} onChange={onChange} />
    </ChakraProvider>
  );

  return onChange;
}

const budgetModel: AvailableModel = {
  name: 'gemini-2.5-flash',
  display_name: 'Gemini 2.5 Flash',
  description: null,
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
};

const levelModel: AvailableModel = {
  ...budgetModel,
  name: 'gemini-3.0-flash',
  display_name: 'Gemini 3.0 Flash',
  thinking: {
    supported: true,
    control_type: 'level',
    levels: ['minimal', 'low', 'medium', 'high'],
    budget_min: null,
    budget_max: null,
    supports_disable: false,
    supports_dynamic: false,
    default_level: 'medium',
    default_budget: null,
    guidance: 'Uses thinking_level.',
  },
};

describe('ThinkingConfigControl', () => {
  it('renders budget controls for budget models', () => {
    renderControl(budgetModel);

    expect(screen.getByText(/Thinking Budget/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dynamic/i })).toBeInTheDocument();
  });

  it('renders level controls for level models', () => {
    renderControl(levelModel, { thinking_budget: null, thinking_level: 'medium' });

    expect(screen.getByRole('button', { name: /High/i })).toBeInTheDocument();
    expect(screen.queryByText(/Thinking Budget/i)).not.toBeInTheDocument();
  });

  it('updates thinking level when a level option is selected', () => {
    const onChange = renderControl(levelModel, { thinking_budget: null, thinking_level: 'medium' });

    fireEvent.click(screen.getByRole('button', { name: /High/i }));

    expect(onChange).toHaveBeenCalledWith({
      thinking_level: 'high',
      thinking_budget: null,
    });
  });
});
