import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { templateSchema } from "@resumelite/schema/templates";

const rtlGenericTemplateNames = templateSchema.options.filter((template) => template !== "ai-product");

const templatePages = rtlGenericTemplateNames.map(
	(template) =>
		[
			template,
			fileURLToPath(new URL(`./templates/${template}/${toPascalCase(template)}Page.tsx`, import.meta.url)),
		] as const,
);

function toPascalCase(template: string): string {
	return template
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

describe("RTL PDF fixture", () => {
	it.each(templatePages)("%s wires shared RTL helpers and alignEnd slot", (_template, pagePath) => {
		const source = readFileSync(pagePath, "utf8");

		expect(source).toContain("createRtlStyleHelpers");
		expect(source).toContain("alignEnd");
		expect(source).not.toContain("alignRight");
		expect(source).not.toContain('from "@resumelite/utils/locale"');
	});
});
