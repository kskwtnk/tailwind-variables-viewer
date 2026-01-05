// lib/parser.ts

import postcss from 'postcss';
import { readFile } from 'fs/promises';
import type { ParsedCSS, RootBlock, Variable } from './types.js';

/**
 * 単一のCSSファイルをパースして:rootからCSS変数を抽出
 *
 * Tailwind CSS v4では、ビルド後のCSSファイルに:root { --* }として展開される
 * このパーサーはビルド済みCSSを解析する
 */
async function parseCSS(filePath: string): Promise<ParsedCSS> {
  try {
    // ファイル読み込み
    const css = await readFile(filePath, 'utf8');

    // PostCSSでパース
    let root;
    try {
      root = postcss.parse(css);
    } catch (error) {
      console.warn(`Invalid CSS syntax in ${filePath}, skipping...`);
      return { filePath, rootBlocks: [] };
    }

    const rootBlocks: RootBlock[] = [];
    const variables: Variable[] = [];

    // :rootルールを探索（@layer内も含む）
    // Tailwind v4では @layer theme { :root, :host { ... } } の形式で出力される
    root.walkRules((rule) => {
      // :root または :root, :host のようなセレクタに一致
      if (rule.selector.includes(':root')) {
        // :root内の宣言を走査
        rule.walkDecls((decl) => {
          // CSS変数（--で始まるプロパティ）のみ抽出
          // --*: initial は除外（Tailwindのリセット構文）
          if (decl.prop.startsWith('--') && decl.value.trim() !== 'initial') {
            variables.push({
              name: decl.prop,
              value: decl.value,
              raw: decl.toString()
            });
          }
        });
      }
    });

    // 変数が見つかった場合のみrootBlocksに追加
    if (variables.length > 0) {
      rootBlocks.push({ variables });
    }

    return { filePath, rootBlocks };
  } catch (error) {
    throw new Error(`Failed to read CSS file: ${filePath} - ${(error as Error).message}`);
  }
}

/**
 * 複数のCSSファイルをパース
 */
async function parseCSSFiles(filePaths: string[]): Promise<ParsedCSS[]> {
  const results: ParsedCSS[] = [];

  for (const path of filePaths) {
    try {
      const result = await parseCSS(path);
      results.push(result);
    } catch (error) {
      console.error(`Error parsing ${path}:`, (error as Error).message);
      // エラーが発生してもスキップして続行
    }
  }

  return results;
}

export { parseCSS, parseCSSFiles };
