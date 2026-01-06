import type { OrganizedVariables, OrganizedVariable } from '../lib/types.js';

// Fetch and render variables
fetch('/api/variables.json')
  .then(res => {
    if (!res.ok) {
      throw new Error('Failed to fetch variables');
    }
    return res.json() as Promise<OrganizedVariables>;
  })
  .then(variables => {
    renderVariables(variables);
    setupSearch();
    setupCopyButtons();
  })
  .catch(error => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    document.getElementById('variables')!.innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>${errorMessage}</p>
      </div>
    `;
  });

function renderVariables(variables: OrganizedVariables): void {
  const container = document.getElementById('variables')!;

  if (!variables || Object.keys(variables).length === 0) {
    container.innerHTML = `
      <div class="empty">
        <h2>No variables found</h2>
        <p>Make sure your CSS files contain @theme directives.</p>
      </div>
    `;
    return;
  }

  const html = Object.entries(variables).map(([namespace, vars]) => `
    <section class="namespace-section">
      <h2>${namespace} <span class="count">(${vars.length})</span></h2>
      <div class="variables-grid">
        ${vars.map(v => `
          <div class="variable-card" data-var-name="${v.varName}">
            ${renderPreview(v)}
            <div class="variable-info">
              <code class="variable-name">${v.varName}</code>
              <span class="variable-value">${v.value}</span>
            </div>
            <button class="copy-btn" data-text="${v.varName}">Copy</button>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');

  container.innerHTML = html;
}

function renderPreview(variable: OrganizedVariable): string {
  // 解決済みの値があればそれを使用、なければ元の値
  const displayValue = variable.resolvedValue || variable.value;

  if (variable.type === 'color') {
    return `<div class="color-swatch" style="background: ${displayValue}"></div>`;
  }
  if (variable.type === 'size') {
    return `<div class="size-bar" style="width: ${displayValue}"></div>`;
  }
  if (variable.type === 'font') {
    return `<div class="font-sample" style="font-family: ${displayValue}">The quick brown fox</div>`;
  }
  return '';
}

function setupSearch(): void {
  const search = document.getElementById('search') as HTMLInputElement;
  search.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const query = target.value.toLowerCase();
    const cards = document.querySelectorAll('.variable-card');

    cards.forEach(card => {
      const htmlCard = card as HTMLElement;
      const name = htmlCard.dataset.varName?.toLowerCase() || '';
      htmlCard.style.display = name.includes(query) ? '' : 'none';
    });

    // Hide empty namespaces
    const sections = document.querySelectorAll('.namespace-section');
    sections.forEach(section => {
      const htmlSection = section as HTMLElement;
      const visibleCards = section.querySelectorAll('.variable-card[style=""], .variable-card:not([style*="display: none"])');
      htmlSection.style.display = visibleCards.length > 0 ? '' : 'none';
    });
  });
}

function setupCopyButtons(): void {
  document.getElementById('variables')!.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('copy-btn')) {
      const btn = target as HTMLButtonElement;
      const text = btn.dataset.text || '';

      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  });
}
