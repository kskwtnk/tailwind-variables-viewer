#!/usr/bin/env bun
/**
 * Build UI using Bun.build
 * Compiles TypeScript, bundles, and minifies for browser
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUI } from "./lib/ui-builder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

const success = await buildUI({ projectRoot, verbose: true });

if (!success) {
	process.exit(1);
}
