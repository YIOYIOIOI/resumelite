import type { MessageDescriptor } from "@lingui/core";
import type { ExperienceNature, ExperienceStage } from "@resumelite/schema/project/data";
import { msg } from "@lingui/core/macro";

export const experienceNatureLabels: Record<ExperienceNature, MessageDescriptor> = {
	work: msg`Work`,
	"side-project": msg`Side project`,
	"open-source": msg`Open source`,
	academic: msg`Academic`,
	volunteer: msg`Volunteer`,
	freelance: msg`Freelance`,
};

export const experienceStageLabels: Record<ExperienceStage, MessageDescriptor> = {
	idea: msg`Idea`,
	"in-progress": msg`In progress`,
	shipped: msg`Shipped`,
	paused: msg`Paused`,
	archived: msg`Archived`,
};

export const experienceNatureOrder: ExperienceNature[] = [
	"work",
	"side-project",
	"open-source",
	"freelance",
	"academic",
	"volunteer",
];

export const experienceStageOrder: ExperienceStage[] = ["idea", "in-progress", "shipped", "paused", "archived"];
