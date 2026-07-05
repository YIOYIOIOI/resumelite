import type { LocalExperienceListItem } from "@/features/project/local/storage";
import { AnimatePresence, m } from "motion/react";
import { CreateExperienceCard } from "./cards/create-card";
import { ExperienceCard } from "./cards/experience-card";

type Props = {
	onLocalChange: () => void;
	experiences: LocalExperienceListItem[];
};

export function ListView({ onLocalChange, experiences }: Props) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<m.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="will-change-[transform,opacity]"
			>
				<CreateExperienceCard />
			</m.div>

			<AnimatePresence initial={false} mode="popLayout">
				{experiences.map((experience, index) => (
					<m.div
						layout
						key={experience.id}
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
						transition={{ duration: 0.2, delay: Math.min(0.12, (index + 1) * 0.02), ease: "easeOut" }}
						className="will-change-[transform,opacity]"
					>
						<ExperienceCard experience={experience} onLocalChange={onLocalChange} />
					</m.div>
				))}
			</AnimatePresence>
		</div>
	);
}
