# テスト戦略と品質基準

## テストアプローチ

このプロジェクトでは**自動テスト**と**手動テスト**を組み合わせています。

- **自動テスト**: コアロジック（パーサー、変数整理、統合）
- **手動テスト**: CLI起動、ブラウザUI、エンドツーエンド

## 自動テスト

### テスト実行

```bash
# 全テスト実行
bun test

# 特定のテストファイルのみ
bun test test/unit/theme-parser.test.ts
bun test test/unit/extractor.test.ts
bun test test/unit/integration.test.ts
```

### テストカバレッジ

詳細は[@test/unit](../test/unit)を参照してください。

1. **[@test/unit/theme-parser.test.ts](../test/unit/theme-parser.test.ts)**
   - `@import "tailwindcss"`検出
   - リセットパターン（`--*: initial`, `--color-*: initial`）
   - カスタム変数抽出
   - 複数変数処理
2. **[@test/unit/extractor.test.ts](../test/unit/extractor.test.ts)**
   - ネームスペース検出（color, spacing, fontなど）
   - タイプ判定（color/size/font/reference/other）
   - 短縮名抽出（`--color-brand-500` → `brand-500`）
   - ソート（spacingは数値順、その他は英字順）
   - 重複処理（後の値で上書き）
   - var()参照解決
3. **[@test/unit/integration.test.ts](../test/unit/integration.test.ts)**
   - Scenario 1-4の統合テスト
   - デフォルト変数とカスタム変数のマージ
   - リセットパターン適用ロジック

### テストシナリオ

テストには[@test/fixtures/scenarios](../test/fixtures/scenarios)の以下のCSSファイルを使用:

- **1-default-only.css**: `@import "tailwindcss"`のみ（375個のデフォルト変数）
- **2-reset-all.css**: `--*: initial`で全リセット（0個）
- **3-extend-defaults.css**: デフォルト + カスタム5個（380個）
- **4-reset-and-custom.css**: 全リセット + カスタム6個（6個のみ）

## 手動テスト

### CLI動作確認

```bash
# ビルド
bun run build

# 基本起動
node dist/cli/index.js -c test/fixtures/scenarios/1-default-only.css -o

# カスタムポート
node dist/cli/index.js -c test/fixtures/scenarios/3-extend-defaults.css -p 3001 -o

# ヘルプ表示
node dist/cli/index.js -h

# バージョン表示
node dist/cli/index.js -v
```

**確認項目**:
- 引数なし: エラーメッセージとヘルプ表示
- 無効なファイル: ファイル不存在エラー
- 不正なポート: エラーメッセージ表示
- ブラウザ自動起動（`-o`オプション）
- Ctrl+Cでgraceful shutdown

### ブラウザUI確認

```bash
# 開発サーバー起動
bun run dev
```

**確認項目**:
1. http://localhost:3000 を開く
2. 各ネームスペースが表示される
3. カラースウォッチの色が正しい
4. サイズバーの幅が適切
5. フォントサンプルのフォントが適用される
6. Copyボタンをクリック → "Copied!" 表示
7. 検索ボックスで絞り込み
8. デベロッパーツールでエラーなし
9. ウィンドウリサイズでレスポンシブ対応

### ホットリロード確認

```bash
# CLIツールで起動
node dist/cli/index.js -c test/fixtures/scenarios/3-extend-defaults.css -o
```

**確認項目**:
1. ブラウザで変数一覧が表示される
2. `test/fixtures/scenarios/3-extend-defaults.css`を編集
3. ターミナルに「CSS file changed, reloading...」と表示
4. ブラウザが自動的にリロードされる
5. 変更が反映される

### エンドツーエンド確認

実際のTailwind v4プロジェクトで動作確認:

```bash
# Tailwind v4プロジェクトで実行
npx tailwind-variables-viewer -c ./src/app.css -o
```

**確認項目**:
- 全テーマ変数が抽出されている
- ネームスペースが正しく分類されている
- ビジュアルプレビューが適切
- パフォーマンスが許容範囲（起動~0.5秒）

## 成功基準

### 機能要件

1. **CLI動作**
   - [x] 引数パース（-c, -p, -o）
   - [x] ファイル存在確認
   - [x] わかりやすいエラーメッセージ
   - [x] Graceful shutdown

2. **パーサー動作**
   - [x] 全@theme変数抽出
   - [x] ネームスペース分類
   - [x] エッジケース処理
   - [x] リセットパターン対応
   - [x] デフォルト変数統合

3. **サーバー動作**
   - [x] Vite dev server起動
   - [x] 静的ファイル配信（/api/variables.json）
   - [x] ポート自動検索
   - [x] HMR（ホットリロード）

4. **フロントエンド動作**
   - [x] 全変数表示
   - [x] タイプ別プレビュー（色、サイズ、フォント）
   - [x] コピー機能
   - [x] 検索機能
   - [x] ネームスペース別表示
   - [x] レスポンシブデザイン

### 品質要件

1. **エラーハンドリング**
   - [x] 予期されるエラーは全てキャッチ
   - [x] 明確なエラーメッセージ
   - [x] graceful degradation

2. **パフォーマンス**
   - [x] 380個の変数で 0.5秒以内に起動
   - [x] UIの応答速度が良好
   - [x] メモリ使用が適切

3. **ドキュメント**
   - [x] architecture.md完備
   - [x] data-structures.md完備
   - [x] ADRで意思決定を記録

## パフォーマンス実績

- **起動時間**: ~0.5秒 (目標: 2秒以内)
- **CSS解析**: <10ms (目標: 100ms以内)
- **サーバー応答**: <20ms (目標: 50ms以内)
- **フロントエンド初期表示**: <500ms (目標: 1秒以内)
- **検索応答**: 即座（<10ms） (目標: <100ms)
