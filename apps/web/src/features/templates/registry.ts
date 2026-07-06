import type { TemplatePreset } from "@resumelite/schema/resume/template-preset";
import { z } from "zod";
import { templatePresetSchema } from "@resumelite/schema/resume/template-preset";

// The community template gallery is hosted as a plain GitHub repo. The app only ever reads
// public JSON + images from it — nothing is executed, and a shared template is pure data
// (see template-preset.ts). Contributing a template is a pull request to that repo.
const REPO_BASE = "https://raw.githubusercontent.com/YIOYIOIOI/resumelite-templates/main";
const MAX_RESPONSE_BYTES = 512 * 1024;

export const communityTemplateSchema = z.object({
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits, and dashes"),
	name: z.string().min(1),
	author: z.string().optional(),
	tags: z.array(z.string()).catch([]),
	// A repo-relative path only — never an absolute URL. This pins preview images to the
	// community repo so a template can't smuggle in a third-party tracking pixel.
	preview: z.string().regex(/^[a-z0-9][a-z0-9._/-]*$/i, "preview must be a repo-relative path"),
});

export type CommunityTemplate = z.infer<typeof communityTemplateSchema>;

const indexSchema = z.object({ templates: z.array(communityTemplateSchema) });

// Fetch JSON with a hard size cap, so a malformed/oversized response can't spike memory.
async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(url, { signal, cache: "no-cache" });
	if (!response.ok) throw new Error(`Request failed (${response.status})`);

	const text = await response.text();
	if (text.length > MAX_RESPONSE_BYTES) throw new Error("The response is too large.");

	return JSON.parse(text);
}

// Load the list of community templates. Throws on network/parse failure so the UI can fall
// back to file import.
export async function fetchCommunityTemplates(signal?: AbortSignal): Promise<CommunityTemplate[]> {
	const parsed = indexSchema.safeParse(await fetchJson(`${REPO_BASE}/index.json`, signal));
	if (!parsed.success) throw new Error("The template index is malformed.");

	return parsed.data.templates.map((template) => ({ ...template, preview: `${REPO_BASE}/${template.preview}` }));
}

// Download and validate a single community template preset by slug.
export async function fetchCommunityPreset(slug: string, signal?: AbortSignal): Promise<TemplatePreset> {
	if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid template slug.");

	const parsed = templatePresetSchema.safeParse(
		await fetchJson(`${REPO_BASE}/templates/${slug}/template.json`, signal),
	);
	if (!parsed.success) throw new Error("The template file is malformed.");

	return parsed.data;
}
