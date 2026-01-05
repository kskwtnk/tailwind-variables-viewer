import { readFile } from 'fs/promises';
import type { ThemeVariable, GeneratedHTML } from './types.js';

/**
 * 変数名からTailwindのクラス名を生成
 * 例: --color-red-500 → ['bg-red-500', 'text-red-500', 'border-red-500']
 */
function generateClassNames(variable: ThemeVariable): string[] {
  const { name, namespace } = variable;

  // プレフィックスを除去: --color-red-500 → red-500
  const suffix = name.replace(new RegExp(`^--${namespace}-`), '');

  switch (namespace) {
    case 'color':
      // カラー変数は複数のプロパティで使用される
      return [
        `bg-${suffix}`,
        `text-${suffix}`,
        `border-${suffix}`,
        `ring-${suffix}`,
      ];

    case 'spacing':
      // スペーシングは padding, margin, gap などで使用
      return [
        `p-${suffix}`,
        `m-${suffix}`,
        `gap-${suffix}`,
        `w-${suffix}`,
        `h-${suffix}`,
      ];

    case 'font':
      return [`font-${suffix}`];

    case 'text':
      return [`text-${suffix}`];

    case 'radius':
      return [`rounded-${suffix}`];

    case 'shadow':
      return [`shadow-${suffix}`];

    case 'breakpoint':
      // ブレークポイントはクラス名として直接使用しない
      return [];

    default:
      // その他の変数は基本的にそのまま
      return [suffix];
  }
}

/**
 * ThemeVariableの配列からHTMLを生成
 */
export async function generateHTML(
  variables: ThemeVariable[],
  originalCSSPath: string
): Promise<GeneratedHTML> {
  // 元のCSSを読み込む
  const originalCSS = await readFile(originalCSSPath, 'utf8');

  // 各変数に対応するHTMLエレメントを生成
  const elements = variables
    .flatMap((variable) => {
      const classNames = generateClassNames(variable);
      return classNames.map(
        (className) =>
          `    <div class="${className}"></div> <!-- ${variable.name} -->`
      );
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind Variables Preview</title>
  <style>
${originalCSS}
  </style>
</head>
<body>
  <!-- Generated elements to trigger Tailwind's class scanning -->
${elements}
</body>
</html>`;

  return {
    html,
    cssPath: originalCSSPath,
    variableCount: variables.length,
  };
}
