import type { LocalExperienceListItem } from "@/features/project/local/storage";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { m } from "motion/react";
import { useMemo } from "react";
import { Badge } from "@resumelite/ui/components/badge";
import { Button } from "@resumelite/ui/components/button";
import { useDialogStore } from "@/dialogs/store";
import { experienceNatureLabels, experienceStageLabels } from "@/features/project/labels";
import { ExperienceDropdownMenu } from "../menus/dropdown-menu";

type Props = {
	experience: LocalExperienceListItem;
	onLocalChange: () => void;
};

export function ExperienceCard({ experience, onLocalChange }: Props) {
	const { i18n } = useLingui();
	const openDialog = useDialogStore((state) => state.openDialog);

	const updatedAt = useMemo(() => {
		return Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" }).format(experience.updatedAt);
	}, [i18n.locale, experience.updatedAt]);

	return (
		<m.div
			className="h-full will-change-transform"
			whileHover={{ y: -2, scale: 1.005 }}
			whileTap={{ scale: 0.998 }}
			transition={{ type: "spring", stiffness: 320, damping: 28 }}
		>
			<div className="flex h-full min-h-40 flex-col gap-y-3 rounded-lg border border-border bg-card p-4">
				<div className="flex items-start justify-between gap-x-2">
					<button
						type="button"
						className="min-w-0 flex-1 cursor-default text-start"
						onClick={() => openDialog("experience.update", { id: experience.id })}
					>
						<h3 className="truncate font-medium text-sm">{experience.name}</h3>
					</button>

					<ExperienceDropdownMenu experience={experience} onLocalChange={onLocalChange} align="end">
						<Button size="icon" variant="ghost" className="-me-1.5 -mt-1 size-7 shrink-0" title={t`Options`}>
							<DotsThreeVerticalIcon />
						</Button>
					</ExperienceDropdownMenu>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<Badge variant="secondary">{i18n.t(experienceStageLabels[experience.stage])}</Badge>
					<Badge variant="outline">{i18n.t(experienceNatureLabels[experience.nature])}</Badge>
				</div>

				{experience.tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{experience.tags.slice(0, 4).map((tag) => (
							<span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
								{tag}
							</span>
						))}
						{experience.tags.length > 4 && (
							<span className="text-muted-foreground text-xs">+{experience.tags.length - 4}</span>
						)}
					</div>
				)}

				<p className="mt-auto text-muted-foreground text-xs">
					<Trans>Updated {updatedAt}</Trans>
				</p>
			</div>
		</m.div>
	);
}
