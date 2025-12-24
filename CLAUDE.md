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

## 開発

詳細な開発ガイドラインは `.claude/rules/` 内のドキュメントを参照してください。
