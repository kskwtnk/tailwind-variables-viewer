#!/usr/bin/env bun
/**
 * Build UI using Bun.build
 * Compiles TypeScript, bundles, and minifies for browser
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildUI } from './lib/ui-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const success = await buildUI({ projectRoot, verbose: true });

if (!success) {
  process.exit(1);
}
