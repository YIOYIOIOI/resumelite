import z from "zod";

// A single record in the personal "project experience" library: an evidence-based
// account of one project the user worked on, used to browse/organise experiences and
// (later) to feed AI-assisted resume writing.

// Mirrors the resume `websiteSchema` shape ({ url, label }); defined locally so this
// module has no cross-subpath value import (which the Vite config loader cannot resolve).
const experienceLinkSchema = z.object({
	url: z.string(),
	label: z.string(),
});

export const experienceNatureSchema = z
	.enum(["work", "side-project", "open-source", "academic", "volunteer", "freelance"])
	.describe("What kind of engagement this project was.");

export const experienceStageSchema = z
	.enum(["idea", "in-progress", "shipped", "paused", "archived"])
	.describe("The current lifecycle stage of the project.");

export const experienceDataSchema = z.object({
	title: z.string().describe("Short name of the project or the thing you built."),
	role: z.string().describe("Your specific role or contribution — what YOU did, not the team."),
	// Enums use .catch for forward-compatibility with future values (coerced, not rejected).
	nature: experienceNatureSchema.catch("work"),
	stage: experienceStageSchema.catch("in-progress"),
	period: z.string().describe("Free-text time span, e.g. '2024 — Present' or 'Jun–Sep 2023'."),
	summary: z.string().describe("One or two plain sentences: what it is, factually."),
	details: z.string().describe("Rich-text: what you actually did, the structure, and verifiable outcomes."),
	// Not .catch: a structurally-broken value should surface (revive skips + logs) rather than
	// silently blanking real content — important for the downstream AI-matching feature.
	techStack: z.array(z.string()).describe("Tools, languages, frameworks, and methods actually used."),
	link: experienceLinkSchema.describe("Optional repo/demo link."),
});

export type ExperienceData = z.infer<typeof experienceDataSchema>;
export type ExperienceNature = z.infer<typeof experienceNatureSchema>;
export type ExperienceStage = z.infer<typeof experienceStageSchema>;
