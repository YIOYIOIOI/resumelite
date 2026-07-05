import type {
	CreateLocalResumeInput,
	LocalResume,
	LocalResumeListItem,
	LocalResumeSort,
	UpdateLocalResumeInput,
} from "./types";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { LOCAL_RESUME_ID_PREFIX } from "./types";

export type { CreateLocalResumeInput, LocalResume, LocalResumeListItem, LocalResumeSort, UpdateLocalResumeInput };
export { LOCAL_RESUME_ID_PREFIX };

export async function listLocalResumes(input: {
	tags: string[];
	sort: LocalResumeSort;
}): Promise<LocalResumeListItem[]> {
	const query = new URLSearchParams({ sort: input.sort });
	for (const tag of input.tags) query.append("tags", tag);

	return (await requestLocalApi<Array<ApiLocalResumeListItem>>(`/api/local/resumes?${query}`)).map(reviveListItem);
}

export async function listLocalTags(): Promise<string[]> {
	return requestLocalApi<string[]>("/api/local/tags");
}

export async function getLocalResumeById(id: string): Promise<LocalResume | null> {
	const response = await fetch(`/api/local/resumes/${encodeURIComponent(id)}`, { method: "GET" });
	if (response.status === 404) return null;
	return reviveResume(await readLocalApiResponse<ApiLocalResume>(response));
}

export async function createLocalResume(input: CreateLocalResumeInput): Promise<LocalResume> {
	return reviveResume(
		await requestLocalApi<ApiLocalResume>("/api/local/resumes", {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "POST",
		}),
	);
}

export function createUntitledLocalResume(): Promise<LocalResume> {
	const now = Date.now();

	return createLocalResume({
		name: "Untitled Resume",
		slug: `untitled-resume-${now}`,
		tags: [],
	});
}

export async function updateLocalResume(id: string, input: UpdateLocalResumeInput): Promise<LocalResume> {
	return reviveResume(
		await requestLocalApi<ApiLocalResume>(`/api/local/resumes/${encodeURIComponent(id)}`, {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "PATCH",
		}),
	);
}

export async function duplicateLocalResume(
	id: string,
	input: Pick<CreateLocalResumeInput, "name" | "slug" | "tags">,
): Promise<LocalResume> {
	return reviveResume(
		await requestLocalApi<ApiLocalResume>(`/api/local/resumes/${encodeURIComponent(id)}/duplicate`, {
			body: JSON.stringify(input),
			headers: jsonHeaders,
			method: "POST",
		}),
	);
}

export async function deleteLocalResume(id: string): Promise<void> {
	await requestLocalApi<void>(`/api/local/resumes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function importLocalResumeBackup(value: unknown): Promise<LocalResume[]> {
	return (
		await requestLocalApi<ApiLocalResume[]>("/api/local/resumes/import", {
			body: JSON.stringify(value),
			headers: jsonHeaders,
			method: "POST",
		})
	).map(reviveResume);
}

type ApiLocalResume = Omit<LocalResume, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

type ApiLocalResumeListItem = Omit<LocalResumeListItem, "createdAt" | "updatedAt"> & {
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
		throw new Error(payload?.error || `Local resume request failed: ${response.status}`);
	}

	if (response.status === 204) return undefined as T;
	return readJsonResponse<T>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
	return response.json() as Promise<T>;
}

function reviveResume(resume: ApiLocalResume): LocalResume {
	return {
		...resume,
		data: resume.data ?? defaultResumeData,
		tags: [...resume.tags],
		createdAt: new Date(resume.createdAt),
		updatedAt: new Date(resume.updatedAt),
	};
}

function reviveListItem(resume: ApiLocalResumeListItem): LocalResumeListItem {
	return {
		...resume,
		tags: [...resume.tags],
		createdAt: new Date(resume.createdAt),
		updatedAt: new Date(resume.updatedAt),
	};
}
