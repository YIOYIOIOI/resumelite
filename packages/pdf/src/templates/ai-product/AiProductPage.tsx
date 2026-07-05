import type { Style } from "@react-pdf/types";
import type { ProjectItem } from "@resumelite/schema/resume/data";
import type { TemplatePageProps } from "../../document";
import type { TemplateColorRoles, TemplateStyleSlots } from "../shared/types";
import { NodeType, parse } from "node-html-parser";
import { useMemo } from "react";
import { useRender } from "../../context";
import { Image, Page, Text, View } from "../../renderer";
import { TemplateProvider } from "../shared/context";
import { getTemplatePageMinHeightStyle, getTemplatePageSize } from "../shared/page-size";
import { hasTemplatePicture } from "../shared/picture";
import { Icon } from "../shared/primitives";
import { composeStyles } from "../shared/styles";

const foreground = "#0f172a";
const headingForeground = "#1e293b";
const sectionBackground = "#cfcecb";
const separatorColor = "#e5e7eb";
const bodyText = {
	color: foreground,
	fontSize: 8.74,
	lineHeight: 1.38,
} satisfies Style;

const A4_PAGE_WIDTH = 595.28;
const LETTER_PAGE_WIDTH = 612;
const BASE_BODY_FONT_SIZE = 10;
const BASE_BODY_LINE_HEIGHT = 1.42;
const BASE_HEADING_FONT_SIZE = 16;
const BODY_FONT_SCALE = 8.74 / BASE_BODY_FONT_SIZE;
const BODY_LINE_HEIGHT_SCALE = 1.38 / BASE_BODY_LINE_HEIGHT;
const HEADING_FONT_SCALE = 15 / BASE_HEADING_FONT_SIZE;
const NAME_FONT_SCALE = 22.5 / BASE_HEADING_FONT_SIZE;

const getPageWidth = (format: ReturnType<typeof useRender>["metadata"]["page"]["format"]) =>
	format === "letter" ? LETTER_PAGE_WIDTH : A4_PAGE_WIDTH;

const displayText = (value: string) => value.replaceAll(" - ", " – ");

const displayHtml = (value: string) => displayText(value);

const isElementNode = (node: ReturnType<typeof parse>["childNodes"][number]) => node.nodeType === NodeType.ELEMENT_NODE;

const getElementTagName = (node: ReturnType<typeof parse>["childNodes"][number]) =>
	isElementNode(node) ? node.rawTagName.toLowerCase() : "";

export const AiProductPage = ({ page, pageIndex }: TemplatePageProps) => {
	const data = useRender();
	const { basics, metadata, picture } = data;
	const pageSize = getTemplatePageSize(metadata.page.format);
	const pageMinHeightStyle = getTemplatePageMinHeightStyle(metadata.page.format);
	const styles = useMemo(() => createAiProductStyles(data), [data]);
	const colors: TemplateColorRoles = { foreground, background: "#ffffff", primary: headingForeground };
	const hasPicture = pageIndex === 0 && hasTemplatePicture(picture);

	return (
		<Page size={pageSize} style={composeStyles(styles.page, pageMinHeightStyle)}>
			<TemplateProvider styles={templateStyles} colors={colors}>
				{pageIndex === 0 ? (
					<View style={styles.header}>
						<View style={styles.identity}>
							<Text style={styles.name}>{basics.name}</Text>
							<Text style={styles.headline}>{basics.headline}</Text>
							<View style={styles.contactRow}>
								{basics.phone.trim() ? (
									<View style={styles.contactItem}>
										<Icon name="phone" size={12} style={styles.contactIcon} />
										<Text style={styles.contactText}>{basics.phone}</Text>
									</View>
								) : null}

								{basics.email.trim() ? (
									<>
										<View style={styles.contactSeparator} />
										<View style={styles.contactItem}>
											<Icon name="envelope-simple" size={12} style={styles.contactIcon} />
											<Text style={styles.contactText}>{basics.email}</Text>
										</View>
									</>
								) : null}
							</View>
						</View>

						{hasPicture ? <Image src={picture.url} style={styles.picture} /> : null}
					</View>
				) : null}

				<View style={styles.sections}>
					{page.main.map((section) => (
						<AiProductSection key={section} section={section} styles={styles} />
					))}
				</View>
			</TemplateProvider>
		</Page>
	);
};

