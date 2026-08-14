import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import RunTraceTab from './RunTraceTab';
import RunTraceTree from './RunTraceTree';

const traceEvents = [
  {
    eventId: 'evt-1',
    sequence: 1,
    stageName: 'Routing',
    status: 'success',
    startedAt: '2026-07-08T12:00:00Z',
    durationMs: 120,
    tokenCount: 300,
    costUsd: 0.002,
    payload: { selectedMode: 'agentic' },
  },
  {
    eventId: 'evt-2',
    sequence: 2,
    stageName: 'Retrieval',
    status: 'success',
    startedAt: '2026-07-08T12:00:01Z',
    durationMs: 940,
    tokenCount: 0,
    costUsd: 0,
    payload: { chunks: 8 },
  },
  {
    eventId: 'evt-3',
    sequence: 3,
    stageName: 'Generation',
    status: 'success',
    startedAt: '2026-07-08T12:00:02Z',
    durationMs: 2440,
    tokenCount: 4200,
    costUsd: 0.09,
    payload: { answerLength: 312 },
  },
  {
    eventId: 'evt-4',
    sequence: 4,
    stageName: 'Claim Verification',
    status: 'partial',
    startedAt: '2026-07-08T12:00:05Z',
    durationMs: 610,
    tokenCount: 1200,
    costUsd: 0.03,
    error: { code: 'citation_mismatch', message: '2 claims unsupported' },
    payload: { unsupportedClaims: 2 },
  },
  {
    eventId: 'evt-5',
    sequence: 5,
    stageName: 'Evaluation',
    status: 'success',
    startedAt: '2026-07-08T12:00:06Z',
    durationMs: 300,
    tokenCount: 200,
    costUsd: 0.01,
    payload: { correctness: 0.84 },
  },
];

const legacySteps = [
  {
    stepId: 'legacy-1',
    phase: 'planning',
    title: 'Plan subtasks',
    status: 'completed',
    durationMs: 180,
  },
  {
    stepId: 'legacy-2',
    phase: 'execution',
    title: 'Synthesize answer',
    status: 'completed',
    durationMs: 640,
  },
];

const runOptions = [
  { runId: 'run-1', campaignId: 'cmp-1', questionId: 'Q-17', mode: 'agentic', repeat: 1 },
  { runId: 'run-2', campaignId: 'cmp-1', questionId: 'Q-17', mode: 'naive', repeat: 1 },
];

const agenticV9Evidence = {
  runId: 'run-v9',
  schemaVersion: '1',
  queryContract: {
    contract_version: '1',
    route: 'bounded_compare' as const,
    intent: 'Compare segmentation models with evidence.',
    required_slots: [{ slot_id: 'dice', description: 'Dice score', required: true }],
    resolved_source_scope: { authorized_doc_ids: ['doc-authorized'] },
    max_retrieval_rounds: 2,
    max_repair_rounds: 1,
  },
  slotResolutions: [{
    slot_id: 'dice',
    resolution_stage: 'final',
    resolution: { slot_id: 'dice', status: 'supported' as const, evidence_ids: ['ev-1'] },
  }],
  evidencePackets: [{
    evidence_id: 'ev-1',
    packet: {
      schema_version: '1',
      evidence_id: 'ev-1',
      task_id: 'task-1',
      round_id: 'round-1',
      query_id: 'query-1',
      slot_ids: ['dice'],
      statement: 'Raw-only evidence payload.',
      support_type: 'direct' as const,
      source: { doc_id: 'doc-authorized' },
      scope: {},
      locator: {},
    },
  }],
  contextPack: { packedEvidenceIds: ['ev-1'], droppedEvidenceIds: ['ev-2'], tokenCount: 512 },
  finalClaims: [{
    claimId: 'claim-1',
    statement: 'The evidence supports the comparison.',
    supportType: 'direct' as const,
    evidenceIds: ['ev-1'],
    premiseEvidenceIds: [],
    qualifiedReason: null,
  }],
  sufficiency: {
    evidence_complete: true,
    answerable: true,
    response_status: 'complete' as const,
    supported_slot_ids: ['dice'],
  },
  budget: [{
    reservation_id: 'reserve-1',
    phase: 'retrieval',
    estimated_input_tokens: 800,
    reserved_output_tokens: 4096,
  }],
  repairs: [{
    repair_round_index: 1,
    tasks: [{
      task_id: 'repair-1',
      round_id: 'round-1',
      query_id: 'query-1',
      query: 'find Dice comparison',
      target_slot_ids: ['dice'],
      source_scope: { authorized_doc_ids: ['doc-authorized'] },
    }],
  }],
  conflicts: [],
  metrics: {
    provider_attempt_count: 3,
    final_generation_count: 1,
    prose_curator_call_count: 1,
    reserved_tokens: 4096,
    reconciled_tokens: 3840,
  },
};

