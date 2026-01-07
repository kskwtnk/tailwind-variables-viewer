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
			<div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
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
		nav.innerHTML = '<p class="px-3 text-sm text-gray-500">No sections</p>';
		return;
	}

	// NAMESPACE_ORDERに基づいてフィルタリング＋並び替え
	const orderedEntries = NAMESPACE_ORDER.filter((ns) => variables[ns]).map(
		(ns) => [ns, variables[ns]] as const,
	);

	const links = orderedEntries
		.map(
			([namespace, vars]) => `
			<a
				href="#${namespace}"
				class="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100"
			>
				<span class="capitalize">${namespace}</span>
				<span class="text-gray-500">(${vars.length})</span>
			</a>
		`,
		)
		.join("");

	nav.innerHTML = links;
}

// ネームスペースの表示順序（コメントアウトで段階的に追加可能）
const NAMESPACE_ORDER = [
	"color",
	// "fontSize",
	// "spacing",
	// "shadow",
	// "radius",
	// "breakpoint",
	// "fontFamily",
];

/**
 * 変数名から色名グループを抽出
 * 例: "red-500" → "red", "foo-bar" → "foo", "foo-bar-baz" → "foo"
 */
function extractColorGroup(name: string): string {
	const parts = name.split("-");
	return parts[0] || name;
}

/**
 * 変数を色名グループごとに分類
 */
function groupByColorName(
	vars: OrganizedVariable[],
): Map<string, OrganizedVariable[]> {
	const groups = new Map<string, OrganizedVariable[]>();

	for (const v of vars) {
		const colorGroup = extractColorGroup(v.name);
		if (!groups.has(colorGroup)) {
			groups.set(colorGroup, []);
		}
		groups.get(colorGroup)?.push(v);
	}

	return groups;
}

function renderVariables(variables: OrganizedVariables): void {
	const container = document.getElementById("variables");
	if (!container) return;

	if (!variables || Object.keys(variables).length === 0) {
		container.innerHTML = `
			<div class="p-6 text-center">
				<h2 class="text-2xl font-semibold text-gray-700">No variables found</h2>
				<p class="mt-3 text-gray-500">Make sure your CSS files contain <code class="rounded bg-gray-100 px-2 py-1 text-sm">@theme</code> directives.</p>
			</div>
		`;
		return;
	}

	// NAMESPACE_ORDERに基づいてフィルタリング＋並び替え
	const orderedEntries = NAMESPACE_ORDER.filter((ns) => variables[ns]).map(
		(ns) => [ns, variables[ns]] as const,
	);

	const html = orderedEntries
		.map(([namespace, vars]) => {
			// colorネームスペースの場合は色名グループごとに分ける
			if (namespace === "color") {
				const colorGroups = groupByColorName(vars);
				const groupsHtml = Array.from(colorGroups.entries())
					.map(
						([groupName, groupVars]) => `
							<div class="col-span-full grid grid-cols-subgrid gap-y-6">
								<h3 class="col-span-full text-lg font-medium text-gray-600 capitalize">${groupName}</h3>
								<div class="col-span-full grid grid-cols-subgrid gap-y-8">
									${groupVars
										.map(
											(v) => `
												<div class="grid auto-rows-max gap-2" data-var-name="${v.varName}">
													${renderPreview(v)}
													<div class="grid gap-1">
														<code class="font-mono text-sm text-gray-700">${v.varName}</code>
														<span class="text-xs text-gray-500">${v.value}</span>
													</div>
												</div>
											`,
										)
										.join("")}
								</div>
							</div>
						`,
					)
					.join("");

				return `
					<section id="${namespace}" class="grid scroll-mt-8 gap-y-7 wrap-anywhere not-first:mt-12">
						<h2 class="text-2xl font-semibold text-gray-700 capitalize">
							${namespace} <span class="text-sm font-normal text-gray-500">(${vars.length})</span>
						</h2>
						<div class="grid grid-cols-[repeat(auto-fit,minmax(--spacing(40),1fr))] gap-x-4 gap-y-10">
							${groupsHtml}
						</div>
					</section>
				`;
			}

			// その他のネームスペースは従来通り
			return `
				<section id="${namespace}" class="scroll-mt-8 not-first:mt-12">
					<h2 class="text-2xl font-semibold text-gray-700 capitalize">
						${namespace} <span class="text-sm font-normal text-gray-500">(${vars.length})</span>
					</h2>
					<div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(--spacing(50),1fr))] gap-4">
						${vars
							.map(
								(v) => `
							<div class="flex flex-col gap-3 bg-white" data-var-name="${v.varName}">
								${renderPreview(v)}
								<div class="flex flex-col gap-1">
									<code class="py-1 font-mono text-sm break-all text-gray-700">${v.varName}</code>
									<span class="text-xs break-all text-gray-500">${v.value}</span>
								</div>
							</div>
						`,
							)
							.join("")}
					</div>
				</section>
			`;
		})
		.join("");

	container.innerHTML = html;
}

function renderPreview(variable: OrganizedVariable): string {
	// 解決済みの値があればそれを使用、なければ元の値
	const displayValue = variable.resolvedValue || variable.value;

	if (variable.type === "color") {
		return `<div class="h-10 w-full rounded-md after:block after:h-full after:rounded-md after:border after:border-gray-200 after:mix-blend-multiply after:content-['']" style="background: ${displayValue}"></div>`;
	}
	if (variable.type === "size") {
		return `<div class="h-5 max-w-full min-w-0.5 rounded-md bg-blue-500" style="width: ${displayValue}"></div>`;
	}
	if (variable.type === "font") {
		return `<div class="rounded-md border border-gray-200 bg-gray-50 p-2 text-base leading-normal" style="font-family: ${displayValue}">The quick brown fox</div>`;
	}
	return "";
}
