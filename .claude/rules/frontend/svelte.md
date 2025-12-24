---
paths:
  - "src/**/*.svelte"
  - "src/main.ts"
---

# Svelteフロントエンド実装ガイド

## 概要

Svelteを使用したシンプルで高速なUIで、テーマ変数を視覚的に表示します。

## ファイル構成

```
src/
├── App.svelte                  # メインアプリコンポーネント
├── lib/
│   ├── VariableCard.svelte    # 変数表示カード
│   ├── NamespaceSection.svelte # ネームスペースセクション
│   └── SearchBar.svelte        # 検索バー
├── main.ts                     # エントリーポイント
├── app.css                     # グローバルスタイル
└── vite-env.d.ts              # Vite型定義
```

## 設計方針

- **コンポーネントベース**: 再利用可能な小さなコンポーネント
- **型安全**: TypeScriptを活用した型定義
- **リアクティブ**: Svelteのリアクティビティで状態管理
- **最小限のスタイル**: 構造的スタイルのみ（装飾はユーザーが追加）
- **拡張可能**: ユーザーがカスタマイズしやすい

## main.ts（エントリーポイント）

```typescript
import App from './App.svelte';
import './app.css';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
```

**役割**:
- Svelteアプリの初期化
- グローバルスタイル読み込み
- DOM要素へのマウント

---

