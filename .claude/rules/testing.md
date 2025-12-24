# テスト戦略と品質基準

## テストアプローチ

このプロジェクトは最初のバージョンでは手動テストを中心に行います。
自動テストは将来のイテレーションで追加可能です。

## パーサー（lib/parser.ts）

### 必須テストケース

- [ ] **単一@themeブロック**: 1つの@themeブロックから変数を抽出
- [ ] **複数@themeブロック**: 同一ファイル内の複数ブロック処理
- [ ] **複数CSSファイル**: 複数ファイルからの変数収集
- [ ] **空の@theme**: 変数のない@themeブロック（エラーなし）
- [ ] **@themeなし**: @themeディレクティブを含まないCSS（警告のみ）
- [ ] **不正なCSS**: 構文エラーのあるCSS（graceful degradation）
- [ ] **CSSコメント**: コメントを含むCSS（正しく無視）
- [ ] **複雑な値**: calc(), var()参照を含む値

### テスト用サンプルCSS

```css
/* test/fixtures/basic.css */
@theme {
  --color-primary: oklch(0.5 0.2 240);
  --color-secondary: oklch(0.6 0.15 180);
  --spacing-4: 1rem;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

```css
/* test/fixtures/multiple-blocks.css */
@theme {
  --color-red: #ff0000;
}

@theme {
  --color-blue: #0000ff;
}
```

```css
/* test/fixtures/complex.css */
@theme {
  --color-base: oklch(0.5 0.2 240);
  --color-hover: var(--color-base);
  --spacing-auto: calc(100% - 2rem);
}
```

## 変数抽出（lib/extractor.ts）

### 必須テストケース

- [ ] **ネームスペース検出**: 各プレフィックスが正しく分類される
- [ ] **カスタムネームスペース**: 未知のプレフィックスは`other`に分類
- [ ] **タイプ判定**: color/size/font/referenceの正確な判定
- [ ] **短縮名抽出**: プレフィックス除去が正しい
- [ ] **ソート**: spacingが数値順、他はアルファベット順
- [ ] **重複処理**: 同名変数の上書き
- [ ] **空の入力**: エラーなく空オブジェクトを返す

### 検証コマンド

```typescript
// TypeScript/Node ESMで検証
import { organizeVariables } from './lib/extractor.js';
const parsed = [...]; // パーサーの出力
const organized = organizeVariables(parsed);
console.log(organized);
```

## CLI（cli/index.ts）

### 必須テストケース

- [ ] **引数なし**: エラーメッセージとヘルプ表示
- [ ] **有効なファイル**: 正常起動
- [ ] **無効なファイル**: ファイル不存在エラー
- [ ] **複数ファイル**: `-c file1.css -c file2.css`で動作
- [ ] **カスタムポート**: `-p 3001`で指定ポート使用
- [ ] **不正なポート**: エラーメッセージ表示
- [ ] **ブラウザ起動**: `-o`でブラウザが開く
- [ ] **ヘルプ**: `-h`でヘルプ表示
- [ ] **バージョン**: `-v`でバージョン表示
- [ ] **Ctrl+C**: graceful shutdownで終了

### テストコマンド

```bash
# ヘルプ
node cli/index.js -h

# 基本実行
node cli/index.js -c test/fixtures/basic.css

# 複数ファイル
node cli/index.js -c test/fixtures/basic.css -c test/fixtures/colors.css

# カスタムポート
node cli/index.js -c test/fixtures/basic.css -p 3001

# ブラウザ起動
node cli/index.js -c test/fixtures/basic.css -o
```

## サーバー（lib/server.ts）

### 必須テストケース

- [ ] **デフォルトポート**: 3000で起動
- [ ] **カスタムポート**: 指定ポートで起動
- [ ] **ポート自動検索**: 使用中の場合に次のポート検索
- [ ] **API正常応答**: `/api/variables`がJSONを返す
- [ ] **静的ファイル**: フロントエンド配信
- [ ] **404エラー**: 存在しないパスで404
- [ ] **graceful shutdown**: SIGINT処理

### テストコマンド

```bash
# サーバー起動
node cli/index.js -c test/fixtures/basic.css

# 別ターミナルでAPIテスト
curl http://localhost:3000/api/variables

# フロントエンドアクセス
open http://localhost:3000
```

## フロントエンド（src/）

### 必須テストケース

- [ ] **変数表示**: 全変数が表示される
- [ ] **カラースウォッチ**: 色が視覚的に表示される
- [ ] **サイズバー**: スペーシングがバーで表示される
- [ ] **フォントサンプル**: フォントでテキスト表示
- [ ] **コピー機能**: クリックでコピーされる
- [ ] **検索**: 入力で絞り込まれる
- [ ] **空データ**: エラーメッセージ表示
- [ ] **APIエラー**: エラーメッセージ表示
- [ ] **レスポンシブ**: モバイル画面で適切に表示

### ブラウザテスト

```
1. http://localhost:3000を開く
2. 各ネームスペースが表示されることを確認
3. カラースウォッチの色を確認
4. サイズバーの幅を確認
5. フォントサンプルのフォント適用を確認
6. Copyボタンをクリック
7. 検索ボックスに入力して絞り込み確認
8. デベロッパーツールでエラーがないか確認
9. ウィンドウリサイズでレスポンシブ確認
```

## 統合テスト

### エンドツーエンド

実際のTailwind v4プロジェクトでテスト:

```bash
# Tailwind v4プロジェクトで
npx tailwind-variables-viewer -c ./src/app.css -o

# 確認事項:
# - 全テーマ変数が抽出されている
# - ネームスペースが正しく分類されている
# - ビジュアルプレビューが適切
# - パフォーマンスが許容範囲
```

## 成功基準

### 機能要件

1. **CLI動作**
   - npxで実行可能
   - 全オプション対応
   - わかりやすいエラーメッセージ

2. **パーサー動作**
   - 全@theme変数抽出
   - ネームスペース分類
   - エッジケース処理

3. **サーバー動作**
   - 安定起動
   - API提供
   - ポート自動検索

4. **フロントエンド動作**
   - 全変数表示
   - プレビュー表示
   - コピー機能
   - 検索機能

### 品質要件

1. **エラーハンドリング**
   - 予期されるエラーは全てキャッチ
   - 明確なエラーメッセージ
   - graceful degradation

2. **パフォーマンス**
   - 100個の変数で1秒以内に起動
   - UIの応答速度が良好
   - メモリ使用が適切

3. **ドキュメント**
   - README完備
   - 使用例明示
   - トラブルシューティング記載

4. **配布準備**
   - npm公開可能
   - npx動作確認
   - パッケージサイズ適切（<5MB）

## パフォーマンス目標

- **起動時間**: 2秒以内
- **CSS解析**: ファイルあたり100ms以内
- **サーバー応答**: 50ms以内
- **フロントエンド初期表示**: 1秒以内
- **検索応答**: 即座（<100ms）

## セキュリティチェック

- [ ] ファイルパスのサニタイズ
- [ ] XSS対策（innerHTML使用箇所確認）
- [ ] CORS設定適切
- [ ] 依存関係の脆弱性チェック（`npm audit`）

## リリース前チェックリスト

- [ ] 全テストケース通過
- [ ] 実プロジェクトで動作確認
- [ ] README完成
- [ ] package.json完備
- [ ] .gitignore設定
- [ ] LICENSE追加
- [ ] npm audit問題なし
- [ ] ビルド成功
- [ ] npm linkでローカルテスト
- [ ] バージョン番号確定
