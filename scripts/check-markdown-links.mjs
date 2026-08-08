import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  'coverage',
  'build',
  'out',
]);
const APPROVED_SIBLING_BACKEND_LINK = {
  source: 'docs/exec-plans/completed/index.md',
  target:
    '../../../../pdftopng/docs/exec-plans/completed/2026-07-evaluation-chat-loading-performance.md',
};
const VALIDATED_SIBLING_BACKEND_LINK = {
  source: 'agentlog/frontend_evaluation_migration_guide.md',
  target: '../../pdftopng/agentlog/api_documentation.md',
};

function normalizeGitPath(value) {
  return value.replaceAll('\\', '/');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isIgnored(relativePath) {
  return normalizeGitPath(relativePath)
    .split('/')
    .some((segment) => IGNORED_DIRECTORIES.has(segment.toLowerCase()));
}

export function walkMarkdown(root) {
  let output;
  try {
    output = execFileSync('git', ['-C', path.resolve(root), 'ls-files', '--', '*.md'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(`Unable to enumerate tracked Markdown under ${path.resolve(root)}`, {
      cause: error,
    });
  }
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeGitPath)
    .filter((relativePath) => !isIgnored(relativePath))
    .sort(compareText)
    .map((relativePath) => path.resolve(root, relativePath));
}

function withoutFencedCode(markdown) {
  const kept = [];
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (fence === null) {
        fence = marker[1][0];
      } else if (marker[1][0] === fence) {
        fence = null;
      }
      continue;
    }
    if (fence === null) {
      kept.push(line);
    }
  }
  return kept.join('\n');
}

function linkTarget(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>');
    return end === -1 ? trimmed : trimmed.slice(1, end);
  }
  return trimmed.split(/\s+/)[0];
}

export function extractLocalLinks(markdown) {
  const source = withoutFencedCode(markdown);
  const links = [];
  const pattern = /(^|[^!])\[[^\]]*\]\(([^)\n]+)\)/gm;
  for (const match of source.matchAll(pattern)) {
    const target = linkTarget(match[2]);
    if (
      !target ||
      target.startsWith('#') ||
      /^(?:https?:|mailto:)/i.test(target)
    ) {
      continue;
    }
    links.push(target);
  }
  return links;
}

function isWindowsAbsolute(value) {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function assertInsideRepository(resolved, root, pathApi, target) {
  const relative = pathApi.relative(root, resolved);
  if (
    relative === '..' ||
    relative.startsWith(`..${pathApi.sep}`) ||
    pathApi.isAbsolute(relative)
  ) {
    throw new Error(`Markdown target escapes repository: ${target}`);
  }
  return resolved;
}

export function resolveLocalLink(source, target, root) {
  const withoutAnchor = target.split('#', 1)[0];
  if (/^file:/i.test(withoutAnchor)) {
    let filePath;
    try {
      filePath = fileURLToPath(withoutAnchor);
    } catch (error) {
      throw new Error(`Invalid file URL in Markdown target: ${target}`, { cause: error });
    }
    const pathApi = isWindowsAbsolute(filePath) || isWindowsAbsolute(root) ? path.win32 : path;
    const repositoryRoot = pathApi.resolve(root);
    return assertInsideRepository(
      pathApi.resolve(filePath),
      repositoryRoot,
      pathApi,
      target,
    );
  }
  let decoded;
  try {
    decoded = decodeURIComponent(withoutAnchor);
  } catch (error) {
    throw new Error(`Invalid URL escape in Markdown target: ${target}`, { cause: error });
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) && !isWindowsAbsolute(decoded)) {
    throw new Error(`Unsupported URL scheme in Markdown target: ${target}`);
  }
  if (isWindowsAbsolute(decoded) && !isWindowsAbsolute(root)) {
    throw new Error(`Markdown target escapes repository: ${target}`);
  }
  const pathApi = isWindowsAbsolute(root) ? path.win32 : path;
  const repositoryRoot = pathApi.resolve(root);
  const resolved = decoded.startsWith('/')
    ? pathApi.resolve(repositoryRoot, decoded.replace(/^[/\\]+/, ''))
    : pathApi.resolve(pathApi.dirname(source), decoded);
  if (/^\\\\/.test(decoded)) {
    throw new Error(`Markdown target escapes repository: ${target}`);
  }
  return assertInsideRepository(resolved, repositoryRoot, pathApi, target);
}

export function findBrokenLinks(root) {
  const repositoryRoot = path.resolve(root);
  const broken = [];
  for (const source of walkMarkdown(repositoryRoot)) {
    const sourceLabel = normalizeGitPath(path.relative(repositoryRoot, source));
    for (const target of extractLocalLinks(readFileSync(source, 'utf8'))) {
      if (
        sourceLabel === APPROVED_SIBLING_BACKEND_LINK.source &&
        target === APPROVED_SIBLING_BACKEND_LINK.target
      ) {
        continue;
      }
      const isValidatedSiblingLink =
        sourceLabel === VALIDATED_SIBLING_BACKEND_LINK.source &&
        target === VALIDATED_SIBLING_BACKEND_LINK.target;
      let resolved;
      try {
        resolved = isValidatedSiblingLink
          ? path.resolve(path.dirname(source), target)
          : resolveLocalLink(source, target, repositoryRoot);
      } catch (error) {
        const reason = error instanceof Error && /escapes repository/i.test(error.message)
          ? ' (target escapes repository)'
          : ` (${error instanceof Error ? error.message : String(error)})`;
        broken.push(`${sourceLabel}: ${target}${reason}`);
        continue;
      }
      if (!existsSync(resolved)) {
        broken.push(`${sourceLabel}: ${target}`);
      }
    }
  }
  return broken.sort(compareText);
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length) {
    throw new Error('check-markdown-links does not accept arguments');
  }
  const broken = findBrokenLinks(repoRoot);
  if (broken.length) {
    process.stderr.write(`Broken local Markdown links:\n${broken.map((row) => `- ${row}`).join('\n')}\n`);
    return 1;
  }
  process.stdout.write('All tracked local Markdown links are valid.\n');
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