type AiProductSectionProps = {
	section: string;
	styles: ReturnType<typeof createAiProductStyles>;
};

const AiProductSection = ({ section, styles }: AiProductSectionProps) => {
	const data = useRender();

	if (section === "education") {
		const items = data.sections.education.items.filter((item) => !item.hidden);
		if (data.sections.education.hidden || items.length === 0) return null;

		return (
			<View style={styles.section}>
				<SectionHeading title={data.sections.education.title} styles={styles} />
				<View style={styles.educationContent}>
					{items.map((item) => (
						<View key={item.id} style={styles.educationItem}>
							<View style={styles.splitRow}>
								<Text style={styles.school}>{item.school}</Text>
								<Text style={styles.bodyText}>{displayText(item.period)}</Text>
							</View>
							<View style={styles.splitRow}>
								<Text style={styles.bodyText}>{item.area}</Text>
								<Text style={styles.bodyText}>{item.degree}</Text>
							</View>
							<View style={styles.description}>
								<AiProductRichText html={item.description} styles={styles} />
							</View>
						</View>
					))}
				</View>
			</View>
		);
	}

	if (section === "summary") {
		if (data.summary.hidden || !data.summary.content.trim()) return null;

		return (
			<View style={styles.section}>
				<SectionHeading title={data.summary.title} styles={styles} />
				<View style={styles.summaryContent}>
					<AiProductRichText html={data.summary.content} styles={styles} />
				</View>
			</View>
		);
	}

	if (section === "projects") {
		const items = data.sections.projects.items.filter((item) => !item.hidden);
		if (data.sections.projects.hidden || items.length === 0) return null;

		return (
			<View style={styles.projectsSection}>
				<SectionHeading title={data.sections.projects.title} styles={styles} />
				<View style={styles.projectsContent}>
					{items.map((item, index) => (
						<Project key={item.id} isLast={index === items.length - 1} item={item} styles={styles} />
					))}
				</View>
			</View>
		);
	}

	if (section === "skills") {
		const items = data.sections.skills.items.filter((item) => !item.hidden);
		if (data.sections.skills.hidden || items.length === 0) return null;

		return (
			<View style={styles.skillsSection}>
				<SectionHeading title={data.sections.skills.title} styles={styles} />
				<View style={styles.skillsContent}>
					{items.map((item) => (
						<View key={item.id} style={styles.skillRow}>
							<Text style={styles.bullet}>•</Text>
							<Text style={styles.bodyText}>
								<Text style={styles.bold}>{item.name}：</Text>
								{displayText(item.keywords.join("、"))}
							</Text>
						</View>
					))}
				</View>
			</View>
		);
	}

	return null;
};

type ProjectProps = {
	isLast: boolean;
	item: ProjectItem;
	styles: ReturnType<typeof createAiProductStyles>;
};

const Project = ({ isLast, item, styles }: ProjectProps) => (
	<View style={isLast ? styles.projectItemLast : styles.projectItem}>
		<View style={styles.projectHeader}>
			<Text style={styles.projectTitle}>{item.name}</Text>
			<Text style={styles.bodyText}>{displayText(item.period)}</Text>
		</View>
		<View style={styles.projectDescription}>
			<AiProductRichText html={item.description} styles={styles} variant="project" />
		</View>
	</View>
);

type AiProductRichTextProps = {
	html: string;
	styles: ReturnType<typeof createAiProductStyles>;
	variant?: "default" | "project";
};

