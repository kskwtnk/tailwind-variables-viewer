import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { BuildOptions, BuildResult } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/**
 * @tailwindcss/cliを実行してCSSをビルド
 *
 * @param htmlContent - 生成されたHTML（クラス名を含む）
 * @param originalCSSPath - 元のユーザーCSSファイル（@import "tailwindcss" + @theme）
 */
export async function buildWithTailwind(
  htmlContent: string,
  originalCSSPath: string,
  options: Partial<BuildOptions> = {}
): Promise<BuildResult> {
  const tmpDir = join(projectRoot, '.tmp');
  const htmlPath = options.htmlPath || join(tmpDir, 'preview.html');
  const cssPath = options.cssPath || join(tmpDir, 'preview.css');
  const timeout = options.timeout || 30000; // 30秒

  try {
    // .tmpディレクトリを作成
    await mkdir(tmpDir, { recursive: true });

    // HTMLファイルを書き込み
    await writeFile(htmlPath, htmlContent, 'utf8');

    // @tailwindcss/cliを実行
    // 元のCSSファイルを入力として、HTMLをスキャンしてビルド
    const result = await runTailwindCLI(originalCSSPath, cssPath, htmlPath, timeout);

    return {
      success: true,
      cssPath,
      output: result.output,
    };
  } catch (error) {
    return {
      success: false,
      cssPath,
      output: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tailwind CLIを子プロセスで実行
 */
function runTailwindCLI(
  inputCSSPath: string,
  outputPath: string,
  contentPath: string,
  timeout: number
): Promise<{ output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['@tailwindcss/cli', '-i', inputCSSPath, '-o', outputPath, '--content', contentPath],
      {
        cwd: projectRoot,
        shell: true,
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Tailwind CLI timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code === 0) {
        resolve({ output: stdout });
      } else {
        reject(
          new Error(
            `Tailwind CLI failed with code ${code}\nStderr: ${stderr}\nStdout: ${stdout}`
          )
        );
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn Tailwind CLI: ${err.message}`));
    });
  });
}
