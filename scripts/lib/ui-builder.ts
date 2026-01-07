/**
 * Shared UI build logic
 * Used by both build-ui.ts and dev-watch.ts
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';

export interface BuildUIOptions {
  projectRoot: string;
  verbose?: boolean;
}

export async function buildUI(options: BuildUIOptions): Promise<boolean> {
  const { projectRoot, verbose = true } = options;

  if (verbose) {
    console.log('Building UI with Bun.build...');
  }

  try {
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
      return false;
    }

    if (verbose) {
      console.log(`✓ Built ${result.outputs.length} file(s)`);
    }

    // Get the built JS filename
    const jsOutput = result.outputs.find(o => o.path.endsWith('.js') && !o.path.endsWith('.map'));
    if (!jsOutput) {
      console.error('No JS output found');
      return false;
    }
    const jsFilename = basename(jsOutput.path);
    if (verbose) {
      console.log(`✓ Built JS: ${jsFilename}`);
    }

    // Copy static files
    const distUiDir = resolve(projectRoot, 'dist/ui');
    mkdirSync(distUiDir, { recursive: true });

    // Copy and update HTML with correct JS path
    let html = readFileSync(resolve(projectRoot, 'src/ui/index.html'), 'utf-8');
    html = html.replace('/app.ts', `/assets/${jsFilename}`);
    writeFileSync(resolve(distUiDir, 'index.html'), html);
    if (verbose) {
      console.log('✓ Copied and updated index.html');
    }

    copyFileSync(
      resolve(projectRoot, 'src/ui/app.css'),
      resolve(distUiDir, 'app.css')
    );
    if (verbose) {
      console.log('✓ Copied app.css');
    }

    // Create API directory
    mkdirSync(resolve(distUiDir, 'api'), { recursive: true });

    if (verbose) {
      console.log('✓ UI build complete');
    }

    return true;
  } catch (error) {
    console.error('Build error:', error);
    return false;
  }
}
