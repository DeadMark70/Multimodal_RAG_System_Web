import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const configPath = path.resolve(import.meta.dirname, '..', 'nginx.conf');

test('Nginx enforces public API limits while preserving health and upload routing', () => {
  const config = readFileSync(configPath, 'utf8');

  assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_general:10m rate=120r\/m;/);
  assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_generation:10m rate=12r\/m;/);
  assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_upload:10m rate=4r\/m;/);
  assert.match(config, /limit_conn_zone \$binary_remote_addr zone=api_connections:10m;/);
  assert.match(config, /proxy_set_header X-Request-ID \$request_id;/);
  assert.match(config, /proxy_buffering off;/);
  assert.match(config, /Retry-After 60 always/);

  const uploadRoute = 'location ~ ^/(pdfmd/(ocr|upload_pdf_md)|imagemd/translate_image|multimodal/extract)$';
  const generalApiRoute = 'location ~ ^/(pdfmd|rag|imagemd|multimodal|stats|graph|api)/';
  const healthRoute = 'location ^~ /health/';

  assert.ok(config.includes(healthRoute), 'health endpoint must have its own proxy location');
  assert.match(
    config,
    /location \^~ \/health\/\s*\{[\s\S]*?proxy_pass http:\/\/backend_api;/,
    'health endpoint must proxy to the backend',
  );
  assert.ok(config.includes(uploadRoute), 'upload route class must be present');
  assert.ok(config.includes(generalApiRoute), 'general API route class must be present');
  assert.ok(
    config.indexOf(uploadRoute) < config.indexOf(generalApiRoute),
    'upload regex must appear before the general API regex',
  );
});

test('Nginx serves PDF.js module workers with a JavaScript MIME type', () => {
  const config = readFileSync(configPath, 'utf8');

  assert.match(
    config,
    /location ~\* \\.mjs\$\s*\{\s*default_type application\/javascript;\s*try_files \$uri =404;\s*\}/,
  );
});
