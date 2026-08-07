import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROUTES_BEGIN = '<!-- BEGIN GENERATED UI ROUTES -->';
export const ROUTES_END = '<!-- END GENERATED UI ROUTES -->';
export const BUILD_BEGIN = '<!-- BEGIN GENERATED BUILD FACTS -->';
export const BUILD_END = '<!-- END GENERATED BUILD FACTS -->';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const appPath = path.join(repoRoot, 'src', 'App.tsx');
const vitePath = path.join(repoRoot, 'vite.config.ts');
const uiSurfacePath = path.join(repoRoot, 'docs', 'generated', 'ui-surface.md');

export function extractLazyPages(appSource) {
  const pages = {};
  const pattern = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*;/g;
  for (const match of appSource.matchAll(pattern)) {
    pages[match[1]] = match[2];
  }
  return pages;
}

export function extractRoutes(appSource) {
  const lazyPages = extractLazyPages(appSource);
  const routes = [];
  let protectedGroup = false;
  for (const line of appSource.split(/\r?\n/)) {
    if (/<Route\s+element=\{<ProtectedRoute\s*\/>\}>/.test(line)) {
      protectedGroup = true;
      continue;
    }
    if (protectedGroup && /<\/Route>/.test(line)) {
      protectedGroup = false;
      continue;
    }
    if (!/<Route\b/.test(line)) {
      continue;
    }
    const pathMatch = line.match(/\bpath\s*=\s*['"]([^'"]+)['"]/);
    if (!pathMatch) {
      continue;
    }
    const redirect = line.match(/<Navigate\s+[^>]*\bto\s*=\s*['"]([^'"]+)['"]/);
    if (redirect) {
      routes.push({ path: pathMatch[1], page: `redirect → ${redirect[1]}`, access: 'redirect' });
      continue;
    }
    const component = line.match(/\belement\s*=\s*\{<([A-Za-z_$][\w$]*)\s*\/>\}/)?.[1];
    if (!component || !lazyPages[component]) {
      throw new Error(`Route ${pathMatch[1]} does not reference a known lazy page`);
    }
    routes.push({
      path: pathMatch[1],
      page: lazyPages[component],
      access: protectedGroup ? 'protected' : 'public',
    });
  }
  return routes;
}

export function detectBuildFacts(viteSource, appSource = '') {
  return {
    routeLevelLazyLoading: /\blazy\s*\(\s*\(\)\s*=>\s*import\s*\(/.test(appSource),
    manualChunksConfigured: /\bmanualChunks\s*:/.test(viteSource),
  };
}

function countOccurrences(source, marker) {
  return source.split(marker).length - 1;
}

export function replaceMarkerBlock(document, begin, end, generated) {
  if (countOccurrences(document, begin) !== 1 || countOccurrences(document, end) !== 1) {
    throw new Error(`Expected exactly one marker pair: ${begin} / ${end}`);
  }
  const beginIndex = document.indexOf(begin);
  const endIndex = document.indexOf(end);
  if (beginIndex >= endIndex) {
    throw new Error(`Generated block begin marker must appear before end marker: ${begin}`);
  }
  const before = document.slice(0, beginIndex + begin.length);
  const after = document.slice(endIndex);
  return `${before}\n${generated.replace(/^\n+|\n+$/g, '')}\n${after}`;
}

export function renderRoutes(routes) {
  const rows = routes.map(
    (route) => `| \`${route.path}\` | \`${route.page}\` | ${route.access} |`,
  );
  return ['| Route | Page import | Access |', '|---|---|---|', ...rows].join('\n');
}

export function renderBuildFacts(facts) {
  const lazyFact = facts.routeLevelLazyLoading
    ? '- Route-level lazy loading is enabled by `lazy(...)` page imports in `src/App.tsx`.'
    : '- Route-level lazy loading is not detected in `src/App.tsx`.';
  const chunkFact = facts.manualChunksConfigured
    ? '- `vite.config.ts` configures explicit `manualChunks`; named chunks come from that source configuration.'
    : '- Vite default chunking is active because `vite.config.ts` does not configure `manualChunks`.';
  return `${lazyFact}\n${chunkFact}`;
}

export function buildUiSurfaceDocument(document, appSource, viteSource) {
  const withRoutes = replaceMarkerBlock(
    document,
    ROUTES_BEGIN,
    ROUTES_END,
    renderRoutes(extractRoutes(appSource)),
  );
  return replaceMarkerBlock(
    withRoutes,
    BUILD_BEGIN,
    BUILD_END,
    renderBuildFacts(detectBuildFacts(viteSource, appSource)),
  );
}

function parseMode(argv) {
  const modes = argv.filter((arg) => arg === '--write' || arg === '--check');
  if (modes.length !== 1 || argv.length !== 1) {
    throw new Error('Choose exactly one mode: --write or --check');
  }
  return modes[0];
}

export function main(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const source = readFileSync(uiSurfacePath, 'utf8');
  const updated = buildUiSurfaceDocument(
    source,
    readFileSync(appPath, 'utf8'),
    readFileSync(vitePath, 'utf8'),
  );
  if (mode === '--write') {
    if (updated !== source) {
      writeFileSync(uiSurfacePath, updated);
      process.stdout.write('Updated docs/generated/ui-surface.md.\n');
    } else {
      process.stdout.write('Generated UI surface is already current.\n');
    }
    return 0;
  }
  if (updated !== source) {
    process.stderr.write('Generated UI surface is stale; run npm run docs:sync.\n');
    return 1;
  }
  process.stdout.write('Generated UI surface is current.\n');
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
