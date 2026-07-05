import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { CreateExperienceDialog, UpdateExperienceDialog } from ".";

export const experienceDialogRendererRegistry = defineDialogRendererRegistry("experience", [
	defineDialogRenderer("experience.create", () => <CreateExperienceDialog />),
	defineDialogRenderer("experience.update", ({ data }) => <UpdateExperienceDialog data={data} />),
]);
