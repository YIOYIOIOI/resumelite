import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("templatePages", () => {
	it("registers custom local templates as renderable template pages", () => {
		const registry = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

		expect(registry).toContain('import { AiProductPage } from "./ai-product/AiProductPage";');
		expect(registry).toContain('"ai-product": AiProductPage');
		expect(registry).toContain('import { ScizorPage } from "./scizor/ScizorPage";');
		expect(registry).toContain("scizor: ScizorPage");
	});
});
