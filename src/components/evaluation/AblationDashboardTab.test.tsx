import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import AblationDashboardTab from './AblationDashboardTab';

const dashboardData: NonNullable<Parameters<typeof AblationDashboardTab>[0]['data']> = {
  ablation: {
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 4,
    independent_question_count: 1,
    repeat_count: 2,
    sample_note: 'n = 4 execution samples',
    warnings: [],
    rows: [],
    summaries: {
      condition_counts: {
        text_only: 2,
        visual_verifier: 2,
      },
      condition_labels: {
        text_only: 'Text only',
        visual_verifier: 'Visual + verifier',
      },
    },
  },
  humanVsAuto: {
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 1,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 1 execution samples',
    warnings: ['Correlation summaries require at least 2 paired samples.'],
    rows: [{ run_id: 'run-1' }],
    summaries: {
      human_correctness_mean: 0.91,
      human_faithfulness_mean: 0.82,
      ragas_human_pearson_r: null,
    },
  },
  humanQueue: {
    campaign_id: 'cmp-1',
    rows: [
      {
        run_id: 'run-1',
        campaign_id: 'cmp-1',
        question_id: 'Q1',
        question: 'What supports the answer?',
        mode: 'agentic',
        run_number: 1,
        answer_preview: 'Grounded answer',
        existing_rating_count: 1,
        already_rated_by_current_user: true,
      },
    ],
  },
  errors: {
    campaign_id: 'cmp-1',
    rows: [
      {
        run_id: 'run-1',
        campaign_id: 'cmp-1',
        stage_name: 'answer_generation',
        code: 'LLM_CALL_FAILED',
        message: 'Provider error details were redacted.',
        source: 'llm_call',
        created_at: '2026-07-08T00:00:00Z',
      },
    ],
  },
  exportPreview: {
    campaign: { id: 'cmp-1' },
    redaction: { include_full_prompts: false },
    runs: [{ run_id: 'run-1' }, { run_id: 'run-2' }],
    llm_calls: [{ llm_call_id: 'call-1' }],
  },
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('AblationDashboardTab', () => {
  it('renders ablation, human calibration, export, and debug surfaces', () => {
    renderWithTheme(<AblationDashboardTab data={dashboardData} />);

    expect(screen.getByText('Ablation Conditions')).toBeInTheDocument();
    expect(screen.getByText('Graph Ablation Families')).toBeInTheDocument();
    expect(screen.getByText('text_only')).toBeInTheDocument();
    expect(screen.getByText('Visual + verifier')).toBeInTheDocument();
    expect(screen.getByText('Human Calibration')).toBeInTheDocument();
    expect(screen.getAllByText('run-1').length).toBeGreaterThan(0);
    expect(screen.getByText('rated')).toBeInTheDocument();
    expect(screen.getByText('Export Controls')).toBeInTheDocument();
    expect(screen.getByText('full prompts redacted')).toBeInTheDocument();
    expect(screen.getByText('Preview: 2 runs, 1 LLM calls')).toBeInTheDocument();
    expect(screen.getByText('Sanitized Errors')).toBeInTheDocument();
    expect(screen.getByText('Provider error details were redacted.')).toBeInTheDocument();
  });

  it('allows export redaction options to be toggled locally', () => {
    renderWithTheme(<AblationDashboardTab data={dashboardData} />);

    const fullPrompts = screen.getByRole('checkbox', { name: 'Full prompts' });
    expect(fullPrompts).not.toBeChecked();
    fireEvent.click(fullPrompts);
    expect(fullPrompts).toBeChecked();
  });
});
