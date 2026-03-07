import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import CampaignRunner from './CampaignRunner';

const mockListTestCases = vi.fn();
const mockListModelConfigs = vi.fn();
const mockListCampaigns = vi.fn();
const mockCreateCampaign = vi.fn();
const mockStreamCampaign = vi.fn();
const mockGetCampaignResults = vi.fn();
const mockCancelCampaign = vi.fn();

vi.mock('../../services/evaluationApi', () => ({
  listTestCases: () => mockListTestCases(),
  listModelConfigs: () => mockListModelConfigs(),
  listCampaigns: () => mockListCampaigns(),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
  streamCampaign: (...args: unknown[]) => mockStreamCampaign(...args),
  getCampaignResults: (...args: unknown[]) => mockGetCampaignResults(...args),
  cancelCampaign: (...args: unknown[]) => mockCancelCampaign(...args),
}));

describe('CampaignRunner', () => {
  it('creates a campaign and renders streamed progress', async () => {
    mockListTestCases.mockResolvedValue([
      {
        id: 'Q1',
        question: 'Question 1',
        ground_truth: 'Answer 1',
        category: '基礎',
        difficulty: 'easy',
        source_docs: [],
        requires_multi_doc_reasoning: false,
      },
    ]);
    mockListModelConfigs.mockResolvedValue([
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
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'cmp-1',
          name: 'Smoke campaign',
          status: 'pending',
          config: {
            test_case_ids: ['Q1'],
            modes: ['naive'],
            model_config: {
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
            model_config_id: 'cfg-1',
            repeat_count: 1,
            batch_size: 1,
            rpm_limit: 60,
          },
          completed_units: 0,
          total_units: 1,
          cancel_requested: false,
          created_at: '2026-03-07T00:00:00+00:00',
          updated_at: '2026-03-07T00:00:00+00:00',
        },
      ])
      .mockResolvedValue([
        {
          id: 'cmp-1',
          name: 'Smoke campaign',
          status: 'completed',
          config: {
            test_case_ids: ['Q1'],
            modes: ['naive'],
            model_config: {
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
            model_config_id: 'cfg-1',
            repeat_count: 1,
            batch_size: 1,
            rpm_limit: 60,
          },
          completed_units: 1,
          total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          cancel_requested: false,
          created_at: '2026-03-07T00:00:00+00:00',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        },
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-1', status: 'pending' });
    mockStreamCampaign.mockImplementation(async (_campaignId: string, onEvent: (event: unknown) => void) => {
      onEvent({
        type: 'campaign_snapshot',
        data: {
          id: 'cmp-1',
          name: 'Smoke campaign',
          status: 'running',
          config: {
            test_case_ids: ['Q1'],
            modes: ['naive'],
            model_config: {
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
            model_config_id: 'cfg-1',
            repeat_count: 1,
            batch_size: 1,
            rpm_limit: 60,
          },
          completed_units: 0,
          total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          cancel_requested: false,
          created_at: '2026-03-07T00:00:00+00:00',
          updated_at: '2026-03-07T00:00:00+00:00',
        },
      });
      onEvent({
        type: 'campaign_completed',
        data: {
          id: 'cmp-1',
          name: 'Smoke campaign',
          status: 'completed',
          config: {
            test_case_ids: ['Q1'],
            modes: ['naive'],
            model_config: {
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
            model_config_id: 'cfg-1',
            repeat_count: 1,
            batch_size: 1,
            rpm_limit: 60,
          },
          completed_units: 1,
          total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          cancel_requested: false,
          created_at: '2026-03-07T00:00:00+00:00',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        },
      });
    });
    mockGetCampaignResults.mockResolvedValue({
      campaign: {
        id: 'cmp-1',
        name: 'Smoke campaign',
        status: 'completed',
        config: {
          test_case_ids: ['Q1'],
          modes: ['naive'],
          model_config: {
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
          model_config_id: 'cfg-1',
          repeat_count: 1,
          batch_size: 1,
          rpm_limit: 60,
        },
        completed_units: 1,
        total_units: 1,
        cancel_requested: false,
        created_at: '2026-03-07T00:00:00+00:00',
        completed_at: '2026-03-07T00:00:10+00:00',
        updated_at: '2026-03-07T00:00:10+00:00',
      },
      results: [],
    });
    mockCancelCampaign.mockResolvedValue({});

    render(
      <ChakraProvider theme={theme}>
        <CampaignRunner />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getAllByText('1 / 1').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '查看結果' }));
    await waitFor(() => {
      expect(mockGetCampaignResults).toHaveBeenCalledWith('cmp-1');
    });
  });
});
