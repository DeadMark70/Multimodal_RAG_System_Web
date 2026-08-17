import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AgenticV9RunEvidence } from '../../pages/EvaluationCenter.mappers';
import theme from '../../theme';
import AgenticV9Trace from './AgenticV9Trace';

describe('AgenticV9Trace', () => {
  it('renders the evidence qualification outcome and safe failure diagnostics', () => {
    const data: AgenticV9RunEvidence = {
      runId: 'run-1',
      schemaVersion: '1',
      queryContract: null,
      slotResolutions: undefined,
      evidencePackets: undefined,
      contextPack: undefined,
      finalClaims: undefined,
      sufficiency: undefined,
      budget: undefined,
      repairs: undefined,
      conflicts: undefined,
      metrics: {
        semantic_qualification: 'provider_failed',
        candidate_packet_count: 8,
        qualified_packet_count: 0,
        qualification_provider_call_count: 1,
        qualification_failure_code: 'provider_attempt_failed',
      },
    };

    render(
      <ChakraProvider theme={theme}>
        <AgenticV9Trace data={data} />
      </ChakraProvider>,
    );

    const section = screen.getByText('Atomic planning').parentElement;
    expect(section).not.toBeNull();
    const diagnostics = within(section as HTMLElement);
    expect(diagnostics.getByText('Semantic qualification: provider_failed')).toBeInTheDocument();
    expect(diagnostics.getByText('Qualified packets: 0 / 8')).toBeInTheDocument();
    expect(diagnostics.getByText('Qualification calls: 1')).toBeInTheDocument();
    expect(diagnostics.getByText('Qualification failure: provider_attempt_failed')).toBeInTheDocument();
  });
});
