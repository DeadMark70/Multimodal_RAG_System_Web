import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(scriptPath);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function listNodeTests(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map((entry) => path.resolve(directory, entry.name))
    .sort(compareText);
}

export function runNodeTests(directory, { stdio = 'inherit' } = {}) {
  const testPaths = listNodeTests(directory);
  if (!testPaths.length) {
    throw new Error(`No .test.mjs files found in ${path.resolve(directory)}`);
  }
  const explicitPaths = testPaths.map((filePath) => path.relative(directory, filePath));
  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', ...explicitPaths], {
    cwd: directory,
    env: childEnvironment,
    stdio,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length) {
    throw new Error('run-node-tests does not accept arguments');
  }
  return runNodeTests(scriptsDirectory);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
