import type { TemplatePreset } from "@resumelite/schema/resume/template-preset";
import { z } from "zod";
import { templatePresetSchema } from "@resumelite/schema/resume/template-preset";

// The community template gallery is hosted as a plain GitHub repo. The app only ever reads
// public JSON + images from it — nothing is executed, and a shared template is pure data
// (see template-preset.ts). Contributing a template is a pull request to that repo.
const REPO_BASE = "https://raw.githubusercontent.com/YIOYIOIOI/resumelite-templates/main";

export const communityTemplateSchema = z.object({
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits, and dashes"),
	name: z.string().min(1),
	author: z.string().optional(),
	tags: z.array(z.string()).catch([]),
	preview: z.string().min(1),
});

export type CommunityTemplate = z.infer<typeof communityTemplateSchema>;

const indexSchema = z.object({ templates: z.array(communityTemplateSchema) });

function toAbsolute(pathOrUrl: string): string {
	return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${REPO_BASE}/${pathOrUrl.replace(/^\/+/, "")}`;
}

// Load the list of community templates. Throws on network/parse failure so the UI can fall
// back to file import.
export async function fetchCommunityTemplates(signal?: AbortSignal): Promise<CommunityTemplate[]> {
	const response = await fetch(`${REPO_BASE}/index.json`, { signal, cache: "no-cache" });
	if (!response.ok) throw new Error(`Failed to load the template index (${response.status})`);

	const parsed = indexSchema.safeParse(await response.json());
	if (!parsed.success) throw new Error("The template index is malformed.");

	return parsed.data.templates.map((template) => ({ ...template, preview: toAbsolute(template.preview) }));
}

// Download and validate a single community template preset by slug.
export async function fetchCommunityPreset(slug: string, signal?: AbortSignal): Promise<TemplatePreset> {
	if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid template slug.");

	const response = await fetch(`${REPO_BASE}/templates/${slug}/template.json`, { signal, cache: "no-cache" });
	if (!response.ok) throw new Error(`Failed to load the template (${response.status})`);

	const parsed = templatePresetSchema.safeParse(await response.json());
	if (!parsed.success) throw new Error("The template file is malformed.");

	return parsed.data;
}
