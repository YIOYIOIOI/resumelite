import { Trans } from "@lingui/react/macro";
import { PlusIcon } from "@phosphor-icons/react";
import { useDialogStore } from "@/dialogs/store";

export function CreateExperienceCard() {
	const openDialog = useDialogStore((state) => state.openDialog);

	return (
		<button
			type="button"
			onClick={() => openDialog("experience.create", undefined)}
			className="group flex h-full min-h-40 w-full flex-col items-center justify-center gap-y-2 rounded-lg border border-border border-dashed bg-card p-4 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
		>
			<PlusIcon weight="thin" className="size-10" />
			<span className="font-medium text-sm">
				<Trans>Add a project experience</Trans>
			</span>
		</button>
	);
}
