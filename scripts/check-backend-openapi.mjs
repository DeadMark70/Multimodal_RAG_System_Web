import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const fixturePath = path.join(repoRoot, 'src', 'test', 'fixtures', 'agenticV9ApiContract.ts');
const PIN_FIELDS = ['backend_commit', 'openapi_sha256'];

export function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJson(value[key])]),
    );
  }
  return value;
}

export function semanticSha256(schema) {
  const canonical = JSON.stringify(canonicalizeJson(schema));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

class JsonNumber {
  constructor(source) {
    this.source = source;
  }
}

function compareUnicodeCodePoints(left, right) {
  const leftPoints = [...left].map((character) => character.codePointAt(0));
  const rightPoints = [...right].map((character) => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

function parseJsonPreservingNumbers(source) {
  let offset = 0;

  function fail(message) {
    throw new Error(`Invalid JSON at offset ${offset}: ${message}`);
  }

  function skipWhitespace() {
    while (/\s/.test(source[offset] ?? '')) {
      offset += 1;
    }
  }

  function parseString() {
    const start = offset;
    offset += 1;
    while (offset < source.length) {
      const character = source[offset];
      offset += 1;
      if (character === '"') {
        return JSON.parse(source.slice(start, offset));
      }
      if (character === '\\') {
        offset += 1;
      }
    }
    fail('unterminated string');
  }

  function parseNumber() {
    const match = source.slice(offset).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) {
      fail('invalid number');
    }
    offset += match[0].length;
    return new JsonNumber(match[0]);
  }

  function parseArray() {
    const values = [];
    offset += 1;
    skipWhitespace();
    if (source[offset] === ']') {
      offset += 1;
      return values;
    }
    while (offset < source.length) {
      values.push(parseValue());
      skipWhitespace();
      if (source[offset] === ']') {
        offset += 1;
        return values;
      }
      if (source[offset] !== ',') {
        fail('expected comma or closing bracket');
      }
      offset += 1;
      skipWhitespace();
    }
    fail('unterminated array');
  }

  function parseObject() {
    const entries = new Map();
    offset += 1;
    skipWhitespace();
    if (source[offset] === '}') {
      offset += 1;
      return entries;
    }
    while (offset < source.length) {
      if (source[offset] !== '"') {
        fail('expected object key');
      }
      const key = parseString();
      skipWhitespace();
      if (source[offset] !== ':') {
        fail('expected colon');
      }
      offset += 1;
      entries.set(key, parseValue());
      skipWhitespace();
      if (source[offset] === '}') {
        offset += 1;
        return entries;
      }
      if (source[offset] !== ',') {
        fail('expected comma or closing brace');
      }
      offset += 1;
      skipWhitespace();
    }
    fail('unterminated object');
  }

  function parseValue() {
    skipWhitespace();
    const character = source[offset];
    if (character === '{') return parseObject();
    if (character === '[') return parseArray();
    if (character === '"') return parseString();
    for (const [token, value] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ]) {
      if (source.startsWith(token, offset)) {
        offset += token.length;
        return value;
      }
    }
    return parseNumber();
  }

  const value = parseValue();
  skipWhitespace();
  if (offset !== source.length) {
    fail('unexpected trailing content');
  }
  return value;
}

function renderCanonicalJson(value) {
  if (value instanceof JsonNumber) {
    return value.source;
  }
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
      .map(([key, child]) => `${JSON.stringify(key)}:${renderCanonicalJson(child)}`)
      .join(',');
    return `{${entries}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(renderCanonicalJson).join(',')}]`;
  }
  return JSON.stringify(value);
}

export function semanticSha256Source(source) {
  const canonical = renderCanonicalJson(parseJsonPreservingNumbers(source));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function readJsonSource(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${filePath}`, { cause: error });
  }
  try {
    return { source, value: JSON.parse(source) };
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}`, { cause: error });
  }
}

function readJson(filePath, label) {
  return readJsonSource(filePath, label).value;
}

function validateManifest(manifest) {
  const keys =
    manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest)
      ? Object.keys(manifest).sort()
      : [];
  if (
    JSON.stringify(keys) !== JSON.stringify(['schema_version', 'sha256', 'snapshot']) ||
    manifest.schema_version !== 1 ||
    manifest.snapshot !== 'openapi.json' ||
    typeof manifest.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256)
  ) {
    throw new Error(
      'OpenAPI manifest must contain exactly schema_version=1, sha256=<64 lowercase hex>, and snapshot="openapi.json"',
    );
  }
}

