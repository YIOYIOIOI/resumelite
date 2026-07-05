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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@resumelite/ui/components/dropdown-menu";
import { deleteLocalResume, duplicateLocalResume, updateLocalResume } from "@/features/resume/local/storage";
import { useConfirm } from "@/hooks/use-confirm";

type Props = Omit<React.ComponentProps<typeof DropdownMenuContent>, "children"> & {
	children: React.ComponentProps<typeof DropdownMenuTrigger>["render"];
	onLocalChange: () => void;
	resume: LocalResumeListItem;
};

export function ResumeDropdownMenu({ resume, children, onLocalChange, ...props }: Props) {
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
		<DropdownMenu>
			<DropdownMenuTrigger render={children} />

			<DropdownMenuContent {...props}>
				<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
					<DropdownMenuItem>
						<FolderOpenIcon />
						<Trans comment="Resume card dropdown action to open the resume editor">Open</Trans>
					</DropdownMenuItem>
				</Link>

				<DropdownMenuSeparator />

				<DropdownMenuItem onClick={() => void handleDuplicate()}>
					<CopySimpleIcon />
					<Trans comment="Resume card dropdown action to create a copy">Duplicate</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onClick={() => void handleToggleLock()}>
					{resume.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
					{resume.isLocked ? (
						<Trans comment="Resume card dropdown action to remove edit lock">Unlock</Trans>
					) : (
						<Trans comment="Resume card dropdown action to prevent edits">Lock</Trans>
					)}
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem variant="destructive" disabled={resume.isLocked} onClick={() => void handleDelete()}>
					<TrashSimpleIcon />
					<Trans comment="Resume card dropdown destructive action to remove a resume">Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
