import type { ResumeData } from "@resumelite/schema/resume/data";
import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DownloadSimpleIcon, FileIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { JSONResumeImporter } from "@resumelite/import/json-resume";
import { ReactiveResumeJSONImporter } from "@resumelite/import/reactive-resume-json";
import { ReactiveResumeV4JSONImporter } from "@resumelite/import/reactive-resume-v4-json";
import { Button } from "@resumelite/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@resumelite/ui/components/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@resumelite/ui/components/form";
import { Input } from "@resumelite/ui/components/input";
import { Spinner } from "@resumelite/ui/components/spinner";
import { slugify } from "@resumelite/utils/string";
import { cn } from "@resumelite/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { createLocalResume, importLocalResumeBackup } from "@/features/resume/local/storage";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { useAppForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(""),
		file: z.undefined(),
	}),
	z.object({
		type: z.literal("reactive-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("reactive-resume-v4-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("local-backup-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
	z.object({
		type: z.literal("json-resume-json"),
		file: z
			.instanceof(File)
			.refine((file) => file.type === "application/json", { message: "File must be a JSON file" }),
	}),
]);

type FormValues = z.infer<typeof formSchema>;
type ImportType = FormValues["type"];

function getImportedResumeName(file: File): string {
	const name = file.name.replace(/\.[^.]+$/, "").trim();
	return name || "Imported Resume";
}

export function ImportResumeDialog(_: DialogProps<"resume.import">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const inputRef = useRef<HTMLInputElement>(null);
	const [isImporting, setIsImporting] = useState<boolean>(false);

	const form = useAppForm({
		defaultValues: {
			type: "" as ImportType,
			file: undefined as File | undefined,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			if (value.type === "" || !value.file) return;

			setIsImporting(true);

			const toastId = toast.loading(t`Importing your resume...`, {
				description: t`Please do not close the window or refresh the page.`,
			});

			try {
				const json = await value.file.text();

				if (value.type === "local-backup-json") {
					const resumes = await importLocalResumeBackup(JSON.parse(json));
					const firstResume = resumes[0];

					if (!firstResume) {
						throw new Error(
							t({
								comment: "Error shown when a local backup import file contains no resumes",
								message: "No resumes were found in the selected backup file.",
							}),
						);
					}

					toast.success(t`Your resume has been imported successfully.`, { id: toastId, description: null });
					closeDialog();
					void navigate({ to: "/builder/$resumeId", params: { resumeId: firstResume.id } });
					return;
				}

				let data: ResumeData | undefined;

				if (value.type === "json-resume-json") {
					const importer = new JSONResumeImporter();
					data = importer.parse(json);
				}

				if (value.type === "reactive-resume-json") {
					const importer = new ReactiveResumeJSONImporter();
					data = importer.parse(json);
				}

				if (value.type === "reactive-resume-v4-json") {
					const importer = new ReactiveResumeV4JSONImporter();
					data = importer.parse(json);
				}

				if (!data) {
					throw new Error(
						t({
							comment: "Error shown when a local resume import file could not be parsed",
							message: "No resume data could be parsed from the selected file.",
						}),
					);
				}

				const name = getImportedResumeName(value.file);
				const resume = await createLocalResume({
					name,
					slug: slugify(name) || `imported-resume-${Date.now()}`,
					tags: [],
					data,
				});

				toast.success(t`Your resume has been imported successfully.`, { id: toastId, description: null });
				closeDialog();
				void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
			} catch (error: unknown) {
				toast.error(
					error instanceof Error
						? error.message
						: t({
								comment: "Fallback toast when importing a resume fails for an unknown reason",
								message: "An unknown error occurred while importing your resume.",
							}),
					{ id: toastId, description: null },
				);
			} finally {
				setIsImporting(false);
			}
		},
	});

	const type = useStore(form.store, (s) => s.values.type);

	const onSelectFile = () => {
		if (!inputRef.current) return;
		inputRef.current.click();
	};

	const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		form.setFieldValue("file", file);
	};

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<DownloadSimpleIcon />
					<Trans>Import an existing resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>
						Continue where you left off by importing an existing resume you created using ResumeLite or any another
						resume builder. Supported formats include JSON files from ResumeLite and JSON Resume.
					</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="type">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Type</Trans>
							</FormLabel>
							<FormControl
								render={
									<Combobox
										showClear={false}
										value={field.state.value}
										onValueChange={(value) => {
											const nextType = value as ImportType;
											if (nextType !== field.state.value) form.setFieldValue("file", undefined);
											field.handleChange(nextType);
										}}
										options={[
											{
												value: "reactive-resume-json",
												label: t({
													comment: "Import source option for current ResumeLite JSON format",
													message: "ResumeLite (JSON)",
												}),
											},
											{
												value: "reactive-resume-v4-json",
												label: t({
													comment: "Import source option for legacy ResumeLite v4 JSON format",
													message: "ResumeLite v4 (JSON)",
												}),
											},
											{
												value: "local-backup-json",
												label: t({
													comment: "Import source option for local ResumeLite backup files",
													message: "ResumeLite local backup (JSON)",
												}),
											},
											{
												value: "json-resume-json",
												label: t({
													comment: "Import source option for standard JSON Resume format",
													message: "JSON Resume",
												}),
											},
										]}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field key={type} name="file">
					{(field) => (
						<FormItem
							className={cn(!type && "hidden")}
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormControl>
								<Input type="file" className="hidden" ref={inputRef} onChange={onUploadFile} />

								<Button
									variant="outline"
									className="h-auto w-full flex-col border-dashed py-8 font-normal"
									onClick={onSelectFile}
								>
									{field.state.value ? (
										<>
											<FileIcon weight="thin" size={32} />
											<p>{field.state.value.name}</p>
										</>
									) : (
										<>
											<UploadSimpleIcon weight="thin" size={32} />
											<Trans>Click here to select a file to import</Trans>
										</>
									)}
								</Button>
							</FormControl>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<DialogFooter>
					<Button type="submit" disabled={!type || isImporting}>
						{isImporting ? <Spinner /> : null}
						{isImporting ? t`Importing…` : t`Import`}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