export function readBackendContract(backendPath) {
  const resolvedBackend = path.resolve(backendPath);
  const schema = readJsonSource(
    path.join(resolvedBackend, 'openapi.json'),
    'Backend openapi.json',
  );
  const manifest = readJson(
    path.join(resolvedBackend, 'contracts', 'openapi-contract.json'),
    'Backend OpenAPI manifest',
  );
  validateManifest(manifest);
  const recomputed = semanticSha256Source(schema.source);
  if (manifest.sha256 !== recomputed) {
    throw new Error(
      `OpenAPI manifest sha256 ${manifest.sha256} does not match recomputed sha256 ${recomputed}`,
    );
  }

  let backendCommit;
  try {
    backendCommit = execFileSync('git', ['-C', resolvedBackend, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new Error(`Unable to read backend git revision: ${resolvedBackend}`, { cause: error });
  }
  if (!/^[a-f0-9]{40}$/.test(backendCommit)) {
    throw new Error(`Backend git revision is not a full 40-character commit: ${backendCommit}`);
  }
  return {
    backend_commit: backendCommit,
    openapi_sha256: recomputed,
    snapshot: manifest.snapshot,
  };
}

function pinPattern(field) {
  return new RegExp(`(\\b${field}\\s*:\\s*)(['\"])([a-f0-9]+)(\\2)`, 'g');
}

export function readPinnedContract(fixtureSource) {
  const result = {};
  for (const field of PIN_FIELDS) {
    const matches = [...fixtureSource.matchAll(pinPattern(field))];
    if (matches.length !== 1) {
      throw new Error(`Expected exactly one ${field} string literal in contract fixture`);
    }
    const value = matches[0][3];
    const expectedLength = field === 'backend_commit' ? 40 : 64;
    if (value.length !== expectedLength) {
      throw new Error(`${field} must be ${expectedLength} lowercase hexadecimal characters`);
    }
    result[field] = value;
  }
  return result;
}

export function replacePinnedContract(fixtureSource, contract) {
  readPinnedContract(fixtureSource);
  let updated = fixtureSource;
  for (const field of PIN_FIELDS) {
    const value = contract[field];
    const expectedLength = field === 'backend_commit' ? 40 : 64;
    if (typeof value !== 'string' || !new RegExp(`^[a-f0-9]{${expectedLength}}$`).test(value)) {
      throw new Error(`${field} must be ${expectedLength} lowercase hexadecimal characters`);
    }
    updated = updated.replace(pinPattern(field), (_match, prefix, quote) => {
      return `${prefix}${quote}${value}${quote}`;
    });
  }
  return updated;
}

export function comparePinnedContract(pinned, backend) {
  const diagnostics = [];
  for (const field of PIN_FIELDS) {
    if (pinned[field] !== backend[field]) {
      diagnostics.push(`${field}: pinned ${pinned[field]} != backend ${backend[field]}`);
    }
  }
  return diagnostics;
}

function parseArgs(argv) {
  const modeArgs = argv.filter((arg) => arg === '--check' || arg === '--write-pin');
  if (modeArgs.length !== 1) {
    throw new Error('Choose exactly one mode: --check or --write-pin');
  }
  let backendPath = path.resolve(repoRoot, '..', 'pdftopng');
  const backendIndex = argv.indexOf('--backend');
  if (backendIndex !== -1) {
    if (!argv[backendIndex + 1]) {
      throw new Error('--backend requires a path');
    }
    backendPath = path.resolve(argv[backendIndex + 1]);
  }
  const recognized = new Set([modeArgs[0], '--backend', argv[backendIndex + 1]]);
  const unknown = argv.filter((arg) => !recognized.has(arg));
  if (unknown.length) {
    throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  }
  return { mode: modeArgs[0], backendPath };
}

export function main(argv = process.argv.slice(2)) {
  const { mode, backendPath } = parseArgs(argv);
  const backend = readBackendContract(backendPath);
  const fixtureSource = readFileSync(fixturePath, 'utf8');
  if (mode === '--write-pin') {
    const updated = replacePinnedContract(fixtureSource, backend);
    if (updated !== fixtureSource) {
      writeFileSync(fixturePath, updated);
      process.stdout.write(`Updated backend contract pin: ${path.relative(repoRoot, fixturePath)}\n`);
    } else {
      process.stdout.write('Backend contract pin is already current.\n');
    }
    return 0;
  }

  const diagnostics = comparePinnedContract(readPinnedContract(fixtureSource), backend);
  if (diagnostics.length) {
    process.stderr.write(`Backend OpenAPI contract drift:\n${diagnostics.map((row) => `- ${row}`).join('\n')}\n`);
    return 1;
  }
  process.stdout.write(
    `Backend OpenAPI contract matches ${backend.backend_commit} (${backend.openapi_sha256}).\n`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