const AiProductRichText = ({ html, styles, variant = "default" }: AiProductRichTextProps) => {
	const root = parse(displayHtml(html.trim()), { comment: false });
	const nodes = root.childNodes.filter((node) => node.text.trim() !== "");

	return (
		<View>
			{nodes.map((node, index) => {
				const tagName = getElementTagName(node);

				if (tagName === "ul") {
					return (
						<View key={`ul-${index}`} style={styles.richList}>
							{node.childNodes
								.filter((child) => getElementTagName(child) === "li")
								.map((child, childIndex) => (
									<View key={`li-${index}-${childIndex}`} style={styles.richListItem}>
										<Text style={styles.richBullet}>•</Text>
										<Text style={styles.richListText}>{displayText(child.text.trim())}</Text>
									</View>
								))}
						</View>
					);
				}

				const childElementNodes = node.childNodes.filter(isElementNode);
				const firstChildElement = childElementNodes[0];
				const isProjectLabel =
					variant === "project" &&
					childElementNodes.length === 1 &&
					firstChildElement !== undefined &&
					["b", "strong"].includes(getElementTagName(firstChildElement)) &&
					node.text.trim().endsWith("：");

				return (
					<Text key={`p-${index}`} style={isProjectLabel ? styles.projectLabelParagraph : styles.richParagraph}>
						{node.childNodes.length > 0
							? node.childNodes.map((child, childIndex) => {
									const childTagName = getElementTagName(child);
									const text = displayText(child.text);
									if (!text) return null;

									if (childTagName === "strong" || childTagName === "b") {
										return (
											<Text key={`strong-${index}-${childIndex}`} style={styles.bold}>
												{text}
											</Text>
										);
									}

									return text;
								})
							: displayText(node.text)}
					</Text>
				);
			})}
		</View>
	);
};

type SectionHeadingProps = {
	title: string;
	styles: ReturnType<typeof createAiProductStyles>;
};

const SectionHeading = ({ title, styles }: SectionHeadingProps) => (
	<View style={styles.sectionHeading}>
		<Text style={styles.sectionHeadingText}>{title}</Text>
	</View>
);

const templateStyles: TemplateStyleSlots = {
	text: bodyText,
	bold: {
		fontWeight: 600,
	},
	richParagraph: bodyText,
	richListItemRow: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	richListItemMarker: {
		...bodyText,
		width: 8,
		marginRight: 6,
	},
	richListItemContent: {
		...bodyText,
	},
	link: {
		color: foreground,
		textDecoration: "none",
	},
	icon: {
		color: "#595855",
	},
};

