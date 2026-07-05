import type { LocalResumeListItem } from "@/features/resume/local/storage";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	CopySimpleIcon,
	FolderOpenIcon,
	LockSimpleIcon,
	LockSimpleOpenIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@resumelite/ui/components/context-menu";
import { deleteLocalResume, duplicateLocalResume, updateLocalResume } from "@/features/resume/local/storage";
import { useConfirm } from "@/hooks/use-confirm";

type Props = {
	children: React.ComponentProps<typeof ContextMenuTrigger>["render"];
	onLocalChange: () => void;
	resume: LocalResumeListItem;
};

export function ResumeContextMenu({ resume, children, onLocalChange }: Props) {
	const confirm = useConfirm();

	const handleDuplicate = async () => {
		await duplicateLocalResume(resume.id, {
			name: `${resume.name} Copy`,
			slug: `${resume.slug}-copy-${Date.now()}`,
			tags: resume.tags,
		});
		onLocalChange();
		toast.success(t`Your resume has been duplicated successfully.`);
	};

	const handleToggleLock = async () => {
		if (!resume.isLocked) {
			const confirmation = await confirm(t`Are you sure you want to lock this resume?`, {
				description: t`When locked, the resume cannot be updated or deleted.`,
			});

			if (!confirmation) return;
		}

		await updateLocalResume(resume.id, { isLocked: !resume.isLocked });
		onLocalChange();
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Are you sure you want to delete this resume?`, {
			description: t`This action cannot be undone.`,
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting your resume...`);

		await deleteLocalResume(resume.id);
		onLocalChange();
		toast.success(t`Your resume has been deleted successfully.`, { id: toastId });
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger render={children} />

			<ContextMenuContent>
				<ContextMenuItem
					render={
						<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
							<FolderOpenIcon />
							<Trans comment="Resume card context menu action to open the resume editor">Open</Trans>
						</Link>
					}
				/>

				<ContextMenuSeparator />

				<ContextMenuItem onClick={() => void handleDuplicate()}>
					<CopySimpleIcon />
					<Trans comment="Resume card context menu action to create a copy">Duplicate</Trans>
				</ContextMenuItem>

				<ContextMenuItem onClick={() => void handleToggleLock()}>
					{resume.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
					{resume.isLocked ? (
						<Trans comment="Resume card context menu action to remove edit lock">Unlock</Trans>
					) : (
						<Trans comment="Resume card context menu action to prevent edits">Lock</Trans>
					)}
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem variant="destructive" disabled={resume.isLocked} onClick={() => void handleDelete()}>
					<TrashSimpleIcon />
					<Trans comment="Resume card context menu destructive action to remove a resume">Delete</Trans>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
