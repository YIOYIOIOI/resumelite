import type { ExperienceNature, ExperienceStage } from "@resumelite/schema/project/data";
import type { LocalExperience } from "@/features/project/local/storage";
import type { DialogProps } from "../store";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";
import { experienceDataSchema } from "@resumelite/schema/project/data";
import { Button } from "@resumelite/ui/components/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@resumelite/ui/components/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@resumelite/ui/components/form";
import { Textarea } from "@resumelite/ui/components/textarea";
import { slugify } from "@resumelite/utils/string";
import { ChipInput } from "@/components/input/chip-input";
import { RichInput } from "@/components/input/rich-input";
import { URLInput } from "@/components/input/url-input";
import { Combobox } from "@/components/ui/combobox";
import {
	experienceNatureLabels,
	experienceNatureOrder,
	experienceStageLabels,
	experienceStageOrder,
} from "@/features/project/labels";
import { createLocalExperience, getLocalExperienceById, updateLocalExperience } from "@/features/project/local/storage";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { useAppForm, withForm } from "@/libs/tanstack-form";
import { useDialogStore } from "../store";

const formSchema = experienceDataSchema.extend({
	title: z.string().min(1).max(120),
	tags: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
	title: "",
	role: "",
	nature: "work",
	stage: "in-progress",
	period: "",
	summary: "",
	details: "",
	techStack: [],
	link: { url: "", label: "" },
	tags: [],
};

function toFormValues(experience?: LocalExperience): FormValues {
	if (!experience) return structuredClone(defaultValues);
	return { ...structuredClone(experience.data), tags: [...experience.tags] };
}

export function CreateExperienceDialog(_: DialogProps<"experience.create">) {
	return <ExperienceEditor />;
}

export function UpdateExperienceDialog({ data }: DialogProps<"experience.update">) {
	const query = useQuery({
		queryKey: ["local-experience", data.id],
		queryFn: () => getLocalExperienceById(data.id),
	});

	if (!query.data) {
		return (
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-x-2">
						<PencilSimpleLineIcon />
						<Trans>Edit project experience</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>Loading…</Trans>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		);
	}

	return <ExperienceEditor experience={query.data} />;
}

function ExperienceEditor({ experience }: { experience?: LocalExperience }) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();
	const isEdit = Boolean(experience);

	const form = useAppForm({
		defaultValues: toFormValues(experience),
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const { tags, ...data } = value;
			const name = value.title.trim() || "Untitled Experience";

			if (experience) {
				const toastId = toast.loading(t`Saving your experience...`);
				await updateLocalExperience(experience.id, { name, tags, data });
				toast.success(t`Your experience has been saved.`, { id: toastId });
				await queryClient.invalidateQueries({ queryKey: ["local-experience", experience.id] });
			} else {
				const toastId = toast.loading(t`Creating your experience...`);
				await createLocalExperience({
					name,
					slug: `${slugify(name) || "experience"}-${Date.now().toString(36)}`,
					tags,
					data,
				});
				toast.success(t`Your experience has been created.`, { id: toastId });
			}

			await queryClient.invalidateQueries({ queryKey: ["local-experiences"] });
			closeDialog();
		},
	});

	const { requestClose } = useFormBlocker(form);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

	return (
		<DialogContent className="sm:max-w-2xl">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					{isEdit ? <PencilSimpleLineIcon /> : <PlusIcon />}
					{isEdit ? <Trans>Edit project experience</Trans> : <Trans>Add a project experience</Trans>}
				</DialogTitle>
				<DialogDescription>
					<Trans>Record it factually, with evidence — this is your source of truth for writing resumes.</Trans>
				</DialogDescription>
			</DialogHeader>

			<form
				className="grid gap-4 sm:grid-cols-2"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<ExperienceForm form={form} />

				<DialogFooter className="sm:col-span-full">
					<Button variant="ghost" onClick={requestClose}>
						<Trans>Cancel</Trans>
					</Button>

					<Button type="submit" disabled={isSubmitting}>
						{isEdit ? <Trans>Save Changes</Trans> : <Trans>Create</Trans>}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

const ExperienceForm = withForm({
	defaultValues,
	render: function ExperienceFormRenderer({ form }) {
		const { i18n } = useLingui();

		const natureOptions = experienceNatureOrder.map((value) => ({
			value,
			label: i18n.t(experienceNatureLabels[value]),
		}));
		const stageOptions = experienceStageOrder.map((value) => ({ value, label: i18n.t(experienceStageLabels[value]) }));

		return (
			<>
				<div className="sm:col-span-full">
					<form.AppField name="title">{(field) => <field.TextField label={<Trans>Title</Trans>} />}</form.AppField>
				</div>

				<form.AppField name="role">{(field) => <field.TextField label={<Trans>Your role</Trans>} />}</form.AppField>

				<form.AppField name="period">{(field) => <field.TextField label={<Trans>Period</Trans>} />}</form.AppField>

				<form.Field name="nature">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Type</Trans>
							</FormLabel>
							<Combobox
								value={field.state.value}
								options={natureOptions}
								onValueChange={(value) => {
									if (value) field.handleChange(value as ExperienceNature);
								}}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="stage">
					{(field) => (
						<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
							<FormLabel>
								<Trans>Stage</Trans>
							</FormLabel>
							<Combobox
								value={field.state.value}
								options={stageOptions}
								onValueChange={(value) => {
									if (value) field.handleChange(value as ExperienceStage);
								}}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="summary">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Summary</Trans>
							</FormLabel>
							<FormControl
								render={
									<Textarea
										rows={2}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder={t`One or two factual sentences: what it is.`}
									/>
								}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="details">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Details</Trans>
							</FormLabel>
							<FormControl
								render={<RichInput value={field.state.value} onChange={(value) => field.handleChange(value)} />}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="techStack">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Tech &amp; methods</Trans>
							</FormLabel>
							<FormControl
								render={<ChipInput value={field.state.value} onChange={(value) => field.handleChange(value)} />}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="link">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Link</Trans>
							</FormLabel>
							<URLInput value={field.state.value} onChange={(value) => field.handleChange(value)} />
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>

				<form.Field name="tags">
					{(field) => (
						<FormItem
							className="sm:col-span-full"
							hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
						>
							<FormLabel>
								<Trans>Tags</Trans>
							</FormLabel>
							<FormControl
								render={<ChipInput value={field.state.value} onChange={(value) => field.handleChange(value)} />}
							/>
							<FormMessage errors={field.state.meta.errors} />
						</FormItem>
					)}
				</form.Field>
			</>
		);
	},
});
