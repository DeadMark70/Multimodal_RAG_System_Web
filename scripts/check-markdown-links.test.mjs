import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  extractLocalLinks,
  findBrokenLinks,
  resolveLocalLink,
  walkMarkdown,
} from './check-markdown-links.mjs';

function makeRepo(files, tracked = Object.keys(files)) {
  const workspace = mkdtempSync(path.join(tmpdir(), 'frontend-markdown-links-'));
  const root = path.join(workspace, 'Multimodal_RAG_System');
  mkdirSync(root, { recursive: true });
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

function writeSiblingBackendFile(root, relativePath, contents = '# Backend documentation') {
  const filePath = path.join(path.dirname(root), 'pdftopng', relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

test('extractLocalLinks skips only fences, images, HTTP(S), mail, and bare anchors', () => {
  const markdown = `
[relative](docs/guide.md#setup)
[root](/README.md)
![image](assets/diagram.png)
[web](https://example.com)
[mail](mailto:team@example.com)
[local file](file:///d:/workspace/note.md)
[windows drive](D:/workspace/note.md)
[anchor](#section)
\`\`\`
[fenced](missing.md)
\`\`\`
`;
  assert.deepEqual(extractLocalLinks(markdown), [
    'docs/guide.md#setup',
    '/README.md',
    'file:///d:/workspace/note.md',
    'D:/workspace/note.md',
  ]);
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

test('resolveLocalLink validates file URLs and Windows drive paths against the repository boundary', () => {
  const root = makeRepo({
    'docs/source.md': '# Source',
    'docs/guide.md': '# Guide',
  });
  const source = path.join(root, 'docs', 'source.md');
  const insideFileUrl = pathToFileURL(path.join(root, 'docs', 'guide.md')).href;
  const outsideFileUrl = pathToFileURL(path.join(path.dirname(root), 'outside.md')).href;

  assert.equal(resolveLocalLink(source, insideFileUrl, root), path.join(root, 'docs', 'guide.md'));
  assert.throws(() => resolveLocalLink(source, outsideFileUrl, root), /escapes repository/i);
  assert.equal(
    resolveLocalLink('D:\\repo\\docs\\source.md', 'D:\\repo\\guide.md', 'D:\\repo'),
    'D:\\repo\\guide.md',
  );
  assert.throws(
    () => resolveLocalLink('D:\\repo\\docs\\source.md', 'E:\\outside.md', 'D:\\repo'),
    /escapes repository/i,
  );
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
      '[Backend repository — completed plan](../../../../pdftopng/docs/exec-plans/completed/2026-07-evaluation-chat-loading-performance.md)',
  });
  assert.deepEqual(findBrokenLinks(root), []);
});

test('findBrokenLinks validates the exact sibling backend API target exists', () => {
  const root = makeRepo({
    'agentlog/frontend_evaluation_migration_guide.md':
      '[API 文件](../../pdftopng/agentlog/api_documentation.md)',
  });

  assert.deepEqual(findBrokenLinks(root), [
    'agentlog/frontend_evaluation_migration_guide.md: ../../pdftopng/agentlog/api_documentation.md',
  ]);
});

test('findBrokenLinks accepts the exact sibling backend API target when it exists', () => {
  const root = makeRepo({
    'agentlog/frontend_evaluation_migration_guide.md':
      '[API 文件](../../pdftopng/agentlog/api_documentation.md)',
  });
  writeSiblingBackendFile(root, 'agentlog/api_documentation.md');

  assert.deepEqual(findBrokenLinks(root), []);
});

test('findBrokenLinks rejects a typo near the approved sibling backend API target', () => {
  const root = makeRepo({
    'agentlog/frontend_evaluation_migration_guide.md':
      '[API 文件](../../pdftopng/agentlog/api_documentation.mdx)',
  });
  writeSiblingBackendFile(root, 'agentlog/api_documentation.md');

  assert.deepEqual(findBrokenLinks(root), [
    'agentlog/frontend_evaluation_migration_guide.md: ../../pdftopng/agentlog/api_documentation.mdx (target escapes repository)',
  ]);
});

test('findBrokenLinks rejects a typo near the one approved sibling backend lifecycle target', () => {
  const root = makeRepo({
    'docs/exec-plans/completed/index.md':
      '[Backend repository — completed plan](../../../../pdftopng/docs/exec-plans/completed/2026-07-evaluation-chat-loading-performanc.md)',
  });

  assert.deepEqual(findBrokenLinks(root), [
    'docs/exec-plans/completed/index.md: ../../../../pdftopng/docs/exec-plans/completed/2026-07-evaluation-chat-loading-performanc.md (target escapes repository)',
  ]);
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

test('real migration guide exposes the backend API documentation link to validation', () => {
  const repositoryRoot = path.resolve(import.meta.dirname, '..');
  const guide = readFileSync(
    path.join(repositoryRoot, 'agentlog', 'frontend_evaluation_migration_guide.md'),
    'utf8',
  );

  assert.ok(
    extractLocalLinks(guide).includes('../../pdftopng/agentlog/api_documentation.md'),
  );
});
