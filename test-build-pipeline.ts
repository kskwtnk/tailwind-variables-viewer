#!/usr/bin/env tsx

/**
 * 統合テスト: 新アーキテクチャのビルドパイプライン
 *
 * フロー:
 * 1. ユーザーのCSSから@theme変数を抽出
 * 2. HTMLを生成（変数に対応するクラス名を含む）
 * 3. Tailwindでビルド
 * 4. 生成されたCSSから:rootを解析
 * 5. 変数を整理して表示
 */

import { parseThemeVariables } from './lib/theme-parser.js';
import { generateHTML } from './lib/html-generator.js';
import { buildWithTailwind } from './lib/builder.js';
import { parseCSS } from './lib/parser.js';
import { organizeVariables } from './lib/extractor.js';
import pc from 'picocolors';

interface TestScenario {
  name: string;
  file: string;
  expectedVarCount: number; // @themeから抽出される変数の期待値
}

const scenarios: TestScenario[] = [
  {
    name: 'Scenario 1: デフォルトのみ',
    file: 'test/scenarios/1-default-only.css',
    expectedVarCount: 0, // @themeブロックなし
  },
  {
    name: 'Scenario 2: すべてリセット',
    file: 'test/scenarios/2-reset-all.css',
    expectedVarCount: 0, // --*: initial のみ
  },
  {
    name: 'Scenario 3: デフォルト + カスタム',
    file: 'test/scenarios/3-extend-defaults.css',
    expectedVarCount: 5, // カスタム変数5個
  },
  {
    name: 'Scenario 4: カスタムのみ',
    file: 'test/scenarios/4-reset-and-custom.css',
    expectedVarCount: 6, // カスタム変数6個
  },
];

async function testScenario(scenario: TestScenario) {
  console.log(pc.cyan(`\n${scenario.name}`));
  console.log(pc.gray(`  File: ${scenario.file}`));

  try {
    // 1. @theme変数を抽出
    console.log(pc.gray('  [1/5] Parsing @theme variables...'));
    const parsed = await parseThemeVariables(scenario.file);
    console.log(pc.gray(`    → Found ${parsed.variables.length} variables`));
    console.log(pc.gray(`    → Has reset: ${parsed.hasReset}`));

    if (parsed.variables.length !== scenario.expectedVarCount) {
      throw new Error(
        `Expected ${scenario.expectedVarCount} variables, got ${parsed.variables.length}`
      );
    }

    // 2. HTML生成
    console.log(pc.gray('  [2/5] Generating HTML...'));
    const generated = await generateHTML(parsed.variables, scenario.file);
    console.log(pc.gray(`    → Generated ${generated.variableCount} variable references`));

    // 3. Tailwindビルド
    console.log(pc.gray('  [3/5] Building with Tailwind CLI...'));
    const buildResult = await buildWithTailwind(generated.html, scenario.file);

    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.error}`);
    }
    console.log(pc.gray(`    → Built successfully: ${buildResult.cssPath}`));

    // 4. 生成されたCSSから:rootを解析
    console.log(pc.gray('  [4/5] Parsing generated CSS...'));
    const parsedCSS = await parseCSS(buildResult.cssPath);
    const totalVars = parsedCSS.rootBlocks.reduce(
      (sum, block) => sum + block.variables.length,
      0
    );
    console.log(pc.gray(`    → Found ${totalVars} variables in :root`));

    // 5. 変数を整理
    console.log(pc.gray('  [5/5] Organizing variables...'));
    const organized = organizeVariables([parsedCSS]);
    const namespaces = Object.keys(organized);
    const totalOrganized = Object.values(organized).reduce(
      (sum, vars) => sum + vars.length,
      0
    );

    console.log(pc.gray(`    → Organized into ${namespaces.length} namespaces`));
    for (const [namespace, vars] of Object.entries(organized)) {
      console.log(pc.gray(`       - ${namespace}: ${vars.length} variables`));
    }

    console.log(pc.green(`  ✓ ${scenario.name} passed`));
    console.log(pc.gray(`    Total variables: ${totalOrganized}`));

    return { success: true, organized };
  } catch (error) {
    console.log(pc.red(`  ✗ ${scenario.name} failed`));
    console.log(pc.red(`    Error: ${(error as Error).message}`));
    return { success: false, error };
  }
}

async function main() {
  console.log(pc.bold('\n🧪 Testing Build Pipeline\n'));
  console.log(pc.gray('Testing the new architecture:'));
  console.log(pc.gray('  @theme extraction → HTML generation → Tailwind build → :root parsing\n'));

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(pc.bold('\n📊 Test Summary\n'));
  console.log(pc.green(`  ✓ Passed: ${passed}/${scenarios.length}`));
  if (failed > 0) {
    console.log(pc.red(`  ✗ Failed: ${failed}/${scenarios.length}`));
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(pc.red('\n❌ Fatal error:'), error);
  process.exit(1);
});
