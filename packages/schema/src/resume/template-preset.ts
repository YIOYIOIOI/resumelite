import type { Metadata } from "./data";
import { z } from "zod";
import { templateSchema } from "../templates";
import { designSchema, layoutSchema, pageSchema, sectionsSchema, styleRulesSchema, typographySchema } from "./data";

// The "appearance" of a resume — the style subset of its metadata. This is everything a
// shared template captures. It deliberately excludes `notes` (private, author-only) and
// all resume content (basics, sections, summary, picture, …).
export const templateAppearanceSchema = z.object({
	// Strict on import: a preset naming a template this build doesn't have should be rejected
	// (as "not a valid template") rather than silently coerced to a default base template.
	template: templateSchema,
	layout: layoutSchema,
	page: pageSchema,
	design: designSchema,
	typography: typographySchema,
	styleRules: styleRulesSchema,
});

export type TemplateAppearance = z.infer<typeof templateAppearanceSchema>;

// A shareable template file: appearance plus a little metadata about the template itself.
export const templatePresetSchema = z.object({
	formatVersion: z.literal(1),
	name: z.string().min(1).max(80),
	author: z.string().max(80).optional(),
	tags: z.array(z.string().max(40)).catch([]),
	appearance: templateAppearanceSchema,
});

export type TemplatePreset = z.infer<typeof templatePresetSchema>;

// Section IDs a layout can place that every resume has. Anything else in a layout's
// main/sidebar arrays (or a style rule's sectionId) is a custom-section UUID, which is
// private to the resume it came from.
const STANDARD_LAYOUT_IDS: ReadonlySet<string> = new Set(["summary", ...Object.keys(sectionsSchema.shape)]);

type ExtractOptions = {
	name: string;
	author?: string | undefined;
	tags?: string[] | undefined;
};

// Build a shareable preset from a resume's metadata. Content and `notes` are never included.
export function extractPreset(metadata: Metadata, options: ExtractOptions): TemplatePreset {
	const { template, layout, page, design, typography, styleRules } = metadata;
	return {
		formatVersion: 1,
		name: options.name,
		...(options.author ? { author: options.author } : {}),
		tags: options.tags ?? [],
		appearance: { template, layout, page, design, typography, styleRules },
	};
}

// Apply a preset's appearance onto a resume's metadata, keeping the resume's own content
// and notes. References to custom sections the target resume doesn't have are dropped, so
// the imported layout and style rules stay valid.
export function applyPreset(
	preset: TemplatePreset,
	target: Metadata,
	knownCustomSectionIds: readonly string[] = [],
): Metadata {
	const allowed = new Set<string>([...STANDARD_LAYOUT_IDS, ...knownCustomSectionIds]);
	const { template, layout, page, design, typography, styleRules } = preset.appearance;

	const filteredLayout = {
		...layout,
		pages: layout.pages.map((pageLayout) => ({
			...pageLayout,
			main: pageLayout.main.filter((id) => allowed.has(id)),
			sidebar: pageLayout.sidebar.filter((id) => allowed.has(id)),
		})),
	};

	const filteredStyleRules = styleRules.filter(
		(rule) => rule.target.scope !== "sectionId" || allowed.has(rule.target.sectionId),
	);

	return {
		...target,
		template,
		layout: filteredLayout,
		page,
		design,
		typography,
		styleRules: filteredStyleRules,
	};
}
