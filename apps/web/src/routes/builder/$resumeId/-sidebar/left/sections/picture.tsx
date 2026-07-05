import type z from "zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { toast } from "sonner";
import { pictureSchema } from "@resumelite/schema/resume/data";
import { Button } from "@resumelite/ui/components/button";
import { ButtonGroup } from "@resumelite/ui/components/button-group";
import { FormControl, FormItem, FormLabel, FormMessage } from "@resumelite/ui/components/form";
import { Input } from "@resumelite/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@resumelite/ui/components/input-group";
import { ColorPicker } from "@/components/input/color-picker";
import { useCurrentResume, useUpdateResumeData } from "@/features/resume/builder/draft";
import { useSyncFormValues } from "@/hooks/use-sync-form-values";
import { useAppForm } from "@/libs/tanstack-form";
import { SectionBase } from "../shared/section-base";

export function PictureSectionBuilder() {
	return (
		<SectionBase type="picture">
			<PictureSectionForm />
		</SectionBase>
	);
}

type PicturePreviewControlsProps = {
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	form: PictureSettingsForm;
	normalizedPictureUrl: string;
	picture: PictureValues;
	pictureSrc: string;
	onAutoSave: () => void;
	onDeletePicture: () => void;
	onSelectPicture: () => void;
	onUploadPicture: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function PicturePreviewControls({
	fileInputRef,
	form,
	normalizedPictureUrl,
	picture,
	pictureSrc,
	onAutoSave,
	onDeletePicture,
	onSelectPicture,
	onUploadPicture,
}: PicturePreviewControlsProps) {
	return (
		<div className="flex items-center gap-x-4">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				aria-label={t`Upload picture`}
				className="hidden"
				onChange={onUploadPicture}
			/>

			<button
				type="button"
				onClick={picture.url ? onDeletePicture : onSelectPicture}
				aria-label={picture.url ? t`Delete picture` : t`Upload picture`}
				className="group/picture relative size-18 cursor-pointer overflow-hidden rounded-md bg-secondary transition-colors hover:bg-secondary/50"
			>
				{(pictureSrc || normalizedPictureUrl) && (
					<img
						alt=""
						src={pictureSrc || normalizedPictureUrl}
						className="fade-in relative z-10 size-full animate-in rounded-md object-cover transition-opacity group-hover/picture:opacity-20"
					/>
				)}

				<div className="absolute inset-0 z-0 flex size-full items-center justify-center">
					{picture.url ? <TrashSimpleIcon className="size-6" /> : <UploadSimpleIcon className="size-6" />}
				</div>
			</button>

			<form.Field name="url">
				{(field) => (
					<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>URL</Trans>
						</FormLabel>
						<div className="flex items-center gap-x-2">
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											field.handleChange(event.target.value);
											onAutoSave();
										}}
									/>
								}
							/>

							<Button
								size="icon"
								variant="ghost"
								onClick={() => {
									form.setFieldValue("hidden", !picture.hidden);
									onAutoSave();
								}}
							>
								{picture.hidden ? <EyeSlashIcon /> : <EyeIcon />}
							</Button>
						</div>
					</FormItem>
				)}
			</form.Field>
		</div>
	);
}

type PictureGeometryFieldsProps = {
	form: PictureSettingsForm;
	onAutoSave: () => void;
};

