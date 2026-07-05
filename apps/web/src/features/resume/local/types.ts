import type { ResumeData } from "@resumelite/schema/resume/data";

export const LOCAL_RESUME_ID_PREFIX = "local_";

export type LocalResumeSort = "lastUpdatedAt" | "createdAt" | "name";

export type LocalResume = {
	id: string;
	name: string;
	slug: string;
	tags: string[];
	data: ResumeData;
	isLocked: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type LocalResumeListItem = Omit<LocalResume, "data">;

export type CreateLocalResumeInput = {
	name: string;
	slug: string;
	tags: string[];
	data?: ResumeData;
};

export type UpdateLocalResumeInput = Partial<Pick<LocalResume, "name" | "slug" | "tags" | "data" | "isLocked">>;
