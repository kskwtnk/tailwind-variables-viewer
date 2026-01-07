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
		renderSidebar(variables);
		renderVariables(variables);
	})
	.catch((error) => {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const container = document.getElementById("variables");
		if (container) {
			container.innerHTML = `
      <div class="p-4 text-red-800 bg-red-50 border border-red-200 rounded-md">
        <h2>Error</h2>
        <p class="mt-1">${errorMessage}</p>
      </div>
    `;
		}
	});

function renderSidebar(variables: OrganizedVariables): void {
	const nav = document.getElementById("sidebar-nav");
	if (!nav) return;

	if (!variables || Object.keys(variables).length === 0) {
		nav.innerHTML = '<p class="text-sm text-gray-500 px-3">No sections</p>';
		return;
	}

	const links = Object.entries(variables)
		.map(
			([namespace, vars]) => `
      <a
        href="#${namespace}"
        class="px-3 py-2 text-sm rounded-md hover:bg-gray-100 block transition-colors"
      >
        <span class="capitalize">${namespace}</span>
        <span class="text-gray-500">(${vars.length})</span>
      </a>
    `,
		)
		.join("");

	nav.innerHTML = links;
}

function renderVariables(variables: OrganizedVariables): void {
	const container = document.getElementById("variables");
	if (!container) return;

	if (!variables || Object.keys(variables).length === 0) {
		container.innerHTML = `
      <div class="p-6 text text-center">
        <h2 class="text-2xl font-semibold text-gray-700">No variables found</h2>
        <p class="mt-3 text-gray-500">Make sure your CSS files contain <code class="bg-gray-100 py-1 px-2 rounded text-sm">@theme</code> directives.</p>
      </div>
    `;
		return;
	}

	const html = Object.entries(variables)
		.map(
			([namespace, vars]) => `
    <section id="${namespace}" class="not-first:mt-12 scroll-mt-8">
      <h2 class="text-2xl font-semibold text-gray-700 capitalize">
        ${namespace} <span class="text-sm font-normal text-gray-500">(${vars.length})</span>
      </h2>
      <div class="mt-4 grid-cols-[repeat(auto-fill,minmax(--spacing(50),1fr))] gap-4 grid">
        ${vars
					.map(
						(v) => `
          <div class="gap-3 bg-white flex flex-col" data-var-name="${v.varName}">
            ${renderPreview(v)}
            <div class="gap-1 flex flex-col">
              <code class="py-1 font-mono text-sm text-gray-700 break-all">${v.varName}</code>
              <span class="text-xs text-gray-500 break-all">${v.value}</span>
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
		return `<div class="w-full h-20 border border-gray-200 rounded" style="background: ${displayValue}"></div>`;
	}
	if (variable.type === "size") {
		return `<div class="min-w-0.5 max-w-full h-5 bg-blue-500 rounded" style="width: ${displayValue}"></div>`;
	}
	if (variable.type === "font") {
		return `<div class="p-2 text-base leading-normal bg-gray-50 border border-gray-200 rounded" style="font-family: ${displayValue}">The quick brown fox</div>`;
	}
	return "";
}
