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
      <div class="p-4 text-red-800 bg-red-50 border border-red-200 rounded">
        <h2>Error</h2>
        <p class="mt-2">${errorMessage}</p>
      </div>
    `;
		}
	});

function renderVariables(variables: OrganizedVariables): void {
	const container = document.getElementById("variables");
	if (!container) return;

	if (!variables || Object.keys(variables).length === 0) {
		container.innerHTML = `
      <div class="p-8 text text-center">
        <h2 class="text-2xl font-semibold text-gray-700">No variables found</h2>
        <p class="mt-3 text-gray-500">Make sure your CSS files contain <code class="bg-gray-100 py-1 px-2 rounded text-sm">@theme</code> directives.</p>
      </div>
    `;
		return;
	}

	const html = Object.entries(variables)
		.map(
			([namespace, vars]) => `
    <section class="not-first:mt-12">
      <h2 class="text-2xl md:text-xl font-semibold leading-tight text-gray-700 capitalize">
        ${namespace} <span class="text-sm font-normal text-gray-500">(${vars.length})</span>
      </h2>
      <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        ${vars
					.map(
						(v) => `
          <div class="flex flex-col gap-3 bg-white" data-var-name="${v.varName}">
            ${renderPreview(v)}
            <div class="flex flex-col gap-1">
              <code class="px-2 py-1 font-mono text-sm text-gray-700 break-all">${v.varName}</code>
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
		return `<div class="min-w-0.5 max-w-full h-10 bg-blue-500 rounded" style="width: ${displayValue}"></div>`;
	}
	if (variable.type === "font") {
		return `<div class="p-2 text-base leading-normal bg-gray-50 border border-gray-200 rounded" style="font-family: ${displayValue}">The quick brown fox</div>`;
	}
	return "";
}
