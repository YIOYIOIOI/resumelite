import { describe, expect, it } from "vitest";
import { experienceDataSchema } from "./data";
import { defaultExperienceData } from "./default";

describe("experienceDataSchema", () => {
	it("parses the default experience data", () => {
		expect(experienceDataSchema.safeParse(defaultExperienceData).success).toBe(true);
	});

	it("coerces an unknown nature/stage to a safe default (forward-compat)", () => {
		const parsed = experienceDataSchema.parse({
			...defaultExperienceData,
			nature: "something-new",
			stage: "who-knows",
		});

		expect(parsed.nature).toBe("work");
		expect(parsed.stage).toBe("in-progress");
	});

	it("rejects a structurally invalid techStack instead of silently blanking it", () => {
		expect(experienceDataSchema.safeParse({ ...defaultExperienceData, techStack: "react, node" }).success).toBe(false);
	});

	it("keeps a real techStack and link", () => {
		const parsed = experienceDataSchema.parse({
			...defaultExperienceData,
			title: "Checkout rebuild",
			techStack: ["TypeScript", "PostgreSQL"],
			link: { url: "https://example.com", label: "Repo" },
		});

		expect(parsed.techStack).toEqual(["TypeScript", "PostgreSQL"]);
		expect(parsed.link).toEqual({ url: "https://example.com", label: "Repo" });
	});
});
