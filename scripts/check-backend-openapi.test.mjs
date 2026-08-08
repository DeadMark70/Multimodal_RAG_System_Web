import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  canonicalizeJson,
  comparePinnedContract,
  readBackendContract,
  readPinnedContract,
  replacePinnedContract,
  semanticSha256,
} from './check-backend-openapi.mjs';

function makeBackend({
  schema = { paths: { '/z': {} }, info: { title: 'API' } },
  manifest,
  trackArtifacts = true,
} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-openapi-check-'));
  mkdirSync(path.join(root, 'contracts'));
  const schemaSource = `${JSON.stringify(schema, null, 2)}\n`;
  writeFileSync(path.join(root, 'openapi.json'), schemaSource);
  const sha256 = semanticSha256(schemaSource);
  writeFileSync(
    path.join(root, 'contracts', 'openapi-contract.json'),
    `${JSON.stringify(manifest ?? { schema_version: 1, sha256, snapshot: 'openapi.json' }, null, 2)}\n`,
  );
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Contract Tests'], { cwd: root });
  if (trackArtifacts) {
    execFileSync('git', ['add', 'openapi.json', 'contracts/openapi-contract.json'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  } else {
    execFileSync('git', ['commit', '--allow-empty', '-qm', 'fixture'], { cwd: root });
  }
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, sha256, commit };
}

test('canonicalizeJson recursively sorts object keys and preserves array order', () => {
  assert.deepEqual(
    canonicalizeJson({ z: 1, nested: { beta: 2, alpha: 1 }, rows: [{ z: 2, a: 1 }, 'last'] }),
    { nested: { alpha: 1, beta: 2 }, rows: [{ a: 1, z: 2 }, 'last'], z: 1 },
  );
});

test('semanticSha256 ignores JSON formatting and object key order', () => {
  const compact = '{"paths":{"/b":{},"/a":{}},"openapi":"3.1.0"}';
  const formatted = `{
    "openapi": "3.1.0",
    "paths": { "/a": {}, "/b": {} }
  }`;
  assert.equal(semanticSha256(compact), semanticSha256(formatted));
  assert.match(semanticSha256(compact), /^[a-f0-9]{64}$/);
});

test('semanticSha256 matches Python canonical JSON for floats, exponents, and non-BMP key order', () => {
  const source = `{
    "𐀀": "astral",
    "negative_zero": -0.0,
    "float": 1.0,
    "": "bmp",
    "exponent": 1e-07
  }`;
  const pythonCanonical =
    '{"exponent":1e-07,"float":1.0,"negative_zero":-0.0,"":"bmp","𐀀":"astral"}';
  const expected = createHash('sha256').update(pythonCanonical, 'utf8').digest('hex');

  assert.equal(semanticSha256(source), expected);
});

test('readBackendContract validates the manifest and returns the checked-out revision', () => {
  const backend = makeBackend();
  assert.deepEqual(readBackendContract(backend.root), {
    backend_commit: backend.commit,
    openapi_sha256: backend.sha256,
    snapshot: 'openapi.json',
  });
});

test('readBackendContract rejects malformed or semantically mismatched manifests', () => {
  const invalid = makeBackend({
    manifest: { schema_version: 2, sha256: 'x', snapshot: 'elsewhere.json', extra: true },
  });
  assert.throws(() => readBackendContract(invalid.root), /manifest/i);

  const mismatched = makeBackend({
    manifest: { schema_version: 1, sha256: '0'.repeat(64), snapshot: 'openapi.json' },
  });
  assert.throws(() => readBackendContract(mismatched.root), /sha256.*recomputed|recomputed.*sha256/i);
});

test('readBackendContract reports missing backend artifacts', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-openapi-missing-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Contract Tests'], { cwd: root });
  execFileSync('git', ['commit', '--allow-empty', '-qm', 'fixture'], { cwd: root });
  assert.throws(() => readBackendContract(root), /openapi\.json/i);
});

test('readBackendContract rejects dirty tracked contract artifacts', () => {
  const dirtySchema = makeBackend();
  writeFileSync(
    path.join(dirtySchema.root, 'openapi.json'),
    '{"info":{"title":"API"},"paths":{"/z":{}}}\n',
  );
  assert.throws(
    () => readBackendContract(dirtySchema.root),
    /(?:openapi\.json.*HEAD|HEAD.*openapi\.json|clean|dirty)/i,
  );

  const dirtyManifest = makeBackend();
  const manifestPath = path.join(dirtyManifest.root, 'contracts', 'openapi-contract.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(
    () => readBackendContract(dirtyManifest.root),
    /(?:openapi-contract\.json.*HEAD|HEAD.*openapi-contract\.json|clean|dirty)/i,
  );
});

test('readBackendContract rejects untracked contract artifacts', () => {
  const backend = makeBackend({ trackArtifacts: false });

  assert.throws(
    () => readBackendContract(backend.root),
    /openapi\.json.*tracked|openapi\.json.*HEAD|contract artifact/i,
  );
});

test('readPinnedContract extracts the two reviewed pin fields', () => {
  const source = `export const PIN = {
    backend_commit: '${'a'.repeat(40)}',
    openapi_sha256: "${'b'.repeat(64)}",
  };`;
  assert.deepEqual(readPinnedContract(source), {
    backend_commit: 'a'.repeat(40),
    openapi_sha256: 'b'.repeat(64),
  });
  assert.throws(() => readPinnedContract('export const PIN = {};'), /backend_commit/i);
});

test('replacePinnedContract changes only the two pin string literals', () => {
  const source = `const note = 'keep';
export const PIN = {
  backend_commit: '${'a'.repeat(40)}',
  openapi_sha256: "${'b'.repeat(64)}",
  frontend_baseline_commit: '${'c'.repeat(40)}',
};\n`;
  const updated = replacePinnedContract(source, {
    backend_commit: 'd'.repeat(40),
    openapi_sha256: 'e'.repeat(64),
  });
  assert.equal(
    updated,
    source
      .replace('a'.repeat(40), 'd'.repeat(40))
      .replace('b'.repeat(64), 'e'.repeat(64)),
  );
});

test('comparePinnedContract reports hash and revision drift together', () => {
  assert.deepEqual(
    comparePinnedContract(
      { backend_commit: 'a'.repeat(40), openapi_sha256: 'b'.repeat(64) },
      { backend_commit: 'c'.repeat(40), openapi_sha256: 'd'.repeat(64), snapshot: 'openapi.json' },
    ),
    [
      `backend_commit: pinned ${'a'.repeat(40)} != backend ${'c'.repeat(40)}`,
      `openapi_sha256: pinned ${'b'.repeat(64)} != backend ${'d'.repeat(64)}`,
    ],
  );
});
