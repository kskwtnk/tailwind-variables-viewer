# Biomeをlinter/formatterとして採用

**日付**: 2026-01-08
**ステータス**: 採用

## 背景

プロジェクトにコード品質を保つためのlinterとformatterが必要だった。以下の選択肢があった：

1. **ESLint + Prettier**（従来の定番）
2. **Biome**（Rust製の統合ツール）
3. **deno lint + deno fmt**（Deno専用）

## 決定

**Biome**を採用する。

## 理由

### 1. プロジェクトの思想と一致

このプロジェクトは「最小限の依存関係」を重視している：

- **ESLint + Prettier**: 2つのツール + 多数のプラグイン
- **Biome**: 1つのツールで完結

### 2. Bunとの相性

- Bunを使っている本プロジェクトと思想が近い（パフォーマンス重視）
- Rust製で高速
- `bunx --bun biome`でシームレスに実行可能

### 3. 設定のシンプルさ

```json
// biome.json 1ファイルのみ
{
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true }
}
```

ESLint + Prettierでは`.eslintrc.js`、`.prettierrc`、`.eslintignore`、`.prettierignore`など複数ファイルが必要。

### 4. 標準ルールセットで十分

- Biomeの`recommended`ルールセットが適切
- カスタマイズ不要で導入できた
- Node.js import protocol（`node:`プレフィックス）など、モダンな推奨を自動適用

### 5. VCS統合

- `.gitignore`を自動認識
- `dist/`などを自動除外

## トレードオフ

### デメリット

1. **エコシステムの成熟度**: ESLintほど成熟していない
2. **プラグインエコシステム**: ESLintのような豊富なプラグインはない
3. **コミュニティ**: ESLintより小さい

### メリット

1. **速度**: Rust製で非常に高速
2. **依存関係**: 1パッケージのみ
3. **設定**: シンプルで分かりやすい
4. **統合**: linter + formatterが1ツールで完結

## 適用した修正内容

Biome導入時に以下を修正：

1. **Node.js import protocol**: `"fs"` → `"node:fs"`など（15箇所）
2. **型安全性向上**: `any` → 適切な型（2箇所）
3. **non-null assertion除去**: `!` → 適切なnullチェック（5箇所）
4. **parseInt radix**: `parseInt(x)` → `parseInt(x, 10)`（2箇所）
5. **未使用変数削除**: `catch (error)` → `catch`（4箇所）
6. **isNaN修正**: `isNaN()` → `Number.isNaN()`（1箇所）

## 代替案との比較

| 項目 | Biome | ESLint + Prettier |
|------|-------|-------------------|
| 依存数 | 1個 | 2個以上 |
| 設定ファイル | 1個 | 2〜4個 |
| 速度 | 非常に速い | 普通 |
| プラグイン | 少ない | 豊富 |
| 成熟度 | 発展途上 | 成熟 |

## 今後の展望

- Biomeは活発に開発されており、機能追加が期待できる
- 現状のrecommendedルールで十分な品質が保てている
- 将来的にESLintのルールが必要になった場合は再検討する

## 参考

- [Biome公式ドキュメント](https://biomejs.dev/)
- [Biome vs ESLint比較](https://biomejs.dev/guides/getting-started/)
