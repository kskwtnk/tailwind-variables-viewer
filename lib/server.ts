import { preview } from 'vite';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { OrganizedVariables, ServerOptions, ServerResult } from './types.js';

/**
 * Start Vite preview server with static JSON API
 *
 * @param organizedVariables - Organized theme variables to serve via API
 * @param options - Server options (port, etc.)
 * @returns Server instance, actual port, and URL
 */
export async function startServer(
  organizedVariables: OrganizedVariables,
  options: ServerOptions = {}
): Promise<ServerResult> {
  const port = options.port || 3000;

  // Get the directory where the CLI is installed (inside node_modules)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Go up two levels: lib -> dist-cli -> package root
  const packageRoot = resolve(__dirname, '..', '..');
  const distDir = resolve(packageRoot, 'dist');
  const apiDir = resolve(distDir, 'api');

  // Write variables as static JSON file in dist/api/
  await mkdir(apiDir, { recursive: true });
  await writeFile(
    resolve(apiDir, 'variables.json'),
    JSON.stringify(organizedVariables, null, 2),
    'utf8'
  );

  // Start Vite preview server
  // Serve the built dist/ directory
  const previewServer = await preview({
    preview: {
      port,
      strictPort: false, // Auto-search for available port if specified port is in use
      open: false,       // Don't auto-open browser (CLI handles this)
    },
    configFile: false,   // Don't load any config file - use defaults
    build: {
      outDir: 'dist',    // Relative path from root
    },
    root: packageRoot,   // Use package root as working directory
  });

  // Wait for server to be fully ready
  await new Promise(resolve => setTimeout(resolve, 100));

  // Extract actual port from resolved URLs
  let actualPort = port;
  if (previewServer.resolvedUrls?.local && previewServer.resolvedUrls.local.length > 0) {
    const url = previewServer.resolvedUrls.local[0];
    actualPort = Number(new URL(url).port);
  }

  return {
    server: previewServer,
    port: actualPort,
    url: `http://localhost:${actualPort}`,
  };
}
