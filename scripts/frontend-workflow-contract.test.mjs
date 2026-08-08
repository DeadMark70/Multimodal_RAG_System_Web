import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const workflowPath = path.join(
  repositoryRoot,
  '.github',
  'workflows',
  'no-external-api-test.yml',
);

function assertInOrder(source, snippets) {
  let cursor = -1;
  for (const snippet of snippets) {
    const next = source.indexOf(snippet, cursor + 1);
    assert.notEqual(next, -1, `workflow is missing: ${snippet}`);
    assert.ok(next > cursor, `workflow step is out of order: ${snippet}`);
    cursor = next;
  }
}

test('frontend workflow enforces local gates before checking the backend contract', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  const checkoutAction = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
  const setupNodeAction = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';

  assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m);
  assert.match(workflow, /^\s+timeout-minutes:\s*\d+\s*$/m);
  assert.match(
    workflow,
    new RegExp(`uses:\\s*${setupNodeAction}[\\s\\S]*node-version:\\s*["']?24["']?[\\s\\S]*cache:\\s*npm`),
  );
  assert.equal(workflow.match(new RegExp(`uses:\\s*${checkoutAction}`, 'g'))?.length, 2);

  assertInOrder(workflow, [
    `uses: ${checkoutAction}`,
    `uses: ${setupNodeAction}`,
    'run: npm ci',
    'run: npm run lint:ci',
    'run: npx tsc --noEmit',
    'run: npm run test:scripts',
    'run: npm test -- --run',
    'run: npm run build',
    'run: npm run docs:check',
    'run: npm run docs:links',
    'repository: DeadMark70/multimodal-rag-translate',
    'ref: main',
    'path: contract-backend',
    'run: npm run contract:check -- --backend contract-backend',
  ]);
});
