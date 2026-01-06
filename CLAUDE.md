# Tailwind CSS Theme Variables Viewer

このプロジェクトは、Tailwind CSS v4の`@theme`ディレクティブで定義されたテーマ変数を可視化するCLIツールです。

## プロジェクト概要

参考: [tailwind-config-viewer](https://github.com/rogden/tailwind-config-viewer/) (v3対応版)

### 目標

- CLIツール形式（`npx tailwind-variables-viewer`で実行可能）
- 最小限の依存関係
- 基本機能に集中（スタイリングはユーザー側で実装）
- CSSファイルを直接パースして@theme変数を抽出

### 技術スタック

- **言語**: TypeScript
- **CLIツール**: Commander
- **パーサー**: PostCSS
- **サーバー**: Vite preview server
- **フロントエンド**: Svelte
- **依存関係**: コア5個 + 開発4個

## ドキュメント構成

詳細な技術仕様とガイドラインは `.claude/rules/` ディレクトリに整理されています:

- **[アーキテクチャ](.claude/rules/architecture.md)**: プロジェクト構成と技術選定
- **[意思決定記録](.claude/rules/architecture-decision-records.md)**: 技術選定の理由と変遷（ADR）
- **[実装ガイド](.claude/rules/implementation/)**: 各コンポーネントの実装詳細
- **[テスト・品質](.claude/rules/testing.md)**: テスト戦略と成功基準
- **[実装フェーズ](.claude/rules/phases.md)**: 段階的な実装計画
- **[データ構造](.claude/rules/data-structures.md)**: 型定義とデータ構造仕様

## クイックスタート

```bash
# 基本使用
npx tailwind-variables-viewer -c ./src/app.css -o

# カスタムポート指定
npx tailwind-variables-viewer -c ./theme.css -p 3001 -o
```

## コミュニケーションルール

- 「完璧です」「完全に理解しました」などの過剰な表現を使わない
  - 世の中はすべて不完全である
  - これらの過剰な表現を使っているにも関わらず実は失敗していた場合、ユーザーに著しいストレスを与えてしまう

### 実装完了時の報告ルール - 絶対に守るルール

**フェーズ1: 実装前のチェック**
- 修正・実装を行う前に、何をするのかを明確に述べる
- ユーザーの了承を得てから実装開始
- 「〜を修正します」と宣言してから実行

**フェーズ2: 実装・修正**
- 実装を行う
- 複数シナリオで実際にテストする
- **全シナリオのテスト結果をコンソール出力で見せる**

**フェーズ3: テスト結果の報告**
```
修正内容: 〜を〜に変更しました

テスト結果:
- Scenario 1: [実際のコンソール出力]
- Scenario 2: [実際のコンソール出力]
- Scenario 3: [実際のコンソール出力]
- Scenario 4: [実際のコンソール出力]

ユーザーの最終確認をお願いします
```

**フェーズ4: 禁止事項（絶対に守る）**
- 「完璧です」を言わない
- 「完成しました」を言わない
- 「✅」「🎉」などの完了を示す絵文字を使わない
- 「もう大丈夫」と保証する言葉を使わない
- テスト結果を見せずに「動作確認済み」と言わない

**フェーズ5: 必ずユーザーに任せる**
- 「〜で動作確認しました」と事実のみ述べる
- その後は常に「ユーザーの確認待ち」状態
- ユーザーが「OK」と言うまで、確定的な発言をしない
