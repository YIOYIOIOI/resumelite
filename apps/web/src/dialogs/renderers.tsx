import type { DialogSchema } from "./schemas";
import { experienceDialogRendererRegistry } from "./project/registry";
import { resumeDialogRendererRegistry } from "./resume/registry";

const dialogRendererRegistries = [resumeDialogRendererRegistry, experienceDialogRendererRegistry] as const;

const dialogRendererByType = new Map(
	dialogRendererRegistries.flatMap((registry) =>
		registry.renderers.map((renderer) => [renderer.type, renderer] as const),
	),
);

export const renderDialog = (dialog: DialogSchema | null) => {
	if (!dialog) return null;

	const renderer = dialogRendererByType.get(dialog.type);
	if (renderer) return renderer.render(dialog as never);

	return null;
};
