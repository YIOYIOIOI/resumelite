import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { toast } from "sonner";
import { applyPreset, extractPreset, templatePresetSchema } from "@resumelite/schema/resume/template-preset";
import { Button } from "@resumelite/ui/components/button";
import { downloadWithAnchor, generateFilename } from "@resumelite/utils/file";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";

// Export the current resume's appearance as a shareable template file, and apply an
// imported one. Both are local, offline operations — no code is executed, and no personal
// content leaves the resume (see extractPreset/applyPreset).
export function TemplateSharingActions() {
	const resume = useCurrentResume();
	const updateResumeData = useUpdateResumeData();
	const inputRef = useRef<HTMLInputElement>(null);

	function onExport() {
		const preset = extractPreset(resume.data.metadata, { name: resume.name, tags: resume.tags });
		const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
		const filename = generateFilename(`${resume.name}-template`, "json");
		downloadWithAnchor(blob, filename.startsWith(".") ? "resume-template.json" : filename);
		toast.success(t`Template exported.`);
	}

	async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		if (file.size > 512 * 1024) {
			toast.error(t`That template file is too large.`);
			return;
		}

		try {
			const parsed = templatePresetSchema.safeParse(JSON.parse(await file.text()));
			if (!parsed.success) {
				toast.error(t`That file isn't a valid ResumeLite template.`);
				return;
			}

			const knownCustomSectionIds = resume.data.customSections.map((section) => section.id);
			const nextMetadata = applyPreset(parsed.data, resume.data.metadata, knownCustomSectionIds);
			updateResumeData((draft) => {
				draft.metadata = nextMetadata;
			});
			toast.success(t`Template applied.`);
		} catch {
			toast.error(t`Could not read that template file.`);
		}
	}

	return (
		<div className="flex flex-wrap gap-2 px-4">
			<Button variant="outline" size="sm" onClick={onExport}>
				<DownloadSimpleIcon />
				<Trans>Export as template</Trans>
			</Button>
			<Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
				<UploadSimpleIcon />
				<Trans>Import template</Trans>
			</Button>
			<input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
		</div>
	);
}
