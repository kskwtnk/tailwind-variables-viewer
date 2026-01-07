import "./app.css";
import type { OrganizedVariable, OrganizedVariables } from "../core/types.js";

// Fetch and render variables
fetch("/api/variables.json")
	.then((res) => {
		if (!res.ok) {
			throw new Error("Failed to fetch variables");
		}
		return res.json() as Promise<OrganizedVariables>;
	})
	.then((variables) => {
		renderVariables(variables);
	})
	.catch((error) => {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const container = document.getElementById("variables");
		if (container) {
			container.innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>${errorMessage}</p>
      </div>
    `;
		}
	});

function renderVariables(variables: OrganizedVariables): void {
	const container = document.getElementById("variables");
	if (!container) return;

	if (!variables || Object.keys(variables).length === 0) {
		container.innerHTML = `
      <div class="empty">
        <h2>No variables found</h2>
        <p>Make sure your CSS files contain @theme directives.</p>
      </div>
    `;
		return;
	}

	const html = Object.entries(variables)
		.map(
			([namespace, vars]) => `
    <section class="namespace-section">
      <h2>${namespace} <span class="count">(${vars.length})</span></h2>
      <div class="variables-grid">
        ${vars
					.map(
						(v) => `
          <div class="variable-card" data-var-name="${v.varName}">
            ${renderPreview(v)}
            <div class="variable-info">
              <code class="variable-name">${v.varName}</code>
              <span class="variable-value">${v.value}</span>
            </div>
          </div>
        `,
					)
					.join("")}
      </div>
    </section>
  `,
		)
		.join("");

	container.innerHTML = html;
}

function renderPreview(variable: OrganizedVariable): string {
	// 解決済みの値があればそれを使用、なければ元の値
	const displayValue = variable.resolvedValue || variable.value;

	if (variable.type === "color") {
		return `<div class="color-swatch" style="background: ${displayValue}"></div>`;
	}
	if (variable.type === "size") {
		return `<div class="size-bar" style="width: ${displayValue}"></div>`;
	}
	if (variable.type === "font") {
		return `<div class="font-sample" style="font-family: ${displayValue}">The quick brown fox</div>`;
	}
	return "";
}
