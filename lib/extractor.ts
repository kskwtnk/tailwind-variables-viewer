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
 * var(--variable-name)から変数名を抽出
 */
function extractVarReference(value: string): string | null {
  const match = value.match(/var\((--[^,)]+)/);
  return match ? match[1] : null;
}

/**
 * 変数参照を解決
 * @param value - 解決する値（var(--color-blue-500)など）
 * @param variableMap - 変数名 → 値のマップ
 * @param visited - 循環参照チェック用
 * @param maxDepth - 最大解決深度
 */
function resolveReference(
  value: string,
  variableMap: Map<string, string>,
  visited: Set<string> = new Set(),
  maxDepth: number = 10
): string | null {
  if (maxDepth === 0) return null; // 深すぎる参照

  const refVarName = extractVarReference(value);
  if (!refVarName) return null; // 参照ではない

  if (visited.has(refVarName)) return null; // 循環参照
  visited.add(refVarName);

  const refValue = variableMap.get(refVarName);
  if (!refValue) return null; // 参照先が見つからない

  // 参照先がさらに参照の場合は再帰的に解決
  if (/var\(--/.test(refValue)) {
    return resolveReference(refValue, variableMap, visited, maxDepth - 1);
  }

  return refValue;
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
  const variableMap = new Map<string, string>();

  // ステップ1: 全変数を収集してマップを作成
  for (const result of parsedResults) {
    for (const block of result.rootBlocks) {
      for (const variable of block.variables) {
        variableMap.set(variable.name, variable.value);
      }
    }
  }

  // ステップ2: 変数を整理
  for (const result of parsedResults) {
    for (const block of result.rootBlocks) {
      for (const variable of block.variables) {
        const namespace = detectNamespace(variable.name);
        const shortName = extractShortName(variable.name, namespace);

        if (!organized[namespace]) {
          organized[namespace] = [];
        }

        // 重複チェック（同じvarNameが既に存在する場合は上書き）
        const existingIndex = organized[namespace].findIndex(
          v => v.varName === variable.name
        );

        // 参照を解決
        let resolvedValue: string | undefined;
        if (/var\(--/.test(variable.value)) {
          const resolved = resolveReference(variable.value, variableMap);
          if (resolved) {
            resolvedValue = resolved;
          }
        }

        // 実際の値（解決済みまたは元の値）でタイプ判定
        const valueForType = resolvedValue || variable.value;
        const type = detectType(valueForType);

        const organizedVar: OrganizedVariable = {
          name: shortName,
          varName: variable.name,
          value: variable.value,
          resolvedValue,
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
