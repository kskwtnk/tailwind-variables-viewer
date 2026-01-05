// lib/extractor.ts

import type { ParsedCSS, OrganizedVariables, OrganizedVariable, VariableType } from './types.js';
import { KNOWN_NAMESPACES } from './types.js';

/**
 * CSS変数名からネームスペースを検出
 * 例: --color-mint-500 → color
 */
function detectNamespace(varName: string): string {
  const match = varName.match(/^--([^-]+)-/);
  if (!match) return 'other';

  const prefix = match[1];
  return KNOWN_NAMESPACES.includes(prefix as any) ? prefix : 'other';
}

/**
 * 値から変数のタイプを推測
 */
function detectType(value: string): VariableType {
  // カラー: oklch, rgb, hsl, hex
  if (/oklch|rgb|hsl|#[0-9a-f]{3,8}/i.test(value)) {
    return 'color';
  }

  // サイズ: px, rem, em, vh, vw, %
  if (/\d+(px|rem|em|vh|vw|%)/.test(value)) {
    return 'size';
  }

  // フォント: 引用符で囲まれた文字列
  if (/["'].*["']/.test(value)) {
    return 'font';
  }

  // 変数参照: var(--*)
  if (/var\(--/.test(value)) {
    return 'reference';
  }

  return 'other';
}

/**
 * CSS変数名からプレフィックスを除去して短縮名を取得
 * 例: --color-mint-500 → mint-500
 */
function extractShortName(varName: string, namespace: string): string {
  const prefix = `--${namespace}-`;
  return varName.startsWith(prefix)
    ? varName.slice(prefix.length)
    : varName.slice(2); // --を除去
}

/**
 * 変数リストをソート
 * spacing: 数値順、その他: アルファベット順
 */
function sortVariables(variables: OrganizedVariable[], namespace: string): OrganizedVariable[] {
  if (namespace === 'spacing') {
    // スペーシング: 数値でソート
    return variables.sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
  }

  // デフォルト: アルファベット順
  return variables.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * パース結果から変数を抽出・整理
 */
function organizeVariables(parsedResults: ParsedCSS[]): OrganizedVariables {
  const organized: OrganizedVariables = {};

  // 全ファイル・全ブロックから変数を収集
  for (const result of parsedResults) {
    for (const block of result.rootBlocks) {
      for (const variable of block.variables) {
        const namespace = detectNamespace(variable.name);
        const type = detectType(variable.value);
        const shortName = extractShortName(variable.name, namespace);

        if (!organized[namespace]) {
          organized[namespace] = [];
        }

        // 重複チェック（同じvarNameが既に存在する場合は上書き）
        const existingIndex = organized[namespace].findIndex(
          v => v.varName === variable.name
        );

        const organizedVar: OrganizedVariable = {
          name: shortName,
          varName: variable.name,
          value: variable.value,
          type,
          namespace
        };

        if (existingIndex >= 0) {
          // 上書き（後のファイルが優先）
          organized[namespace][existingIndex] = organizedVar;
        } else {
          // 新規追加
          organized[namespace].push(organizedVar);
        }
      }
    }
  }

  // 各ネームスペースをソート
  for (const namespace in organized) {
    organized[namespace] = sortVariables(organized[namespace], namespace);
  }

  return organized;
}

export { organizeVariables, detectNamespace, detectType, extractShortName };
