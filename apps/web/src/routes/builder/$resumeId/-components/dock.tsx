import type { Icon } from "@phosphor-icons/react";
import type { Resume } from "@/features/resume/builder/draft";
import type { BuilderPreviewPageLayout } from "./page-layout";
import { t } from "@lingui/core/macro";
import {
	AlignCenterHorizontalIcon,
	AlignTopIcon,
	CircleNotchIcon,
	CubeFocusIcon,
	FileDocIcon,
	FileJsIcon,
	FilePdfIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { m } from "motion/react";
import { useCallback, useState } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { buildDocx } from "@resumelite/docx";
import { Button } from "@resumelite/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@resumelite/ui/components/tooltip";
import { downloadWithAnchor, generateFilename } from "@resumelite/utils/file";
import { cn } from "@resumelite/utils/style";
import { useCurrentResume } from "@/features/resume/builder/draft";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";

type BuilderDockProps = {
	pageLayout: BuilderPreviewPageLayout;
	onTogglePageLayout: () => void;
};

export function BuilderDock({ pageLayout, onTogglePageLayout }: BuilderDockProps) {
	const resume = useCurrentResume();

	return <BuilderDockContent resume={resume} pageLayout={pageLayout} onTogglePageLayout={onTogglePageLayout} />;
}

type BuilderDockContentProps = BuilderDockProps & {
	resume: Resume;
};

function BuilderDockContent({ pageLayout, onTogglePageLayout, resume }: BuilderDockContentProps) {
	const { zoomIn, zoomOut, centerView } = useControls();

	const [isPrinting, setIsPrinting] = useState(false);

	const onDownloadJSON = useCallback(async () => {
		if (!resume) return;
		const filename = generateFilename(resume.name, "json");
		const jsonString = JSON.stringify(resume.data, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });

		downloadWithAnchor(blob, filename);
	}, [resume]);

	const onDownloadDOCX = useCallback(async () => {
		if (!resume) return;
		const filename = generateFilename(resume.name, "docx");

		try {
			const blob = await buildDocx(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the DOCX, please try again.`);
		}
	}, [resume]);

	const onDownloadPDF = useCallback(async () => {
		if (!resume) return;

		const filename = generateFilename(resume.name, "pdf");
		const toastId = toast.loading(t`Please wait while your PDF is being generated...`);

		setIsPrinting(true);

		try {
			const blob = await createResumePdfBlob(resume.data);
			downloadWithAnchor(blob, filename);
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again.`);
		} finally {
			setIsPrinting(false);
			toast.dismiss(toastId);
		}
	}, [resume]);

	return (
		<div className="fixed inset-x-0 bottom-4 flex items-center justify-center">
			<m.div
				initial={{ opacity: 0, y: -18 }}
				animate={{ opacity: 0.6, y: 0 }}
				whileHover={{ opacity: 1, y: -2, scale: 1.01 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="flex items-center rounded-r-full rounded-l-full bg-popover px-2 shadow-xl will-change-[transform,opacity]"
			>
				<DockIcon icon={MagnifyingGlassPlusIcon} title={t`Zoom in`} onClick={() => zoomIn(0.1)} />
				<DockIcon icon={MagnifyingGlassMinusIcon} title={t`Zoom out`} onClick={() => zoomOut(0.1)} />
				<DockIcon icon={CubeFocusIcon} title={t`Center view`} onClick={() => centerView()} />
				<DockIcon
					icon={pageLayout === "horizontal" ? AlignTopIcon : AlignCenterHorizontalIcon}
					title={t`Toggle page stacking`}
					onClick={onTogglePageLayout}
				/>
				<DockIcon icon={FileJsIcon} title={t`Download JSON`} onClick={() => onDownloadJSON()} />
				<DockIcon icon={FileDocIcon} title={t`Download DOCX`} onClick={() => onDownloadDOCX()} />
				<DockIcon
					title={t`Download PDF`}
					disabled={isPrinting}
					onClick={() => onDownloadPDF()}
					icon={isPrinting ? CircleNotchIcon : FilePdfIcon}
					iconClassName={cn(isPrinting && "animate-spin")}
				/>
			</m.div>
		</div>
	);
}

type DockIconProps = {
	title: string;
	icon: Icon;
	disabled?: boolean;
	onClick: () => void;
	iconClassName?: string;
	active?: boolean;
};

function DockIcon({ icon: Icon, title, disabled, onClick, iconClassName, active }: DockIconProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<m.div
						className="will-change-transform"
						whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
						whileTap={disabled ? undefined : { scale: 0.97 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
					>
						<Button
							size="icon"
							variant="ghost"
							disabled={disabled}
							className={cn(active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
							onClick={onClick}
							aria-label={title}
						>
							<Icon className={cn("size-4", iconClassName)} />
						</Button>
					</m.div>
				}
			/>

			<TooltipContent side="top" align="center" className="font-medium">
				{title}
			</TooltipContent>
		</Tooltip>
	);
}
