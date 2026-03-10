import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  getCampaignResultTrace as getCampaignResultTraceFn,
  listCampaignTraces as listCampaignTracesFn,
  listCampaigns as listCampaignsFn,
} from '../../services/evaluationApi';
import theme from '../../theme';
import AgentTraceViewer from './AgentTraceViewer';

const { mockListCampaigns, mockListCampaignTraces, mockGetCampaignResultTrace } = vi.hoisted(() => ({
  mockListCampaigns: vi.fn<typeof listCampaignsFn>(),
  mockListCampaignTraces: vi.fn<typeof listCampaignTracesFn>(),
  mockGetCampaignResultTrace: vi.fn<typeof getCampaignResultTraceFn>(),
}));

vi.mock('../../services/evaluationApi', () => ({
  listCampaigns: mockListCampaigns,
  listCampaignTraces: mockListCampaignTraces,
  getCampaignResultTrace: mockGetCampaignResultTrace,
}));

describe('AgentTraceViewer', () => {
  it('renders trace summaries and comparison details', async () => {
    mockListCampaigns.mockResolvedValue([
      {
        id: 'cmp-1',
        name: 'Agentic run',
        status: 'completed',
        phase: 'evaluation',
        config: {
          test_case_ids: ['Q1'],
          modes: ['agentic'],
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
          repeat_count: 1,
          batch_size: 1,
          rpm_limit: 60,
        },
        completed_units: 1,
        total_units: 1,
        evaluation_completed_units: 1,
        evaluation_total_units: 1,
        cancel_requested: false,
        created_at: '2026-03-08T00:00:00+00:00',
        updated_at: '2026-03-08T00:00:00+00:00',
      },
    ]);
    mockListCampaignTraces.mockResolvedValue([
      {
        trace_id: 'trace-1',
        campaign_result_id: 'result-1',
        question_id: 'Q1',
        question: 'Question 1',
        mode: 'agentic',
        execution_profile: 'agentic_eval_v1',
        run_number: 1,
        trace_status: 'completed',
        summary: 'Primary summary',
        step_count: 3,
        tool_call_count: 1,
        total_tokens: 120,
        created_at: '2026-03-08T00:00:00+00:00',
      },
      {
        trace_id: 'trace-2',
        campaign_result_id: 'result-2',
        question_id: 'Q1',
        question: 'Question 1 rerun',
        mode: 'agentic',
        execution_profile: 'legacy_shared',
        run_number: 2,
        trace_status: 'partial',
        summary: 'Secondary summary',
        step_count: 2,
        tool_call_count: 0,
        total_tokens: 80,
        created_at: '2026-03-08T00:01:00+00:00',
      },
    ]);
    mockGetCampaignResultTrace.mockImplementation((_campaignId: string, resultId: string) => {
      if (resultId === 'result-2') {
        return Promise.resolve({
          trace_id: 'trace-2',
          campaign_id: 'cmp-1',
          campaign_result_id: 'result-2',
          question_id: 'Q1',
          question: 'Question 1 rerun',
          mode: 'agentic',
          execution_profile: 'legacy_shared',
          run_number: 2,
          trace_status: 'partial',
          summary: 'Secondary summary',
          step_count: 2,
          tool_call_count: 0,
          total_tokens: 80,
          created_at: '2026-03-08T00:01:00+00:00',
          steps: [
            {
              step_id: 'planning-1',
              phase: 'planning',
              step_type: 'plan_generation',
              title: 'Generate research plan',
              status: 'completed',
              input_preview: 'Question 1 rerun',
              output_preview: '2 tasks',
              raw_text: 'secondary raw thought',
              tool_calls: [],
              token_usage: { total_tokens: 10 },
              metadata: {},
            },
          ],
        });
      }

      return Promise.resolve({
        trace_id: 'trace-1',
        campaign_id: 'cmp-1',
        campaign_result_id: 'result-1',
        question_id: 'Q1',
        question: 'Question 1',
        mode: 'agentic',
        execution_profile: 'agentic_eval_v1',
        run_number: 1,
        trace_status: 'completed',
        summary: 'Primary summary',
        step_count: 3,
        tool_call_count: 1,
        total_tokens: 120,
        created_at: '2026-03-08T00:00:00+00:00',
        steps: [
          {
            step_id: 'planning-1',
            phase: 'planning',
            step_type: 'plan_generation',
            title: 'Generate research plan',
            status: 'completed',
            input_preview: 'Question 1',
            output_preview: '3 tasks',
            raw_text: 'raw thought text',
            tool_calls: [],
            token_usage: { total_tokens: 20 },
            metadata: {},
          },
          {
            step_id: 'execution-2',
            phase: 'execution',
            step_type: 'sub_task_execution',
            title: 'Step 1',
            status: 'completed',
            input_preview: 'Subtask 1',
            output_preview: 'Answer 1',
            raw_text: null,
            tool_calls: [
              {
                index: 0,
                action: 'VERIFY_IMAGE',
                status: 'completed',
                payload: {},
                result_preview: 'Verified chart',
              },
            ],
            token_usage: { total_tokens: 50 },
            metadata: {},
          },
        ],
      });
    });

    render(
      <ChakraProvider theme={theme}>
        <AgentTraceViewer />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Available Traces')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Primary summary')).toBeInTheDocument();
    });
    expect(screen.getAllByText('profile agentic_eval_v1').length).toBeGreaterThan(0);
    expect(screen.getByText('Generate research plan')).toBeInTheDocument();
    expect(screen.getByText('VERIFY_IMAGE')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Compare With'), {
      target: { value: 'result-2' },
    });

    await waitFor(() => {
      expect(mockGetCampaignResultTrace).toHaveBeenCalledWith('cmp-1', 'result-2');
    });
    expect(screen.getByText('Secondary summary')).toBeInTheDocument();
    expect(screen.getAllByText('profile legacy_shared').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Raw Thought' })[0]);
    expect(screen.getByText('raw thought text')).toBeInTheDocument();
  });
});
