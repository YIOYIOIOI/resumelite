import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("light local route surface", () => {
	it("does not expose removed server-backed routes in the generated route tree", () => {
		const routeTreeSource = readFileSync(new URL("./routeTree.gen.ts", import.meta.url), "utf-8");

		expect(routeTreeSource).not.toContain('"/auth');
		expect(routeTreeSource).not.toContain('"/agent');
		expect(routeTreeSource).not.toContain('"/dashboard/settings');
		expect(routeTreeSource).not.toContain('"/$username/$slug"');
	});

	it("does not keep a dev proxy for the removed backend server", () => {
		const viteConfigSource = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf-8");

		expect(viteConfigSource).not.toContain("serverProxy");
		expect(viteConfigSource).toContain("/api/local");
		expect(viteConfigSource).not.toContain('"/mcp"');
	});

	it("does not rewrite local picture paths through the removed backend API", () => {
		const pictureSectionSource = readFileSync(
			new URL("./routes/builder/$resumeId/-sidebar/left/sections/picture.tsx", import.meta.url),
			"utf-8",
		);

		expect(pictureSectionSource).not.toContain("`/api");
	});
});
