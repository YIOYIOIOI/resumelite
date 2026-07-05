import type { LocalExperienceListItem } from "@/features/project/local/storage";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CopySimpleIcon, PencilSimpleLineIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@resumelite/ui/components/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { deleteLocalExperience, duplicateLocalExperience } from "@/features/project/local/storage";
import { useConfirm } from "@/hooks/use-confirm";

type Props = Omit<React.ComponentProps<typeof DropdownMenuContent>, "children"> & {
	children: React.ComponentProps<typeof DropdownMenuTrigger>["render"];
	onLocalChange: () => void;
	experience: LocalExperienceListItem;
};

export function ExperienceDropdownMenu({ experience, children, onLocalChange, ...props }: Props) {
	const confirm = useConfirm();
	const openDialog = useDialogStore((state) => state.openDialog);

	const handleDuplicate = async () => {
		await duplicateLocalExperience(experience.id, {
			name: `${experience.name} Copy`,
			slug: `${experience.slug}-copy-${Date.now().toString(36)}`,
			tags: experience.tags,
		});
		onLocalChange();
		toast.success(t`Your experience has been duplicated successfully.`);
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Are you sure you want to delete this experience?`, {
			description: t`This action cannot be undone.`,
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting your experience...`);

		await deleteLocalExperience(experience.id);
		onLocalChange();
		toast.success(t`Your experience has been deleted successfully.`, { id: toastId });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={children} />

			<DropdownMenuContent {...props}>
				<DropdownMenuItem onClick={() => openDialog("experience.update", { id: experience.id })}>
					<PencilSimpleLineIcon />
					<Trans comment="Experience card dropdown action to edit">Edit</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={() => void handleDuplicate()}>
					<CopySimpleIcon />
					<Trans comment="Experience card dropdown action to create a copy">Duplicate</Trans>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
					<TrashSimpleIcon />
					<Trans comment="Experience card dropdown destructive action to remove">Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