const activeAtomicEvidence = {
  ...agenticV9Evidence,
  schemaVersion: '1',
  queryContract: {
    ...agenticV9Evidence.queryContract,
    contract_version: '2',
    required_slots: [
      { slot_id: 'S1', description: 'Report A value', required: true },
      { slot_id: 'S2', description: 'Report B value', required: true },
    ],
    synthesis_obligations: [{
      obligation_id: 'O1',
      kind: 'comparison' as const,
      description: 'Compare the reported values.',
      depends_on_slot_ids: ['S1', 'S2'],
    }],
    response_constraints: [{
      constraint_id: 'C1',
      kind: 'prohibition' as const,
      description: 'Do not claim a universal ranking.',
    }],
    slot_plan_status: 'complete' as const,
    slot_plan_source: 'llm_planner' as const,
    slot_plan_confidence: 'medium' as const,
    slot_plan_fallback_reason: null,
    truncated_requirement_count: 0,
  },
  metrics: {
    ...agenticV9Evidence.metrics,
    atomic_planner_call_count: 1,
    comparison_planner_call_count: 0 as const,
    slot_binding_method: 'task_target_inherited' as const,
    semantic_qualification: 'not_enabled' as const,
  },
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RunTraceTab', () => {
  it('renders chronological trace events, durations, payload drawer, and error drawer', () => {
    const onSelectedRunIdChange = vi.fn();
    renderWithTheme(
      <RunTraceTab
        runOptions={runOptions}
        selectedRunId="run-1"
        metadata={{
          questionId: 'Q-17',
          mode: 'agentic',
          repeat: 1,
          finalAnswerPreview: 'Final answer preview',
          retrievalSummary: '8 chunks packed into 3 context blocks',
          claimsSummary: '2 unsupported claims remain',
          totalTokens: 5700,
          accountingStatus: 'complete',
          accountingDiagnostics: {
            input_tokens: 1000,
            output_text_tokens: 2000,
            reasoning_tokens: 2700,
            other_tokens: 0,
            total_tokens: 5700,
            by_phase: {},
            accounting_status: 'complete',
            phase_attribution_status: 'complete',
          },
        }}
        onSelectedRunIdChange={onSelectedRunIdChange}
        traceEvents={traceEvents}
      />
    );

    expect(screen.getAllByText('Routing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Retrieval').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Generation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Claim Verification').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Evaluation').length).toBeGreaterThan(0);
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('2,440 ms')).toBeInTheDocument();
    expect(screen.getByText('5,700')).toBeInTheDocument();
    expect(screen.getByText('Phase attribution: complete')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Run selector' }), { target: { value: 'run-2' } });
    expect(onSelectedRunIdChange).toHaveBeenCalledWith('run-2');

    fireEvent.click(screen.getAllByRole('button', { name: 'Payload' })[0]);
    expect(screen.getByText(/selectedMode/)).toBeInTheDocument();
    expect(screen.getAllByText(/agentic/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText(/citation_mismatch/)).toBeInTheDocument();
  });

  it('renders compatibility tree when only legacy steps exist', () => {
    renderWithTheme(<RunTraceTab legacySteps={legacySteps} />);

    expect(screen.getByText('legacy trace')).toBeInTheDocument();
    expect(screen.getByText('Plan subtasks')).toBeInTheDocument();
    expect(screen.getByText('Synthesize answer')).toBeInTheDocument();
  });

  it('renders a zero-duration legacy step as 0 ms', () => {
    renderWithTheme(
      <RunTraceTab legacySteps={[{
        stepId: 'legacy-zero-duration',
        phase: 'planning',
        title: 'Instant legacy step',
        status: 'completed',
        durationMs: 0,
      }]} />,
    );

    const zeroDurationRow = screen.getByText('Instant legacy step').closest('.chakra-stack');
    expect(zeroDurationRow).not.toBeNull();
    expect(within(zeroDurationRow as HTMLElement).getByText('1. planning - completed - 0 ms')).toBeInTheDocument();
  });

  it('clears expanded trace disclosure when the selected run ID changes', () => {
    const lifecycle = [
      { ...traceEvents[0], eventId: 'run-1-running', spanId: 'span-1', status: 'running' },
      { ...traceEvents[0], eventId: 'run-1-success', spanId: 'span-1', status: 'success', sequence: 2 },
    ];
    const rendered = renderWithTheme(
      <RunTraceTab selectedRunId="run-1" traceEvents={lifecycle} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show lifecycle (2)' }));
    expect(screen.getByRole('button', { name: 'Hide lifecycle' })).toBeInTheDocument();

    rendered.rerender(
      <ChakraProvider theme={theme}>
        <RunTraceTab selectedRunId="run-2" traceEvents={lifecycle} />
      </ChakraProvider>,
    );

    expect(screen.getByRole('button', { name: 'Show lifecycle (2)' })).toBeInTheDocument();
  });

  it('renders the selected typed v9 evidence-first trace without inventing timeout or monetary data', () => {
    const evidenceWithNestedPrompt = {
      ...agenticV9Evidence,
      promptCapture: {
        hashAvailability: 'captured',
        previewAvailability: 'captured',
        fullPromptAvailability: 'captured',
      },
      nestedDiagnostic: {
        full_prompt: 'FULL_PROMPT_SECRET_SENTINEL',
        deeper: { fullPrompt: 'FULL_PROMPT_SECRET_SENTINEL' },
      },
    } as unknown as typeof agenticV9Evidence;
    renderWithTheme(
      <RunTraceTab
        selectedRunId="run-v9"
        traceEvents={traceEvents}
        agenticV9Evidence={evidenceWithNestedPrompt}
      />,
    );

    expect(screen.getByText('Evidence-first execution trace')).toBeInTheDocument();
    expect(screen.getByText('Contract & route')).toBeInTheDocument();
    expect(screen.getByText(/Route: bounded_compare/)).toBeInTheDocument();
    expect(screen.getByText('Authorized source scope')).toBeInTheDocument();
    expect(screen.getByText('doc-authorized')).toBeInTheDocument();
    expect(screen.getByText('Required slots')).toBeInTheDocument();
    expect(screen.getByText(/dice.*supported/)).toBeInTheDocument();
    expect(screen.getByText('Retrieval & repair')).toBeInTheDocument();
    expect(screen.getByText(/Repair rounds: 1/)).toBeInTheDocument();
    expect(screen.getByText('Final prose batch')).toBeInTheDocument();
    expect(screen.getByText('Sufficiency, conflicts & context pack')).toBeInTheDocument();
    expect(screen.getByText('Final answer & verification')).toBeInTheDocument();
    expect(screen.getByText(/Provider attempts: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Reserved tokens: 4,096/)).toBeInTheDocument();
    expect(screen.getByText(/Reconciled tokens: 3,840/)).toBeInTheDocument();
    expect(screen.getByText(/Cancellation \/ timeout: N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Final generations: 1/)).toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();

    expect(screen.queryByText(/Raw-only evidence payload/)).not.toBeInTheDocument();
    expect(screen.queryByText('FULL_PROMPT_SECRET_SENTINEL')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show raw v9 trace' }));
    expect(screen.getByText(/Raw-only evidence payload/)).toBeInTheDocument();
    expect(screen.queryByText('FULL_PROMPT_SECRET_SENTINEL')).not.toBeInTheDocument();
  });

  it('renders active atomic planning provenance, counts, and honest instrumentation limits', () => {
    renderWithTheme(
      <RunTraceTab selectedRunId="run-v9" agenticV9Evidence={activeAtomicEvidence} />,
    );

    const section = screen.getByText('Atomic planning').parentElement;
    expect(section).not.toBeNull();
    const atomicPlanning = within(section as HTMLElement);
    expect(atomicPlanning.getByText(/Source: llm_planner/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Status: complete/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Evidence requirements: 2/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Synthesis obligations: 1/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Response constraints: 1/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Atomic planner calls: 1/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Independent comparison planner calls: 0/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Binding method: task_target_inherited/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Semantic qualification: not_enabled/)).toBeInTheDocument();
    expect(atomicPlanning.getByText('Compare the reported values.')).toBeInTheDocument();
    expect(atomicPlanning.getByText('Do not claim a universal ranking.')).toBeInTheDocument();
  });

  it('renders historical v1 atomic planning fields as N/A instead of inferred zero or complete', () => {
    renderWithTheme(
      <RunTraceTab selectedRunId="run-v9" agenticV9Evidence={agenticV9Evidence} />,
    );

    const section = screen.getByText('Atomic planning').parentElement;
    expect(section).not.toBeNull();
    const atomicPlanning = within(section as HTMLElement);
    expect(atomicPlanning.getByText(/Status: N\/A/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Source: N\/A/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Atomic planner calls: N\/A/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Independent comparison planner calls: N\/A/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Binding method: N\/A/)).toBeInTheDocument();
    expect(atomicPlanning.getByText(/Semantic qualification: N\/A/)).toBeInTheDocument();
  });
});

describe('RunTraceTree', () => {
  it('renders a compact trace tree without monetary fallbacks', () => {
    renderWithTheme(<RunTraceTree events={traceEvents} />);

    expect(screen.getByText('Sequence')).toBeInTheDocument();
    expect(screen.queryByText('Tokens')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.090')).not.toBeInTheDocument();
  });

  it('folds running and terminal rows for one span until requested', () => {
    renderWithTheme(
      <RunTraceTree
        events={[
          { ...traceEvents[0], eventId: 'evt-running', spanId: 'span-1', status: 'running' },
          { ...traceEvents[0], eventId: 'evt-success', spanId: 'span-1', status: 'success', sequence: 2 },
        ]}
      />
    );

    expect(screen.getAllByText('Routing')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show lifecycle (2)' }));
    expect(screen.getAllByText(/Routing/)).toHaveLength(2);
    expect(screen.getByText('running')).toBeInTheDocument();
  });
});
