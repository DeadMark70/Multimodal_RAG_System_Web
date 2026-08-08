import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listNodeTests, runNodeTests } from './run-node-tests.mjs';

function makeDirectory(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-node-tests-'));
  for (const [name, source] of Object.entries(files)) {
    writeFileSync(path.join(root, name), source);
  }
  return root;
}

test('listNodeTests returns explicit top-level test files in deterministic order', () => {
  const root = makeDirectory({
    'z.test.mjs': 'export {};',
    'a.test.mjs': 'export {};',
    'helper.mjs': 'export {};',
    'almost.test.js': 'export {};',
  });

  assert.deepEqual(
    listNodeTests(root).map((filePath) => path.basename(filePath)),
    ['a.test.mjs', 'z.test.mjs'],
  );
});

test('runNodeTests propagates the Node test runner failure status', () => {
  const passing = makeDirectory({
    'pass.test.mjs': "import test from 'node:test'; test('passes', () => {});",
  });
  const failing = makeDirectory({
    'fail.test.mjs':
      "import assert from 'node:assert/strict'; import test from 'node:test'; test('fails', () => assert.equal(1, 2));",
  });

  assert.equal(runNodeTests(passing, { stdio: 'pipe' }), 0);
  assert.equal(runNodeTests(failing, { stdio: 'pipe' }), 1);
});
