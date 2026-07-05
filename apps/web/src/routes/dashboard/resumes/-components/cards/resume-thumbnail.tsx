import type { ResumeData } from "@resumelite/schema/resume/data";
import type { LocalResumeListItem } from "@/features/resume/local/storage";
import { FileTextIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { Spinner } from "@resumelite/ui/components/spinner";
import { cn } from "@resumelite/utils/style";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { getLocalResumeById } from "@/features/resume/local/storage";
import { createPdfFirstPageImageUrl } from "@/features/resume/preview/pdf-thumbnail";
import { getResumeThumbnailCacheKey } from "@/features/resume/preview/resume-thumbnail.shared";

type ThumbnailState = { status: "error" | "idle" | "loading" } | { status: "ready"; url: string };

type ResumeThumbnailProps = {
	isLocked: boolean;
	resume: LocalResumeListItem;
};

const throwIfAborted = (signal: AbortSignal) => {
	if (signal.aborted) throw new DOMException("Thumbnail generation aborted.", "AbortError");
};

const createResumeThumbnailUrl = async (data: ResumeData, signal: AbortSignal) => {
	const pdf = await createResumePdfBlob(data);
	throwIfAborted(signal);

	const url = await createPdfFirstPageImageUrl(pdf);

	if (signal.aborted) {
		URL.revokeObjectURL(url);
		throwIfAborted(signal);
	}

	return url;
};

function useResumeThumbnail(data: ResumeData | undefined, cacheKey: string | undefined): ThumbnailState {
	const thumbnailQuery = useQuery({
		queryKey: ["resume-thumbnail", cacheKey],
		queryFn: ({ signal }) => {
			if (!data) throw new Error("Resume data is required to generate a thumbnail.");
			return createResumeThumbnailUrl(data, signal);
		},
		enabled: Boolean(data && cacheKey),
		gcTime: 0,
	});

	useEffect(() => {
		if (thumbnailQuery.error) console.error("Failed to generate resume thumbnail", thumbnailQuery.error);
	}, [thumbnailQuery.error]);

	useEffect(() => {
		const url = thumbnailQuery.data;

		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	}, [thumbnailQuery.data]);

	if (!data || !cacheKey) return { status: "idle" };
	if (thumbnailQuery.isError) return { status: "error" };
	if (thumbnailQuery.data) return { status: "ready", url: thumbnailQuery.data };

	return { status: "loading" };
}

export function ResumeThumbnail({ isLocked, resume }: ResumeThumbnailProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(containerRef, { amount: 0.1, margin: "240px", once: true });
	const localResumeQuery = useQuery({
		queryKey: ["local-resume", resume.id, resume.updatedAt],
		queryFn: () => getLocalResumeById(resume.id),
		enabled: isInView,
	});
	const localResume = localResumeQuery.data;
	const thumbnail = useResumeThumbnail(
		localResume?.data,
		isInView ? getResumeThumbnailCacheKey(resume.id, resume.updatedAt) : undefined,
	);
	const hasFailed =
		localResumeQuery.isError || (localResumeQuery.isSuccess && !localResume) || thumbnail.status === "error";

	return (
		<div
			ref={containerRef}
			className={cn("relative size-full overflow-hidden bg-muted/40 transition-all", isLocked && "blur-xs")}
		>
			{thumbnail.status === "ready" ? (
				<div
					aria-hidden
					className="absolute inset-0 bg-center bg-contain bg-white bg-no-repeat"
					style={{ backgroundImage: `url(${thumbnail.url})` }}
				/>
			) : hasFailed ? (
				<div className="absolute inset-0 flex items-center justify-center">
					<FileTextIcon weight="thin" className="size-12 opacity-40" />
				</div>
			) : (
				<div className="absolute inset-0 flex items-center justify-center">
					<Spinner className="size-8 text-muted-foreground" />
				</div>
			)}
		</div>
	);
}
