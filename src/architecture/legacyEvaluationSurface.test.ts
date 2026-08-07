/// <reference types="node" />

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const retiredComponents = [
  '../components/evaluation/EvaluationResults.tsx',
  '../components/evaluation/AgentTraceViewer.tsx',
] as const;

describe('legacy evaluation surface', () => {
  it('keeps retired unmounted components out of the production tree', () => {
    for (const relativePath of retiredComponents) {
      const absolutePath = fileURLToPath(new URL(relativePath, import.meta.url));
      expect.soft(existsSync(absolutePath), `${relativePath} must stay retired`).toBe(false);
    }
  });
});
