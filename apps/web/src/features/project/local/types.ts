import type { ExperienceData } from "@resumelite/schema/project/data";

export const LOCAL_EXPERIENCE_ID_PREFIX = "experience_";

export type LocalExperienceSort = "lastUpdatedAt" | "createdAt" | "name";

export type LocalExperience = {
	id: string;
	name: string;
	slug: string;
	tags: string[];
	data: ExperienceData;
	createdAt: Date;
	updatedAt: Date;
};

// A lightweight projection for the dashboard list: omits the heavy `data` payload but
// keeps the two scalar fields the cards render as badges.
export type LocalExperienceListItem = Omit<LocalExperience, "data"> & {
	nature: ExperienceData["nature"];
	stage: ExperienceData["stage"];
};

export type CreateLocalExperienceInput = {
	name: string;
	slug: string;
	tags: string[];
	data?: ExperienceData;
};

export type UpdateLocalExperienceInput = Partial<Pick<LocalExperience, "name" | "slug" | "tags" | "data">>;
