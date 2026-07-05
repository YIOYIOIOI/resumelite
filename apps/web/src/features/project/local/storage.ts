import type {
	CreateLocalExperienceInput,
	LocalExperience,
	LocalExperienceListItem,
	LocalExperienceSort,
	UpdateLocalExperienceInput,
} from "./types";
import { defaultExperienceData } from "@resumelite/schema/project/default";
import { LOCAL_EXPERIENCE_ID_PREFIX } from "./types";

export type {
	CreateLocalExperienceInput,
	LocalExperience,
	LocalExperienceListItem,
	LocalExperienceSort,
	UpdateLocalExperienceInput,
};
export { LOCAL_EXPERIENCE_ID_PREFIX };

export async function listLocalExperiences(input: {
	tags: string[];
	sort: LocalExperienceSort;
}): Promise<LocalExperienceListItem[]> {
	const query = new URLSearchParams({ sort: input.sort });
	for (const tag of input.tags) query.append("tags", tag);

	return (await requestLocalApi<Array<ApiLocalExperienceListItem>>(`/api/local/experiences?${query}`)).map(
		reviveListItem,
	);
}

export async function listLocalExperienceTags(): Promise<string[]> {
	return requestLocalApi<string[]>("/api/local/experiences/tags");
}

export async function getLocalExperienceById(id: string): Promise<LocalExperience | null> {
	const response = await fetch(`/api/local/experiences/${encodeURIComponent(id)}`, { method: "GET" });
	if (response.status === 404) return null;
	return reviveExperience(await readLocalApiResponse<ApiLocalExperience>(response));
}

export async function createLocalExperience(input: CreateLocalExperienceInput): Promise<LocalExperience> {
	return reviveExperience(
		await requestLocalApi<ApiLocalExperience>("/api/local/experiences", {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "POST",
		}),
	);
}

export async function updateLocalExperience(id: string, input: UpdateLocalExperienceInput): Promise<LocalExperience> {
	return reviveExperience(
		await requestLocalApi<ApiLocalExperience>(`/api/local/experiences/${encodeURIComponent(id)}`, {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "PATCH",
		}),
	);
}

export async function duplicateLocalExperience(
	id: string,
	input: Pick<CreateLocalExperienceInput, "name" | "slug" | "tags">,
): Promise<LocalExperience> {
	return reviveExperience(
		await requestLocalApi<ApiLocalExperience>(`/api/local/experiences/${encodeURIComponent(id)}/duplicate`, {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "POST",
		}),
	);
}

export async function deleteLocalExperience(id: string): Promise<void> {
	await requestLocalApi<void>(`/api/local/experiences/${encodeURIComponent(id)}`, { method: "DELETE" });
}

type ApiLocalExperience = Omit<LocalExperience, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

type ApiLocalExperienceListItem = Omit<LocalExperienceListItem, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

const jsonHeaders = { "Content-Type": "application/json" };

async function requestLocalApi<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, init);
	return readLocalApiResponse<T>(response);
}

async function readLocalApiResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const payload = await readJsonResponse<{ error?: string }>(response);
		throw new Error(payload?.error || `Local experience request failed: ${response.status}`);
	}

	if (response.status === 204) return undefined as T;
	return readJsonResponse<T>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
	return response.json() as Promise<T>;
}

function reviveExperience(experience: ApiLocalExperience): LocalExperience {
	return {
		...experience,
		data: experience.data ?? defaultExperienceData,
		tags: [...experience.tags],
		createdAt: new Date(experience.createdAt),
		updatedAt: new Date(experience.updatedAt),
	};
}

function reviveListItem(experience: ApiLocalExperienceListItem): LocalExperienceListItem {
	return {
		...experience,
		tags: [...experience.tags],
		createdAt: new Date(experience.createdAt),
		updatedAt: new Date(experience.updatedAt),
	};
}
