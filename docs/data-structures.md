# データ構造仕様

プロジェクト全体で使用される主要なデータ構造は **[@src/core/types.ts](../src/core/types.ts)** で定義されています。

## 主要な型

### パーサー関連

- `ThemeVariable` - @themeブロックから抽出された変数
- `ParsedTheme` - @theme解析結果

### 変数整理用

- `Variable` - 整理処理で使用される変数
- `ParsedCSS` - 整理処理の中間データ構造

### 整理後の変数

- `OrganizedVariable` - 表示用に整理された変数
- `OrganizedVariables` - ネームスペース別に整理された変数
- `VariableType` - 変数のタイプ（color/size/font/reference/other）

### その他

- `KNOWN_NAMESPACES` - Tailwind v4の標準ネームスペース定数
- `detectNamespace()` - CSS変数名からネームスペースを検出する関数

## データフロー

```
CLI起動 (src/cli/index.ts)
  ↓
parseThemeVariables() → ParsedTheme (src/core/theme-parser.ts)
  ↓
デフォルト変数とマージ → ThemeVariable[]
  ↓
ParsedCSS形式に変換
  ↓
organizeVariables() → OrganizedVariables (src/core/extractor.ts)
  ↓
variables.jsonとして保存 (dist/ui/api/variables.json)
  ↓
Vite dev server起動 → ブラウザで表示
  ↓
フロントエンド (src/ui/app.ts)
  ↓
fetch('/api/variables.json') → 表示
```
