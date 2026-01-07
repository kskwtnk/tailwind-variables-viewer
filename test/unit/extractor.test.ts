import { describe, expect, test } from "bun:test";
import { organizeVariables } from "../../src/core/extractor.js";
import type { ParsedCSS } from "../../src/core/types.js";

describe("organizeVariables", () => {
	test("should detect color type from oklch value", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--color-brand-500", value: "oklch(0.65 0.20 200)" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.color).toBeDefined();
		expect(result.color[0].type).toBe("color");
		expect(result.color[0].name).toBe("brand-500");
		expect(result.color[0].varName).toBe("--color-brand-500");
	});

	test("should detect size type from rem value", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--spacing-4", value: "1rem" },
					{ name: "--spacing-custom", value: "2.5rem" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.spacing).toBeDefined();
		expect(result.spacing.length).toBe(2);
		expect(result.spacing[0].type).toBe("size");
		expect(result.spacing[1].type).toBe("size");
	});

	test("should detect font type from quoted string", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--font-sans", value: '"Inter", system-ui, sans-serif' },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.font).toBeDefined();
		expect(result.font[0].type).toBe("font");
		expect(result.font[0].name).toBe("sans");
	});

	test("should detect reference type from var() syntax", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--color-base", value: "oklch(0.5 0.2 240)" },
					{ name: "--color-hover", value: "var(--color-base)" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.color).toBeDefined();
		expect(result.color.length).toBe(2);

		const hoverVar = result.color.find((v) => v.name === "hover");
		expect(hoverVar).toBeDefined();
		expect(hoverVar?.type).toBe("color"); // 解決後の値でタイプ判定
		expect(hoverVar?.resolvedValue).toBe("oklch(0.5 0.2 240)");
	});

	test("should sort spacing variables by number", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--spacing-20", value: "5rem" },
					{ name: "--spacing-4", value: "1rem" },
					{ name: "--spacing-8", value: "2rem" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.spacing).toBeDefined();
		expect(result.spacing[0].name).toBe("4");
		expect(result.spacing[1].name).toBe("8");
		expect(result.spacing[2].name).toBe("20");
	});

	test("should sort color variables alphabetically", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--color-zinc-500", value: "#71717a" },
					{ name: "--color-blue-500", value: "#3b82f6" },
					{ name: "--color-amber-500", value: "#f59e0b" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.color).toBeDefined();
		expect(result.color[0].name).toBe("amber-500");
		expect(result.color[1].name).toBe("blue-500");
		expect(result.color[2].name).toBe("zinc-500");
	});

	test('should classify unknown namespace as "other"', () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [{ name: "--custom-value", value: "123" }],
			},
		];

		const result = organizeVariables(input);
		expect(result.other).toBeDefined();
		expect(result.other[0].namespace).toBe("other");
		expect(result.other[0].name).toBe("custom-value");
	});

	test("should handle empty input", () => {
		const result = organizeVariables([]);
		expect(result).toEqual({});
	});

	test("should handle duplicate variables (last one wins)", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test1.css",
				variables: [{ name: "--color-primary", value: "#ff0000" }],
			},
			{
				filePath: "test2.css",
				variables: [{ name: "--color-primary", value: "#00ff00" }],
			},
		];

		const result = organizeVariables(input);
		expect(result.color).toBeDefined();
		expect(result.color.length).toBe(1);
		expect(result.color[0].value).toBe("#00ff00"); // 最後の値が採用される
	});

	test("should extract short names correctly", () => {
		const input: ParsedCSS[] = [
			{
				filePath: "test.css",
				variables: [
					{ name: "--color-mint-500", value: "#00ff00" },
					{ name: "--spacing-custom-large", value: "5rem" },
				],
			},
		];

		const result = organizeVariables(input);
		expect(result.color[0].name).toBe("mint-500");
		expect(result.spacing[0].name).toBe("custom-large");
	});
});
