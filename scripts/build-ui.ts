#!/usr/bin/env bun
/**
 * Build UI using Bun.build
 * Compiles TypeScript, bundles, and minifies for browser
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

console.log('Building UI with Bun.build...');

// Build TypeScript/JavaScript
const result = await Bun.build({
  entrypoints: [resolve(projectRoot, 'src/ui/app.ts')],
  target: 'browser',
  outdir: resolve(projectRoot, 'dist/ui/assets'),
  minify: true,
  sourcemap: 'external',
  naming: '[name]-[hash].[ext]',
});

if (!result.success) {
  console.error('Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`✓ Built ${result.outputs.length} file(s)`);

// Get the built JS filename
const jsOutput = result.outputs.find(o => o.path.endsWith('.js') && !o.path.endsWith('.map'));
if (!jsOutput) {
  console.error('No JS output found');
  process.exit(1);
}
const jsFilename = basename(jsOutput.path);
console.log(`✓ Built JS: ${jsFilename}`);

// Copy static files
const distUiDir = resolve(projectRoot, 'dist/ui');
mkdirSync(distUiDir, { recursive: true });

// Copy and update HTML with correct JS path
let html = readFileSync(resolve(projectRoot, 'src/ui/index.html'), 'utf-8');
html = html.replace('/app.ts', `/assets/${jsFilename}`);
writeFileSync(resolve(distUiDir, 'index.html'), html);
console.log('✓ Copied and updated index.html');

copyFileSync(
  resolve(projectRoot, 'src/ui/app.css'),
  resolve(distUiDir, 'app.css')
);
console.log('✓ Copied app.css');

// Create API directory
mkdirSync(resolve(distUiDir, 'api'), { recursive: true });

console.log('✓ UI build complete');
