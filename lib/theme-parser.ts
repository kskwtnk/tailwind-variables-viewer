import postcss from 'postcss';
import { readFile } from 'fs/promises';
import type { ThemeVariable, ParsedTheme } from './types.js';
import { KNOWN_NAMESPACES } from './types.js';

/**
 * ネームスペースを検出
 */
function detectNamespace(varName: string): string {
  const match = varName.match(/^--([^-]+)-/);
  if (!match) return 'other';

  const prefix = match[1];
  return KNOWN_NAMESPACES.includes(prefix as any) ? prefix : 'other';
}

/**
 * @themeディレクティブからCSS変数を抽出
 */
export async function parseThemeVariables(filePath: string): Promise<ParsedTheme> {
  const css = await readFile(filePath, 'utf8');
  const root = postcss.parse(css);

  let hasReset = false;
  const variables: ThemeVariable[] = [];

  // @themeルールを探索
  root.walkAtRules('theme', (atRule) => {
    atRule.walkDecls((decl) => {
      // --*: initial; の検出（リセット）
      if (decl.prop === '--*' && decl.value.trim() === 'initial') {
        hasReset = true;
        return;
      }

      // CSS変数（--で始まるプロパティ）のみ抽出
      if (decl.prop.startsWith('--')) {
        const namespace = detectNamespace(decl.prop);

        variables.push({
          name: decl.prop,
          value: decl.value,
          namespace,
          isReset: false,
        });
      }
    });
  });

  return {
    filePath,
    hasReset,
    variables,
  };
}
