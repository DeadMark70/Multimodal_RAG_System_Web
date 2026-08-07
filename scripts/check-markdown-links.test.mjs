import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  extractLocalLinks,
  findBrokenLinks,
  resolveLocalLink,
  walkMarkdown,
} from './check-markdown-links.mjs';

function makeRepo(files, tracked = Object.keys(files)) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-markdown-links-'));
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: root });
  if (tracked.length) {
    execFileSync('git', ['add', '--', ...tracked], { cwd: root });
  }
  return root;
}

test('extractLocalLinks skips fences, images, external URLs, mail, file URIs, and bare anchors', () => {
  const markdown = `
[relative](docs/guide.md#setup)
[root](/README.md)
![image](assets/diagram.png)
[web](https://example.com)
[mail](mailto:team@example.com)
[local file](file:///d:/workspace/note.md)
[anchor](#section)
\`\`\`
[fenced](missing.md)
\`\`\`
`;
  assert.deepEqual(extractLocalLinks(markdown), ['docs/guide.md#setup', '/README.md']);
});

test('resolveLocalLink handles relative, repository-root, anchors, and escaped spaces', () => {
  const root = makeRepo({
    'README.md': '# Root',
    'docs/source.md': '[guide](guide%20one.md#intro)',
    'docs/guide one.md': '# Guide',
  });
  const source = path.join(root, 'docs', 'source.md');
  assert.equal(resolveLocalLink(source, 'guide%20one.md#intro', root), path.join(root, 'docs', 'guide one.md'));
  assert.equal(resolveLocalLink(source, '/README.md', root), path.join(root, 'README.md'));
  assert.throws(() => resolveLocalLink(source, '../../outside.md', root), /escapes repository/i);
});

test('walkMarkdown returns only tracked Markdown outside ignored build directories', () => {
  const root = makeRepo(
    {
      'README.md': '# tracked',
      'docs/guide.md': '# tracked',
      'draft.md': '# untracked',
      'dist/generated.md': '# ignored',
      'node_modules/pkg/readme.md': '# ignored',
    },
    ['README.md', 'docs/guide.md', 'dist/generated.md', 'node_modules/pkg/readme.md'],
  );
  assert.deepEqual(
    walkMarkdown(root).map((file) => path.relative(root, file).replaceAll('\\', '/')),
    ['README.md', 'docs/guide.md'],
  );
});

test('findBrokenLinks reports missing files and repository escapes in sorted order', () => {
  const root = makeRepo({
    'README.md': '[missing](z-missing.md)\n[escape](../outside.md)\n[valid](docs/guide.md)',
    'docs/guide.md': '# Guide',
  });
  assert.deepEqual(findBrokenLinks(root), [
    'README.md: ../outside.md (target escapes repository)',
    'README.md: z-missing.md',
  ]);
});

test('findBrokenLinks leaves the explicitly documented sibling backend lifecycle link to its owning repository', () => {
  const root = makeRepo({
    'docs/exec-plans/completed/index.md':
      '[Backend repository — completed plan](../../../../pdftopng/docs/exec-plans/completed/plan.md)',
  });
  assert.deepEqual(findBrokenLinks(root), []);
});

test('real execution-plan indexes keep the cross-repository performance plan under completed', () => {
  const repositoryRoot = path.resolve(import.meta.dirname, '..');
  const activeIndex = readFileSync(
    path.join(repositoryRoot, 'docs', 'exec-plans', 'active', 'index.md'),
    'utf8',
  );
  const completedIndex = readFileSync(
    path.join(repositoryRoot, 'docs', 'exec-plans', 'completed', 'index.md'),
    'utf8',
  );
  const planName = '2026-07-evaluation-chat-loading-performance.md';
  const completedTarget = `../../../../pdftopng/docs/exec-plans/completed/${planName}`;

  assert.doesNotMatch(activeIndex, new RegExp(planName.replaceAll('.', '\\.')));
  assert.match(completedIndex, new RegExp(completedTarget.replaceAll('.', '\\.')));
  assert.match(completedIndex, /Backend repository[^\n]*completed plan/i);
});
