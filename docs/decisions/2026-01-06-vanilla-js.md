# ADR-002: フロントエンド実装の変更（2026年1月6日）

## 状態
採用

## コンテキスト
Phase 4でSvelte 5を使ってフロントエンドを実装したが、以下の点が判明した：

**実装した機能**:
- 検索フィルタリング（テキスト入力による絞り込み）
- 変数カード表示
- クリップボードコピー機能

**問題点**:
1. Svelte 5のルーン（`$state`, `$derived`, `$props`等）の学習コストが高い
2. `mount`関数への移行など、破壊的変更への対応が必要
3. 実装した機能がシンプルで、Vanilla JSでも十分実装可能
4. 依存関係を最小化するという当初の方針と矛盾

**要件の再確認**:
- 検索フィルタリング（1つのテキスト入力）
- 将来的な拡張予定は不明確
- 「最小限の依存関係」が重要な設計方針

## 決定

Svelteを**廃止**し、Vanilla JSに戻す。

**理由**:
1. **実装の複雑性**: 現在の機能はVanilla JSで十分実装可能
2. **依存関係削減**: `svelte`と`@sveltejs/vite-plugin-svelte`を削除（開発依存2個減）
3. **保守性**: Svelteのバージョンアップ（破壊的変更）への追従が不要
4. **バンドルサイズ**: Vanilla JSの方がさらに軽量（~1-2KB vs ~12KB）
5. **学習コスト**: プロジェクトに参加する開発者の障壁が低い

**Svelteを維持する場合のメリット**:
- 複雑な状態管理が必要になった場合の拡張性
- コンポーネント化による保守性

**判断**:
現時点では「将来の拡張性」よりも「最小限の依存関係」を優先する。
将来的に複雑な機能が必要になった場合は、その時点で再検討する（YAGNI原則）。

## 影響

**依存関係の変更**:
- 削除: `svelte`, `@sveltejs/vite-plugin-svelte`
- コア依存: 5個（変更なし）
- 開発依存: 4個 → 2個
- 総依存: 9個 → 7個

**ファイル構成の変更**:
```diff
  src/
- ├── App.svelte
- ├── lib/
- │   ├── SearchBar.svelte
- │   ├── NamespaceSection.svelte
- │   └── VariableCard.svelte
- ├── main.ts
+ ├── index.html (インラインJavaScript)
  ├── app.css
- └── vite-env.d.ts
```

**Vanilla JS実装方針**:
- `index.html`に直接JavaScriptを記述
- `<script type="module">`でESモジュール構文を使用
- テンプレートリテラルでHTML生成
- `addEventListener`でイベント処理

## 実装例

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind Variables Viewer</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="app">
    <h1>Tailwind CSS v4 Theme Variables</h1>
    <input type="search" id="search" placeholder="Search variables...">
    <div id="variables"></div>
  </div>

  <script type="module">
    // Fetch and render variables
    fetch('/api/variables.json')
      .then(res => res.json())
      .then(variables => {
        renderVariables(variables);
        setupSearch(variables);
      });

    function renderVariables(variables) {
      const container = document.getElementById('variables');
      const html = Object.entries(variables).map(([namespace, vars]) => `
        <section class="namespace-section">
          <h2>${namespace} <span class="count">(${vars.length})</span></h2>
          <div class="variables-grid">
            ${vars.map(v => `
              <div class="variable-card" data-var-name="${v.varName}">
                ${renderPreview(v)}
                <code class="variable-name">${v.varName}</code>
                <span class="variable-value">${v.value}</span>
                <button class="copy-btn" data-text="${v.varName}">Copy</button>
              </div>
            `).join('')}
          </div>
        </section>
      `).join('');
      container.innerHTML = html;
      setupCopyButtons();
    }

    function setupSearch(variables) {
      const search = document.getElementById('search');
      const cards = document.querySelectorAll('.variable-card');
      search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        cards.forEach(card => {
          const name = card.dataset.varName.toLowerCase();
          card.style.display = name.includes(query) ? '' : 'none';
        });
      });
    }

    function setupCopyButtons() {
      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(btn.dataset.text);
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 2000);
        });
      });
    }

    function renderPreview(variable) {
      if (variable.type === 'color') {
        return `<div class="color-swatch" style="background: ${variable.value}"></div>`;
      }
      if (variable.type === 'size') {
        return `<div class="size-bar" style="width: ${variable.value}"></div>`;
      }
      if (variable.type === 'font') {
        return `<div class="font-sample" style="font-family: ${variable.value}">The quick brown fox</div>`;
      }
      return '';
    }
  </script>
</body>
</html>
```

## メリット

1. **依存関係削減**: 総依存7個（Svelteから2個削減）
2. **保守性向上**: フレームワークのバージョンアップ対応不要
3. **シンプル**: 1ファイルで完結
4. **軽量**: バンドルサイズ最小化
5. **学習コスト**: 標準Web APIのみ

## 将来の再検討ポイント

以下の機能が必要になった場合、Svelteまたは他のフレームワークを再検討：
- 複数の検索フィルター（AND/OR条件）
- ソート機能の複数パターン
- 変数の編集機能
- 設定画面（ユーザー設定の保存）
- ページネーション
- 複雑な状態管理が必要な機能
