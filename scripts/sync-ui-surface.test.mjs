import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUiSurfaceDocument,
  detectBuildFacts,
  extractLazyPages,
  extractRoutes,
  replaceMarkerBlock,
  renderBuildFacts,
  renderRoutes,
} from './sync-ui-surface.mjs';

const APP_FIXTURE = `
import { lazy } from 'react';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/knowledge" element={<KnowledgeBase />} />
    </Route>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}`;

test('extractLazyPages maps component names to their import paths', () => {
  assert.deepEqual(extractLazyPages(APP_FIXTURE), {
    Login: './pages/Login',
    Dashboard: './pages/Dashboard',
    KnowledgeBase: './pages/KnowledgeBase',
  });
});

test('extractRoutes preserves source order and classifies public, protected, and redirect routes', () => {
  assert.deepEqual(extractRoutes(APP_FIXTURE), [
    { path: '/login', page: './pages/Login', access: 'public' },
    { path: '/dashboard', page: './pages/Dashboard', access: 'protected' },
    { path: '/knowledge', page: './pages/KnowledgeBase', access: 'protected' },
    { path: '/', page: 'redirect → /dashboard', access: 'redirect' },
  ]);
});

test('extractRoutes supports multiline public, protected, and redirect JSX', () => {
  const multiline = `
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
<Routes>
  <Route
    element={<Login />}
    path="/login"
  />
  <Route
    element={<ProtectedRoute />}
  >
    <Route
      path="/dashboard"
      element={<Dashboard />}
    />
  </Route>
  <Route
    path="/"
    element={
      <Navigate
        to="/dashboard"
        replace
      />
    }
  />
</Routes>`;

  assert.deepEqual(extractRoutes(multiline), [
    { path: '/login', page: './pages/Login', access: 'public' },
    { path: '/dashboard', page: './pages/Dashboard', access: 'protected' },
    { path: '/', page: 'redirect → /dashboard', access: 'redirect' },
  ]);
});

test('extractRoutes fails closed when a path-bearing Route cannot be consumed', () => {
  const dynamicPath = `
const Login = lazy(() => import('./pages/Login'));
<Routes><Route path={loginPath} element={<Login />} /></Routes>`;

  assert.throws(() => extractRoutes(dynamicPath), /path-bearing Route|parse route path|unconsumed/i);
});

test('detectBuildFacts distinguishes default Vite chunking from explicit manualChunks', () => {
  assert.deepEqual(detectBuildFacts('export default defineConfig({ plugins: [react()] })', APP_FIXTURE), {
    routeLevelLazyLoading: true,
    manualChunksConfigured: false,
  });
  assert.deepEqual(
    detectBuildFacts(
      `export default defineConfig({ build: { rollupOptions: { output: { manualChunks: {} } } } })`,
      APP_FIXTURE,
    ),
    { routeLevelLazyLoading: true, manualChunksConfigured: true },
  );
});

test('replaceMarkerBlock preserves prose outside one bounded marker pair', () => {
  const source = `before\n<!-- BEGIN -->\nstale\n<!-- END -->\nafter\n`;
  assert.equal(
    replaceMarkerBlock(source, '<!-- BEGIN -->', '<!-- END -->', 'fresh\nrows'),
    `before\n<!-- BEGIN -->\nfresh\nrows\n<!-- END -->\nafter\n`,
  );
});

test('replaceMarkerBlock rejects missing, duplicate, and reversed markers', () => {
  assert.throws(() => replaceMarkerBlock('plain', '<!-- B -->', '<!-- E -->', 'x'), /exactly one/i);
  assert.throws(
    () => replaceMarkerBlock('<!-- B -->\n<!-- B -->\n<!-- E -->', '<!-- B -->', '<!-- E -->', 'x'),
    /exactly one/i,
  );
  assert.throws(
    () => replaceMarkerBlock('<!-- E -->\n<!-- B -->', '<!-- B -->', '<!-- E -->', 'x'),
    /before/i,
  );
});

test('rendered route and build facts are truthful and never invent graph-vendor', () => {
  const routes = renderRoutes(extractRoutes(APP_FIXTURE));
  const build = renderBuildFacts(detectBuildFacts('export default defineConfig({})', APP_FIXTURE));
  assert.match(routes, /\| `\/dashboard` \| `\.\/pages\/Dashboard` \| protected \|/);
  assert.match(build, /route-level lazy loading is enabled/i);
  assert.match(build, /Vite default chunking is active/i);
  assert.doesNotMatch(build, /graph-vendor/);
});

test('building a drifted document is deterministic and does not mutate the input', () => {
  const source = `intro
<!-- BEGIN GENERATED UI ROUTES -->
stale routes
<!-- END GENERATED UI ROUTES -->
middle
<!-- BEGIN GENERATED BUILD FACTS -->
stale build
<!-- END GENERATED BUILD FACTS -->
outro
`;
  const updated = buildUiSurfaceDocument(
    source,
    APP_FIXTURE,
    'export default defineConfig({ plugins: [react()] })',
  );
  assert.match(updated, /`\/login`/);
  assert.match(updated, /Vite default chunking is active/i);
  assert.equal(source.includes('stale routes'), true);
  assert.equal(buildUiSurfaceDocument(updated, APP_FIXTURE, 'export default defineConfig({ plugins: [react()] })'), updated);
});