## App.svelte（メインコンポーネント）

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { OrganizedVariables } from '../lib/types';
  import SearchBar from './lib/SearchBar.svelte';
  import NamespaceSection from './lib/NamespaceSection.svelte';

  let variables: OrganizedVariables | null = null;
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';

  // 変数取得
  onMount(async () => {
    try {
      const response = await fetch('/api/variables');
      if (!response.ok) {
        throw new Error('Failed to fetch variables');
      }
      variables = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });

  // 検索フィルタリング
  $: filteredVariables = variables && searchQuery
    ? Object.entries(variables).reduce((acc, [namespace, vars]) => {
        const filtered = vars.filter(v =>
          v.varName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[namespace] = filtered;
        }
        return acc;
      }, {} as OrganizedVariables)
    : variables;
</script>

<div class="app">
  <header>
    <h1>Tailwind CSS v4 Theme Variables</h1>
    <SearchBar bind:value={searchQuery} />
  </header>

  <main>
    {#if loading}
      <p>Loading variables...</p>
    {:else if error}
      <div class="error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    {:else if filteredVariables}
      {#each Object.entries(filteredVariables) as [namespace, vars]}
        <NamespaceSection {namespace} {vars} />
      {/each}
    {:else}
      <div class="empty">
        <h2>No variables found</h2>
        <p>Make sure your CSS files contain @theme directives.</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
  }

  header {
    padding: 1rem;
    border-bottom: 1px solid #e5e5e5;
  }

  main {
    padding: 1rem;
  }

  .error,
  .empty {
    text-align: center;
    padding: 2rem;
  }
</style>
```

**役割**:
- API からデータ取得
- 状態管理（loading, error, variables）
- 検索フィルタリング（リアクティブ）
- レイアウト

**Svelteの特徴**:
- `onMount`: ライフサイクルフック
- `$:`: リアクティブステートメント（自動再計算）
- `{#if}...{:else}`: 条件分岐
- `{#each}`: ループ
- `<style>`: スコープ付きCSS

---

## SearchBar.svelte

```svelte
<script lang="ts">
  export let value = '';
</script>

<input
  type="search"
  placeholder="Search variables..."
  bind:value
  class="search-bar"
/>

<style>
  .search-bar {
    width: 100%;
    max-width: 400px;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
  }

  .search-bar:focus {
    outline: none;
    border-color: #3b82f6;
  }
</style>
```

**役割**:
- 検索入力フィールド
- 双方向バインディング（`bind:value`）

---

## NamespaceSection.svelte

```svelte
<script lang="ts">
  import type { OrganizedVariable } from '../../lib/types';
  import VariableCard from './VariableCard.svelte';

  export let namespace: string;
  export let vars: OrganizedVariable[];
</script>

<section class="namespace-section">
  <h2>{namespace} <span class="count">({vars.length})</span></h2>
  <div class="variables-grid">
    {#each vars as variable (variable.varName)}
      <VariableCard {variable} />
    {/each}
  </div>
</section>

<style>
  .namespace-section {
    margin-bottom: 2rem;
  }

  h2 {
    margin-bottom: 1rem;
    text-transform: capitalize;
  }

  .count {
    color: #6b7280;
    font-weight: normal;
    font-size: 0.875rem;
  }

  .variables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
</style>
```

**役割**:
- ネームスペースごとのセクション表示
- 変数カードのグリッドレイアウト
- key指定（`{variable.varName}`）でパフォーマンス最適化

---

## VariableCard.svelte

```svelte
<script lang="ts">
  import type { OrganizedVariable } from '../../lib/types';

  export let variable: OrganizedVariable;

  let copied = false;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(variable.varName);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<div class="variable-card">
  <!-- ビジュアルプレビュー -->
  {#if variable.type === 'color'}
    <div class="color-swatch" style="background: {variable.value}"></div>
  {:else if variable.type === 'size'}
    <div class="size-bar" style="width: {variable.value}"></div>
  {:else if variable.type === 'font'}
    <div class="font-sample" style="font-family: {variable.value}">
      The quick brown fox
    </div>
  {/if}

  <!-- 変数情報 -->
  <div class="variable-info">
    <code class="variable-name">{variable.varName}</code>
    <span class="variable-value">{variable.value}</span>
  </div>

  <!-- コピーボタン -->
  <button class="copy-btn" on:click={copyToClipboard}>
    {copied ? 'Copied!' : 'Copy'}
  </button>
</div>

<style>
  .variable-card {
    padding: 1rem;
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .color-swatch {
    width: 100%;
    height: 80px;
    border-radius: 0.25rem;
    border: 1px solid #e5e5e5;
  }

  .size-bar {
    height: 40px;
    background: #3b82f6;
    border-radius: 0.25rem;
  }

  .font-sample {
    font-size: 1rem;
    line-height: 1.5;
  }

  .variable-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .variable-name {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
    color: #374151;
  }

  .variable-value {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .copy-btn {
    padding: 0.375rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .copy-btn:hover {
    background: #e5e7eb;
  }

  .copy-btn:active {
    background: #d1d5db;
  }
</style>
```

**役割**:
- 変数の視覚的表示
- タイプ別プレビュー（color/size/font）
- クリップボードコピー機能
- コピー成功のフィードバック

**Svelteの特徴**:
- ローカル状態（`let copied = false`）
- イベントハンドラ（`on:click`）
- 条件付きレンダリング（`{#if}`）

---

## Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
```

**ポイント**:
- `svelte()`プラグインで自動的に`.svelte`ファイルを処理
- HMR（Hot Module Replacement）対応
- TypeScriptサポート組み込み

---

## 型定義ファイル

```typescript
// src/vite-env.d.ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

Svelteコンポーネントの型認識に必要。

---

## グローバルスタイル

```css
/* src/app.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  color: #1f2937;
}

h1,
h2,
h3 {
  line-height: 1.2;
}

code {
  font-family: 'Monaco', 'Menlo', monospace;
}
```

**ポイント**:
- リセットCSS
- フォント設定
- 各コンポーネントのスタイルはスコープ付き

---

## 状態管理

Svelteのシンプルなリアクティビティを活用:

```svelte
<script lang="ts">
  // 状態定義
  let count = 0;

  // リアクティブステートメント（自動再計算）
  $: doubled = count * 2;

  // リアクティブブロック（副作用）
  $: {
    console.log(`Count is ${count}`);
  }

  // 関数
  function increment() {
    count += 1; // 自動的にUIが更新される
  }
</script>

<button on:click={increment}>
  Count: {count} (Doubled: {doubled})
</button>
```

**特徴**:
- `let`で状態定義（再代入で自動更新）
- `$:`でリアクティブな派生値
- 複雑なストア不要（小規模アプリ）

---

## コンポーネント間通信

### Props（親→子）

```svelte
<!-- 親 -->
<ChildComponent message="Hello" count={42} />

<!-- 子 -->
<script lang="ts">
  export let message: string;
  export let count: number;
</script>
```

### Events（子→親）

```svelte
<!-- 子 -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ change: string }>();

  function handleClick() {
    dispatch('change', 'new value');
  }
</script>

<button on:click={handleClick}>Click</button>

<!-- 親 -->
<ChildComponent on:change={(e) => console.log(e.detail)} />
```

### Bind（双方向）

```svelte
<!-- 親 -->
<script>
  let value = '';
</script>

<SearchBar bind:value />
<p>Current value: {value}</p>
```

---

## テストケース

- [ ] 変数が正しく表示される
- [ ] カラースウォッチが表示される
- [ ] サイズバーが表示される
- [ ] フォントサンプルが表示される
- [ ] コピーボタンが動作する
- [ ] コピー成功フィードバック表示
- [ ] 検索フィルターが機能する
- [ ] 空データの表示
- [ ] エラー表示
- [ ] レスポンシブ対応

---

## 開発コマンド

```bash
# 開発サーバー起動（HMR有効）
bun run dev

# ビルド
bun run build

# 型チェック
bunx svelte-check
```

---

## パフォーマンス最適化

### Key指定

```svelte
{#each items as item (item.id)}
  <Item {item} />
{/each}
```

keyを指定することで、リストの更新が効率的に。

### 遅延ロード

```svelte
<script>
  import { onMount } from 'svelte';

  let HeavyComponent;

  onMount(async () => {
    HeavyComponent = (await import('./HeavyComponent.svelte')).default;
  });
</script>

{#if HeavyComponent}
  <svelte:component this={HeavyComponent} />
{/if}
```

### メモ化

```svelte
<script>
  let items = [...];

  // 自動的にメモ化される（依存値が変わらない限り再計算されない）
  $: expensiveValue = items.reduce((sum, item) => sum + item.value, 0);
</script>
```

---

## カスタマイズガイド

ユーザーがカスタマイズしやすいポイント:

1. **スタイル**: 各`.svelte`ファイルの`<style>`セクション
2. **レイアウト**: グリッド・フレックス設定
3. **カラーテーマ**: CSS変数でテーマ化
4. **新機能追加**: 新しい`.svelte`コンポーネント作成
5. **フィルター拡張**: `App.svelte`の`filteredVariables`ロジック

---

## Svelteのメリット

1. **軽量**: ランタイム~2KB
2. **高速**: 仮想DOM不使用
3. **シンプル**: 学習コスト低い
4. **TypeScript**: 完全サポート
5. **DX**: 優れた開発体験
6. **コンパイル時最適化**: 未使用コード削除
