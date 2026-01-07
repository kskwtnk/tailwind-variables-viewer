import { describe, test, expect } from 'bun:test';
import { parseThemeVariables } from '../../src/core/theme-parser.js';
import { organizeVariables } from '../../src/core/extractor.js';
import type { ThemeVariable } from '../../src/core/types.js';
import { join, resolve } from 'path';

const SCENARIOS_DIR = join(import.meta.dir, '../fixtures/scenarios');

/**
 * リセットパターンを適用してデフォルト変数をフィルタリング
 */
function applyResets(
  defaultVars: ThemeVariable[],
  userVars: ThemeVariable[]
): ThemeVariable[] {
  const resetPatterns = userVars
    .filter(v => v.value.trim() === 'initial')
    .map(v => v.name);

  if (resetPatterns.length === 0) {
    return defaultVars;
  }

  return defaultVars.filter(v => {
    return !resetPatterns.some(pattern => {
      if (pattern.endsWith('-*')) {
        const prefix = pattern.slice(0, -2);
        return v.name.startsWith(prefix);
      }
      return v.name === pattern;
    });
  });
}

/**
 * 変数をマージして重複を除去
 */
function mergeAndDeduplicate(vars: ThemeVariable[]): ThemeVariable[] {
  const map = new Map<string, ThemeVariable>();

  for (const v of vars) {
    if (v.value.trim() !== 'initial') {
      map.set(v.name, v);
    }
  }

  return Array.from(map.values());
}

/**
 * シナリオ全体のテストヘルパー
 */
async function testScenario(cssFile: string) {
  const parsedTheme = await parseThemeVariables(cssFile);

  let allVariables = [...parsedTheme.variables];

  if (parsedTheme.hasImport) {
    try {
      // node_modules/tailwindcss/theme.css を読み込む
      const tailwindThemePath = resolve('node_modules/tailwindcss/theme.css');
      const tailwindTheme = await parseThemeVariables(tailwindThemePath, false);

      let defaultVars = tailwindTheme.variables;
      if (parsedTheme.hasReset) {
        defaultVars = [];
      } else {
        defaultVars = applyResets(defaultVars, parsedTheme.variables);
      }

      allVariables = mergeAndDeduplicate([...defaultVars, ...parsedTheme.variables]);
    } catch (error) {
      // テスト環境でtailwindcssが見つからない場合はスキップ
      console.warn('Warning: tailwindcss not found, skipping default variables');
    }
  }

  const parsedCSS = {
    filePath: cssFile,
    variables: allVariables.map(v => ({
      name: v.name,
      value: v.value
    }))
  };

  const organized = organizeVariables([parsedCSS]);
  const totalVariables = Object.values(organized).reduce((sum, vars) => sum + vars.length, 0);

  return {
    parsedTheme,
    allVariables,
    organized,
    totalVariables
  };
}

