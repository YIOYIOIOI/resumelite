import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CloudSlashIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { applyPreset } from "@resumelite/schema/resume/template-preset";
import { Badge } from "@resumelite/ui/components/badge";
import { Button } from "@resumelite/ui/components/button";
import { Spinner } from "@resumelite/ui/components/spinner";
import { useDialogStore } from "@/dialogs/store";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { fetchCommunityPreset, fetchCommunityTemplates } from "@/features/templates/registry";

export function CommunityTemplateGallery() {
	const resume = useCurrentResume();
	const updateResumeData = useUpdateResumeData();
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const [applyingSlug, setApplyingSlug] = useState<string | null>(null);

	const templatesQuery = useQuery({
		queryKey: ["community-templates"],
		queryFn: ({ signal }) => fetchCommunityTemplates(signal),
		retry: 1,
		staleTime: 5 * 60 * 1000,
	});

	async function onUse(slug: string) {
		setApplyingSlug(slug);
		try {
			const preset = await fetchCommunityPreset(slug);
			const knownCustomSectionIds = resume.data.customSections.map((section) => section.id);
			const nextMetadata = applyPreset(preset, resume.data.metadata, knownCustomSectionIds);
			updateResumeData((draft) => {
				draft.metadata = nextMetadata;
			});
			toast.success(t`Template applied.`);
			closeDialog();
		} catch {
			toast.error(t`Could not load that template.`);
		} finally {
			setApplyingSlug(null);
		}
	}

	if (templatesQuery.isPending) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
				<SpinnerGapIcon size={28} className="animate-spin" />
				<Trans>Loading community templates…</Trans>
			</div>
		);
	}

	if (templatesQuery.isError) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
				<CloudSlashIcon size={28} />
				<p className="max-w-sm text-sm leading-relaxed">
					<Trans>Couldn't reach the community gallery. Check your connection, or import a template file instead.</Trans>
				</p>
				<Button variant="outline" size="sm" onClick={() => templatesQuery.refetch()}>
					<Trans>Retry</Trans>
				</Button>
			</div>
		);
	}

	if (templatesQuery.data.length === 0) {
		return (
			<div className="flex justify-center py-16 text-muted-foreground text-sm">
				<Trans>No community templates yet.</Trans>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-6 p-4 md:grid-cols-3 lg:grid-cols-4">
			{templatesQuery.data.map((template) => (
				<div key={template.slug} className="flex flex-col gap-2">
					<div className="relative aspect-page overflow-hidden rounded-md bg-popover">
						<img src={template.preview} alt={template.name} className="size-full object-cover" loading="lazy" />
					</div>

					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="truncate font-medium">{template.name}</p>
							{template.author ? (
								<p className="truncate text-muted-foreground text-xs">
									<Trans>by {template.author}</Trans>
								</p>
							) : null}
						</div>
						<Button size="sm" disabled={applyingSlug === template.slug} onClick={() => onUse(template.slug)}>
							{applyingSlug === template.slug ? <Spinner /> : <Trans>Use</Trans>}
						</Button>
					</div>

					{template.tags.length > 0 ? (
						<div className="flex flex-wrap gap-1">
							{template.tags.slice(0, 3).map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
								</Badge>
							))}
						</div>
					) : null}
				</div>
			))}
		</div>
	);
}
