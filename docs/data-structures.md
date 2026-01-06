# データ構造仕様

プロジェクト全体で使用される主要なデータ構造は **[@lib/types.ts](../lib/types.ts)** で定義されています。

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

### サーバー関連

- `ServerOptions` - サーバー起動オプション
- `ServerResult` - サーバー起動結果

### その他

- `KNOWN_NAMESPACES` - Tailwind v4の標準ネームスペース定数
- `detectNamespace()` - CSS変数名からネームスペースを検出する関数

## データフロー

```
CLI起動
  ↓
parseThemeVariables() → ParsedTheme
  ↓
デフォルト変数とマージ → ThemeVariable[]
  ↓
ParsedCSS形式に変換
  ↓
organizeVariables() → OrganizedVariables
  ↓
startServer() → ブラウザで表示
```