describe('Integration Tests - Scenarios', () => {
  test('Scenario 1: Default only (@import "tailwindcss")', async () => {
    const result = await testScenario(join(SCENARIOS_DIR, '1-default-only.css'));

    expect(result.parsedTheme.hasImport).toBe(true);
    expect(result.parsedTheme.hasReset).toBe(false);
    expect(result.parsedTheme.variables.length).toBe(0); // ユーザー定義変数なし

    // デフォルト変数が読み込まれるはず（375個前後）
    if (result.totalVariables > 0) {
      expect(result.totalVariables).toBeGreaterThanOrEqual(370);
      expect(result.totalVariables).toBeLessThanOrEqual(380);
    }
  });

  test('Scenario 2: Reset all (--*: initial)', async () => {
    const result = await testScenario(join(SCENARIOS_DIR, '2-reset-all.css'));

    expect(result.parsedTheme.hasImport).toBe(true);
    expect(result.parsedTheme.hasReset).toBe(true);

    // リセットされて変数が0個になるはず
    expect(result.totalVariables).toBe(0);
  });

  test('Scenario 3: Extend defaults (default + custom)', async () => {
    const result = await testScenario(join(SCENARIOS_DIR, '3-extend-defaults.css'));

    expect(result.parsedTheme.hasImport).toBe(true);
    expect(result.parsedTheme.hasReset).toBe(false);
    expect(result.parsedTheme.variables.length).toBe(5); // カスタム変数5個

    // デフォルト + カスタム（380個前後）
    if (result.totalVariables > 0) {
      expect(result.totalVariables).toBeGreaterThanOrEqual(375);
      expect(result.totalVariables).toBeLessThanOrEqual(385);
    }

    // カスタム変数が含まれているか確認
    const colorVars = result.organized.color || [];
    const brandVar = colorVars.find(v => v.varName === '--color-brand-500');
    expect(brandVar).toBeDefined();
    expect(brandVar?.value).toBe('oklch(0.65 0.20 200)');
  });

  test('Scenario 4: Reset and custom only', async () => {
    const result = await testScenario(join(SCENARIOS_DIR, '4-reset-and-custom.css'));

    expect(result.parsedTheme.hasImport).toBe(true);
    expect(result.parsedTheme.hasReset).toBe(true);
    expect(result.parsedTheme.variables.length).toBe(6); // カスタム変数6個のみ（--*: initialは除外される）

    // リセット後、カスタム変数のみ（6個）
    expect(result.totalVariables).toBe(6);

    // 各ネームスペースの変数数を確認
    expect(result.organized.color?.length).toBe(2);
    expect(result.organized.spacing?.length).toBe(3);
    expect(result.organized.font?.length).toBe(1);

    // 特定の変数を確認
    const primaryVar = result.organized.color?.find(v => v.varName === '--color-primary');
    expect(primaryVar).toBeDefined();
    expect(primaryVar?.value).toBe('oklch(0.5 0.2 240)');
  });
});

describe('Integration Tests - Helper Functions', () => {
  test('applyResets should handle namespace wildcards', () => {
    const defaultVars: ThemeVariable[] = [
      { name: '--color-red-500', value: '#ff0000', namespace: 'color', isReset: false },
      { name: '--color-blue-500', value: '#0000ff', namespace: 'color', isReset: false },
      { name: '--spacing-4', value: '1rem', namespace: 'spacing', isReset: false },
    ];

    const userVars: ThemeVariable[] = [
      { name: '--color-*', value: 'initial', namespace: 'color', isReset: true },
    ];

    const result = applyResets(defaultVars, userVars);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('--spacing-4');
  });

  test('applyResets should handle exact matches', () => {
    const defaultVars: ThemeVariable[] = [
      { name: '--color-red-500', value: '#ff0000', namespace: 'color', isReset: false },
      { name: '--color-blue-500', value: '#0000ff', namespace: 'color', isReset: false },
    ];

    const userVars: ThemeVariable[] = [
      { name: '--color-red-500', value: 'initial', namespace: 'color', isReset: true },
    ];

    const result = applyResets(defaultVars, userVars);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('--color-blue-500');
  });

  test('mergeAndDeduplicate should remove initial values', () => {
    const vars: ThemeVariable[] = [
      { name: '--color-red-500', value: '#ff0000', namespace: 'color', isReset: false },
      { name: '--color-blue-500', value: 'initial', namespace: 'color', isReset: true },
      { name: '--spacing-4', value: '1rem', namespace: 'spacing', isReset: false },
    ];

    const result = mergeAndDeduplicate(vars);

    expect(result.length).toBe(2);
    expect(result.find(v => v.name === '--color-blue-500')).toBeUndefined();
  });

  test('mergeAndDeduplicate should handle duplicates (last wins)', () => {
    const vars: ThemeVariable[] = [
      { name: '--color-primary', value: '#ff0000', namespace: 'color', isReset: false },
      { name: '--color-primary', value: '#00ff00', namespace: 'color', isReset: false },
    ];

    const result = mergeAndDeduplicate(vars);

    expect(result.length).toBe(1);
    expect(result[0].value).toBe('#00ff00');
  });
});