function PictureGeometryFields({ form, onAutoSave }: PictureGeometryFieldsProps) {
	return (
		<>
			<form.Field name="size">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Size</Trans>
						</FormLabel>
						<InputGroup>
							<InputGroupInput
								name={field.name}
								value={field.state.value}
								type="number"
								min={32}
								max={512}
								step={1}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "") field.handleChange("" as unknown as number);
									else field.handleChange(Number(value));
									onAutoSave();
								}}
							/>

							<InputGroupAddon align="inline-end">
								<InputGroupText>pt</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
						<FormMessage errors={field.state.meta.errors} />
					</FormItem>
				)}
			</form.Field>

			<form.Field name="rotation">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Rotation</Trans>
						</FormLabel>
						<InputGroup>
							<FormControl
								render={
									<InputGroupInput
										name={field.name}
										value={field.state.value}
										type="number"
										min={0}
										max={360}
										step={5}
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											onAutoSave();
										}}
									/>
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>°</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</FormItem>
				)}
			</form.Field>

			<form.Field name="aspectRatio">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Aspect Ratio</Trans>
						</FormLabel>
						<div className="flex items-center gap-x-2">
							<FormControl
								render={
									<Input
										name={field.name}
										value={field.state.value}
										type="number"
										min={0.5}
										max={2.5}
										step={0.1}
										onBlur={field.handleBlur}
										onChange={(e) => {
											const value = e.target.value;
											if (value === "") field.handleChange("" as unknown as number);
											else field.handleChange(Number(value));
											onAutoSave();
										}}
									/>
								}
							/>

							<ButtonGroup className="shrink-0">
								<Button
									size="icon"
									variant="outline"
									title={t({
										comment: "Preset button for setting picture aspect ratio to square",
										message: "Square",
									})}
									onClick={() => {
										field.handleChange(1);
										onAutoSave();
									}}
								>
									<div className="aspect-square min-h-3 min-w-3 border border-primary" />
								</Button>
								<Button
									size="icon"
									variant="outline"
									title={t({
										comment: "Preset button for setting picture aspect ratio to landscape orientation",
										message: "Landscape",
									})}
									onClick={() => {
										field.handleChange(1.5);
										onAutoSave();
									}}
								>
									<div className="aspect-1.5/1 min-h-3 min-w-3 border border-primary" />
								</Button>
								<Button
									size="icon"
									variant="outline"
									title={t({
										comment: "Preset button for setting picture aspect ratio to portrait orientation",
										message: "Portrait",
									})}
									onClick={() => {
										field.handleChange(0.5);
										onAutoSave();
									}}
								>
									<div className="aspect-1/1.5 min-h-3 min-w-3 border border-primary" />
								</Button>
							</ButtonGroup>
						</div>
					</FormItem>
				)}
			</form.Field>

			<form.Field name="borderRadius">
				{(field) => (
					<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
						<FormLabel>
							<Trans>Border Radius</Trans>
						</FormLabel>
						<div className="flex items-center gap-x-2">
							<InputGroup>
								<FormControl
									render={
										<InputGroupInput
											name={field.name}
											value={field.state.value}
											type="number"
											min={0}
											max={100}
											step={1}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const value = Number(e.target.value);
												field.handleChange(value);
												onAutoSave();
											}}
										/>
									}
								/>
								<InputGroupAddon align="inline-end">pt</InputGroupAddon>
							</InputGroup>

							<ButtonGroup className="shrink-0">
								<Button
									size="icon"
									variant="outline"
									title="0pt"
									onClick={() => {
										field.handleChange(0);
										onAutoSave();
									}}
								>
									<div className="size-3 rounded-none border border-primary" />
								</Button>
								<Button
									size="icon"
									variant="outline"
									title="10pt"
									onClick={() => {
										field.handleChange(10);
										onAutoSave();
									}}
								>
									<div className="size-3 rounded-[10%] border border-primary" />
								</Button>
								<Button
									size="icon"
									variant="outline"
									title="100pt"
									onClick={() => {
										field.handleChange(100);
										onAutoSave();
									}}
								>
									<div className="size-3 rounded-full border border-primary" />
								</Button>
							</ButtonGroup>
						</div>
					</FormItem>
				)}
			</form.Field>
		</>
	);
}

type PictureValues = z.infer<typeof pictureSchema>;

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file."));
		reader.readAsDataURL(file);
	});
}

function usePictureSettingsForm(picture: PictureValues, persist: (data: PictureValues) => void) {
	const form = useAppForm({
		defaultValues: picture,
		validators: { onChange: pictureSchema },
		onSubmit: ({ value }) => {
			persist(value);
		},
	});
	useSyncFormValues(form, picture);

	return form;
}

