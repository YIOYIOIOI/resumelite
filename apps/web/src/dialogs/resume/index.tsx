import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, MagicWandIcon, PencilSimpleLineIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import z from "zod";
import { sampleResumeData } from "@resumelite/schema/resume/sample";
import { Button } from "@resumelite/ui/components/button";
import { ButtonGroup } from "@resumelite/ui/components/button-group";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@resumelite/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@resumelite/ui/components/dropdown-menu";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@resumelite/ui/components/form";
import { Input } from "@resumelite/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@resumelite/ui/components/input-group";
import { generateRandomName, slugify } from "@resumelite/utils/string";
import { ChipInput } from "@/components/input/chip-input";
import { usePatchResume } from "@/features/resume/builder/draft";
import { createLocalResume, duplicateLocalResume, updateLocalResume } from "@/features/resume/local/storage";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(64),
	slug: z.string().min(1).max(64).transform(slugify),
	tags: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	id: "",
	name: "",
	slug: "",
	tags: [],
};

export function CreateResumeDialog(_: DialogProps<"resume.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const navigate = useNavigate();

	const form = useAppForm({
		defaultValues: {
			id: "",
			name: "",
			slug: "",
			tags: [] as string[],
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Creating your resume...`);
			const name = value.name || generateRandomName();
			const resume = await createLocalResume({
				name,
				slug: value.slug || slugify(name),
				tags: value.tags,
			});

			toast.success(t`Your resume has been created successfully.`, { id: toastId });
			closeDialog();
			void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
		},
	});

	const name = useStore(form.store, (s) => s.values.name);

	useEffect(() => {
		form.setFieldValue("slug", slugify(name));
	}, [form, name]);

	useFormBlocker(form);

	const onCreateSampleResume = async () => {
		const values = form.state.values;
		const randomName = generateRandomName();

		const resume = await createLocalResume({
			name: values.name || randomName,
			slug: values.slug || slugify(randomName),
			tags: values.tags,
			data: sampleResumeData,
		});

		const toastId = toast.loading(t`Creating your resume...`);

		toast.success(t`Your resume has been created successfully.`, { id: toastId });
		closeDialog();
		void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Start building your resume by giving it a name.</Trans>
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
				<ResumeForm form={form} />

				<DialogFooter>
					<ButtonGroup
						aria-label={t({
							comment: "Accessible label for create-resume split button group",
							message: "Create resume with options",
						})}
						className="gap-x-px rtl:flex-row-reverse"
					>
						<Button type="submit">
							<Trans>Create</Trans>
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button size="icon">
										<CaretDownIcon />
									</Button>
								}
							/>

							<DropdownMenuContent align="end" className="w-fit">
								<DropdownMenuItem onClick={() => void onCreateSampleResume()}>
									<TestTubeIcon />
									<Trans>Create a Sample Resume</Trans>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</ButtonGroup>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

export function UpdateResumeDialog({ data }: DialogProps<"resume.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const patchResume = usePatchResume();
	const params = useParams({ strict: false }) as { resumeId?: string };

	const form = useAppForm({
		defaultValues: {
			id: data.id,
			name: data.name,
			slug: data.slug,
			tags: data.tags,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Updating your resume...`);
			const updated = await updateLocalResume(value.id, {
				name: value.name,
				slug: value.slug,
				tags: value.tags,
			});

			if (params.resumeId === updated.id) {
				patchResume((draft) => {
					draft.name = updated.name;
					draft.slug = updated.slug;
					draft.tags = updated.tags;
					draft.isLocked = updated.isLocked;
				});
			}

			toast.success(t`Your resume has been updated successfully.`, { id: toastId });
			closeDialog();
		},
	});

	const name = useStore(form.store, (s) => s.values.name);

	useEffect(() => {
		if (!name) return;
		form.setFieldValue("slug", slugify(name));
	}, [form, name]);

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update Resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Changed your mind? Rename your resume to something more descriptive.</Trans>
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
				<ResumeForm form={form} />

				<DialogFooter>
					<Button type="submit">
						<Trans>Save Changes</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

export function DuplicateResumeDialog({ data }: DialogProps<"resume.duplicate">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const form = useAppForm({
		defaultValues: {
			id: data.id,
			name: `${data.name} (Copy)`,
			slug: `${data.slug}-copy`,
			tags: data.tags,
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.loading(t`Duplicating your resume...`);
			const resume = await duplicateLocalResume(value.id, {
				name: value.name,
				slug: value.slug,
				tags: value.tags,
			});

			toast.success(t`Your resume has been duplicated successfully.`, { id: toastId });
			closeDialog();

			if (!data.shouldRedirect) return;
			void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
		},
	});

	const name = useStore(form.store, (s) => s.values.name);

	useEffect(() => {
		if (!name) return;
		form.setFieldValue("slug", slugify(name));
	}, [form, name]);

	useFormBlocker(form);

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Duplicate Resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Duplicate your resume to create a new one, just like the original.</Trans>
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
				<ResumeForm form={form} />

				<DialogFooter>
					<Button type="submit">
						<Trans>Duplicate</Trans>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

const ResumeForm = withForm({
	defaultValues,
	render: function ResumeFormRenderer({ form }) {
		const slugPrefix = "local://resume/";

		const onGenerateName = () => {
			form.setFieldValue("name", generateRandomName());
		};

		return (
			<>
				<form.Field name="name">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Name</Trans>
							</FormLabel>
							<div className="flex items-center gap-x-2">
								<FormControl
									render={
										<Input
											min={1}
											max={64}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>

								<Button size="icon" variant="outline" title={t`Generate a random name`} onClick={onGenerateName}>
									<MagicWandIcon />
								</Button>
							</div>
							<FormMessage errors={field.state.meta.errors} />
							<FormDescription>
								<Trans>Tip: You can name the resume referring to the position you are applying for.</Trans>
							</FormDescription>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="slug">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Slug</Trans>
							</FormLabel>
							<FormControl
								render={
									<InputGroup>
										<InputGroupAddon align="inline-start" className="hidden sm:flex">
											<InputGroupText>{slugPrefix}</InputGroupText>
										</InputGroupAddon>
										<InputGroupInput
											min={1}
											max={64}
											className="ps-0!"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									</InputGroup>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
							<FormDescription>
								<Trans>This is a URL-friendly name for your resume.</Trans>
							</FormDescription>
						</FormItem>
					)}
				</form.Field>

				<form.Field name="tags">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Tags</Trans>
							</FormLabel>
							<FormControl
								render={
									<ChipInput
										value={field.state.value}
										onChange={(value) => {
											field.handleChange(value);
										}}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
							<FormDescription>
								<Trans>Tags can be used to categorize your resume by keywords.</Trans>
							</FormDescription>
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});
