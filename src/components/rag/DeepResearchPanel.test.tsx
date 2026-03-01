import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DeepResearchPanel from './DeepResearchPanel';
import type { ReactNode } from 'react';
import type { UseDeepResearchReturn } from '../../hooks/useDeepResearch';
import type { ExecutePlanResponse, ResearchPlanResponse } from '../../types/rag';

// Mock hook
vi.mock('../../hooks/useDeepResearch', () => ({
  useDeepResearch: vi.fn(),
}));

// Mock UI components
vi.mock('react-markdown', () => ({ default: ({ children }: { children?: ReactNode }) => <div>{children}</div> }));
vi.mock('rehype-sanitize', () => ({ default: () => {} }));

describe('DeepResearchPanel UI Integration', () => {
  const mockGeneratePlan = vi.fn(() => Promise.resolve());
  const mockExecutePlan = vi.fn(() => Promise.resolve());
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores plan state from loaded data', () => {
    const mockPlan: ResearchPlanResponse = {
      status: 'waiting_confirmation',
      original_question: 'Loaded Question',
      sub_tasks: [
        { id: 1, question: 'Task 1', task_type: 'rag', enabled: true },
      ],
      estimated_complexity: 'simple',
      doc_ids: null,
    };

    const mockState: UseDeepResearchReturn = {
      plan: mockPlan,
      isPlanning: false,
      isExecuting: false,
      progress: [],
      result: null,
      error: null,
      currentPhase: 'planning',
      generatePlan: mockGeneratePlan,
      executePlan: mockExecutePlan,
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      deleteTask: vi.fn(),
      cancelExecution: vi.fn(),
      reset: vi.fn(),
    };

    render(<DeepResearchPanel researchState={mockState} />);

    // Verify loaded plan is visible
    expect(screen.getByText('原始問題：Loaded Question')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('簡單')).toBeInTheDocument();
  });

  it('restores result state from loaded data', () => {
    const mockResult: ExecutePlanResponse = {
      question: 'Q',
      summary: 'Loaded Summary',
      detailed_answer: 'Loaded Detailed Answer',
      sub_tasks: [],
      all_sources: ['doc1.pdf'],
      confidence: 0.95,
      total_iterations: 1,
    };

    const mockState: UseDeepResearchReturn = {
      plan: {
        status: 'waiting_confirmation',
        original_question: 'Q',
        sub_tasks: [],
        estimated_complexity: 'simple',
        doc_ids: null,
      },
      isPlanning: false,
      isExecuting: false,
      progress: [],
      result: mockResult,
      error: null,
      currentPhase: 'complete',
      generatePlan: vi.fn(() => Promise.resolve()),
      executePlan: vi.fn(() => Promise.resolve()),
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      deleteTask: vi.fn(),
      cancelExecution: vi.fn(),
      reset: vi.fn(),
    };

    render(<DeepResearchPanel researchState={mockState} />);

    // Verify loaded result is visible
    expect(screen.getByText('Loaded Summary')).toBeInTheDocument();
    expect(screen.getByText('Loaded Detailed Answer')).toBeInTheDocument();
    expect(screen.getByText('信心度 95%')).toBeInTheDocument();
  });
});