type PictureSettingsForm = ReturnType<typeof usePictureSettingsForm>;

function PictureSectionForm() {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const resume = useCurrentResume();
	const picture = resume.data.picture;
	const normalizedPictureUrl = picture.url;
	const pictureSrc = normalizedPictureUrl;
	const updateResumeData = useUpdateResumeData();

	const persist = (data: PictureValues) => {
		updateResumeData((draft) => {
			draft.picture = data;
		});
	};

	const form = usePictureSettingsForm(picture, persist);

	const handleAutoSave = () => {
		persist(form.state.values);
	};

	const onSelectPicture = () => {
		if (!fileInputRef.current) return;
		fileInputRef.current?.click();
	};

	const onDeletePicture = () => {
		if (!picture.url) return;

		form.setFieldValue("url", "");
		handleAutoSave();
	};

	const onUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const toastId = toast.loading(t`Loading picture…`);

		try {
			const url = await readFileAsDataUrl(file);
			form.setFieldValue("url", url);
			handleAutoSave();
			toast.dismiss(toastId);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch {
			toast.error(t`Failed to load picture. Please try again.`, { id: toastId });
		}
	};

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<PicturePreviewControls
				fileInputRef={fileInputRef}
				form={form}
				normalizedPictureUrl={normalizedPictureUrl}
				picture={picture}
				pictureSrc={pictureSrc}
				onAutoSave={handleAutoSave}
				onDeletePicture={onDeletePicture}
				onSelectPicture={onSelectPicture}
				onUploadPicture={onUploadPicture}
			/>

			<div className="grid @md:grid-cols-2 grid-cols-1 gap-4">
				<PictureGeometryFields form={form} onAutoSave={handleAutoSave} />

				<div className="flex items-end gap-x-3">
					<form.Field name="borderColor">
						{(field) => (
							<FormItem
								className="mb-1.5 shrink-0"
								hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
							>
								<FormControl
									render={
										<ColorPicker
											defaultValue={field.state.value}
											onChange={(color) => {
												field.handleChange(color);
												handleAutoSave();
											}}
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="borderWidth">
						{(field) => (
							<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Border Width</Trans>
								</FormLabel>
								<InputGroup>
									<FormControl
										render={
											<InputGroupInput
												name={field.name}
												value={field.state.value}
												type="number"
												min={0}
												step={1}
												onBlur={field.handleBlur}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.handleChange("" as unknown as number);
													else field.handleChange(Number(value));
													handleAutoSave();
												}}
											/>
										}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>pt</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
							</FormItem>
						)}
					</form.Field>
				</div>

				<div className="flex items-end gap-x-3">
					<form.Field name="shadowColor">
						{(field) => (
							<FormItem
								className="mb-1.5 shrink-0"
								hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}
							>
								<FormControl
									render={
										<ColorPicker
											defaultValue={field.state.value}
											onChange={(color) => {
												field.handleChange(color);
												handleAutoSave();
											}}
										/>
									}
								/>
							</FormItem>
						)}
					</form.Field>

					<form.Field name="shadowWidth">
						{(field) => (
							<FormItem className="flex-1" hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans>Shadow Width</Trans>
								</FormLabel>
								<InputGroup>
									<FormControl
										render={
											<InputGroupInput
												name={field.name}
												value={field.state.value}
												type="number"
												min={0}
												step={0.5}
												onBlur={field.handleBlur}
												onChange={(e) => {
													const value = e.target.value;
													if (value === "") field.handleChange("" as unknown as number);
													else field.handleChange(Number(value));
													handleAutoSave();
												}}
											/>
										}
									/>
									<InputGroupAddon align="inline-end">
										<InputGroupText>pt</InputGroupText>
									</InputGroupAddon>
								</InputGroup>
							</FormItem>
						)}
					</form.Field>
				</div>
			</div>
		</form>
	);
}
