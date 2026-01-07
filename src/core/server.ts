import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import type { OrganizedVariables, ServerOptions, ServerResult } from './types.js';

/**
 * Start HTTP server with static file serving and JSON API
 * Uses Node.js standard APIs for compatibility with both Node.js and Bun
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
  // Go up two levels: core -> dist -> package root
  const packageRoot = resolve(__dirname, '..', '..');
  const distUiDir = resolve(packageRoot, 'dist', 'ui');
  const apiDir = resolve(distUiDir, 'api');

  // Write variables as static JSON file in dist/ui/api/
  await mkdir(apiDir, { recursive: true });
  await writeFile(
    resolve(apiDir, 'variables.json'),
    JSON.stringify(organizedVariables, null, 2),
    'utf8'
  );

  // Create HTTP server using Node.js standard API
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // API endpoint
    if (url.pathname === '/api/variables.json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(organizedVariables, null, 2));
      return;
    }

    // Static file serving
    try {
      const filePath = url.pathname === '/'
        ? resolve(distUiDir, 'index.html')
        : resolve(distUiDir, url.pathname.slice(1));

      const content = await readFile(filePath);
      const contentType = getContentType(extname(filePath));

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  // Automatic port search if specified port is in use
  let actualPort = port;
  let retries = 10;

  const tryListen = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          retries--;
          actualPort++;
          console.log(`Port ${actualPort - 1} is in use, trying another one...`);
          server.close();
          setTimeout(() => tryListen().then(resolve).catch(reject), 100);
        } else {
          reject(err);
        }
      });

      server.listen(actualPort, () => {
        resolve(actualPort);
      });
    });
  };

  actualPort = await tryListen();

  return {
    server,
    port: actualPort,
    url: `http://localhost:${actualPort}`,
  };
}

/**
 * Get MIME type based on file extension
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
}
