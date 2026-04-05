import type { AgentTracePhase, AgentTraceStatus } from '../../types/evaluation';

export const PHASE_LABELS: Record<AgentTracePhase, string> = {
  planning: 'Planning',
  execution: 'Execution',
  drilldown: 'Drill-down',
  evaluation: 'Evaluation',
  synthesis: 'Synthesis',
};

export function statusColor(status: AgentTraceStatus): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'partial':
      return 'yellow';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

export function phaseColor(phase: AgentTracePhase): string {
  switch (phase) {
    case 'planning':
      return 'blue';
    case 'execution':
      return 'teal';
    case 'drilldown':
      return 'orange';
    case 'evaluation':
      return 'purple';
    case 'synthesis':
      return 'pink';
    default:
      return 'gray';
  }
}

export function profileLabel(profile?: string | null): string | null {
  return profile ? `profile ${profile}` : null;
}
