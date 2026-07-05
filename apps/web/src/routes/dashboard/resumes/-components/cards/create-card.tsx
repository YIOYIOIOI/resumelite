import type { LocalResume } from "@/features/resume/local/storage";
import { t } from "@lingui/core/macro";
import { PlusIcon } from "@phosphor-icons/react";
import { createUntitledLocalResume } from "@/features/resume/local/storage";
import { BaseCard } from "./base-card";

type CreateResumeCardProps = {
	onLocalChange?: () => void;
	onLocalCreate?: (resume: LocalResume) => void;
};

export function CreateResumeCard({ onLocalChange = () => {}, onLocalCreate }: CreateResumeCardProps) {
	const handleCreate = async () => {
		const resume = await createUntitledLocalResume();
		onLocalChange();
		onLocalCreate?.(resume);
	};

	return (
		<BaseCard
			title={t`Create a new resume`}
			description={t`Start building your resume from scratch`}
			onClick={() => void handleCreate()}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<PlusIcon weight="thin" className="size-12" />
			</div>
		</BaseCard>
	);
}