const createAiProductStyles = (data: ReturnType<typeof useRender>) => {
	const fontFamily = data.metadata.typography.body.fontFamily as string;
	const page = data.metadata.page;
	const bodyFontSize = data.metadata.typography.body.fontSize * BODY_FONT_SCALE;
	const bodyLineHeight = data.metadata.typography.body.lineHeight * BODY_LINE_HEIGHT_SCALE;
	const headingFontSize = data.metadata.typography.heading.fontSize * HEADING_FONT_SCALE;
	const contentWidth = getPageWidth(page.format) - page.marginX * 2;
	const itemGapY = page.gapY;
	const textStyle = {
		color: foreground,
		fontSize: bodyFontSize,
		fontWeight: 400,
		lineHeight: bodyLineHeight,
	} satisfies Style;
	const bulletSize = bodyFontSize * 1.37;

	return {
		page: {
			backgroundColor: "#ffffff",
			color: foreground,
			fontFamily,
			fontSize: bodyFontSize,
			paddingTop: Math.max(8, page.marginY - 0.5),
			paddingRight: page.marginX,
			paddingBottom: Math.max(8, page.marginY - 2),
			paddingLeft: page.marginX,
		},
		header: {
			position: "relative",
			height: Math.max(72, itemGapY * 15),
			marginBottom: itemGapY * 2,
		},
		identity: {
			width: contentWidth - 120,
			paddingTop: itemGapY,
		},
		name: {
			color: foreground,
			fontSize: data.metadata.typography.heading.fontSize * NAME_FONT_SCALE,
			fontWeight: 600,
			lineHeight: 1.15,
			marginBottom: itemGapY * 1.33,
		},
		headline: {
			color: foreground,
			fontSize: headingFontSize,
			fontWeight: 400,
			lineHeight: 1.2,
			marginBottom: itemGapY * 1.67,
		},
		contactRow: {
			flexDirection: "row",
			alignItems: "center",
		},
		contactItem: {
			flexDirection: "row",
			alignItems: "center",
		},
		contactIcon: {
			marginRight: 6,
		},
		contactText: {
			color: foreground,
			fontSize: bodyFontSize * 1.2,
			lineHeight: 1,
		},
		contactSeparator: {
			width: 0.75,
			height: headingFontSize,
			backgroundColor: separatorColor,
			marginHorizontal: 8,
		},
		picture: {
			position: "absolute",
			top: 0,
			right: 3,
			width: Math.max(54, itemGapY * 11.25),
			height: Math.max(72, itemGapY * 15),
		},
		sections: {
			width: contentWidth,
		},
		section: {
			marginBottom: itemGapY * 2.125,
		},
		projectsSection: {
			marginBottom: itemGapY * 2.125,
		},
		skillsSection: {
			marginBottom: 0,
		},
		sectionHeading: {
			height: headingFontSize * 1.85,
			width: contentWidth,
			backgroundColor: sectionBackground,
			justifyContent: "center",
			paddingLeft: page.gapX * 1.5,
		},
		sectionHeadingText: {
			color: headingForeground,
			fontSize: headingFontSize,
			fontWeight: 600,
			lineHeight: 1,
		},
		educationContent: {
			marginTop: itemGapY * 1.2,
		},
		educationItem: {
			rowGap: itemGapY * 0.58,
		},
		splitRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			justifyContent: "space-between",
			width: contentWidth,
		},
		school: {
			color: foreground,
			fontSize: headingFontSize * 0.8,
			fontWeight: 600,
			lineHeight: 1.1,
		},
		bodyText: textStyle,
		bold: {
			fontWeight: 600,
		},
		description: {
			marginTop: itemGapY * 0.5,
		},
		summaryContent: {
			marginTop: itemGapY * 1.17,
		},
		projectsContent: {
			marginTop: itemGapY * 1.2,
		},
		projectItem: {
			marginBottom: itemGapY * 2.58,
		},
		projectItemLast: {
			marginBottom: 0,
		},
		projectHeader: {
			flexDirection: "row",
			alignItems: "flex-end",
			justifyContent: "space-between",
			width: contentWidth,
		},
		projectTitle: {
			color: foreground,
			fontSize: headingFontSize * 0.8,
			fontWeight: 600,
			lineHeight: 1.1,
			maxWidth: contentWidth - 105,
		},
		projectDescription: {
			marginTop: itemGapY * 0.33,
		},
		richParagraph: {
			...textStyle,
			marginBottom: 1,
		},
		projectLabelParagraph: {
			...textStyle,
			marginTop: itemGapY * 1.46,
			marginBottom: 1,
		},
		richList: {
			marginBottom: 1,
		},
		richListItem: {
			flexDirection: "row",
			alignItems: "flex-start",
			marginBottom: 0.5,
		},
		richBullet: {
			color: foreground,
			fontSize: bulletSize,
			lineHeight: 1,
			width: 14,
			paddingLeft: 3.5,
		},
		richListText: {
			...textStyle,
			flex: 1,
		},
		skillsContent: {
			marginTop: itemGapY * 1.2,
		},
		skillRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			marginBottom: itemGapY * 0.25,
		},
		bullet: {
			color: foreground,
			fontSize: bulletSize,
			lineHeight: 1,
			width: 14,
			paddingLeft: 3.5,
		},
	} satisfies Record<string, Style>;
};
