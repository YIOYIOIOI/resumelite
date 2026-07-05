import { t } from "@lingui/core/macro";
import { GithubLogoIcon, StarIcon } from "@phosphor-icons/react";
import { Button } from "@resumelite/ui/components/button";

export function GithubStarsButton() {
	const ariaLabel = t`Star us on GitHub (opens in new tab)`;

	return (
		<Button
			variant="outline"
			nativeButton={false}
			render={
				<a
					target="_blank"
					href="https://github.com/amruthpillai/reactive-resume"
					aria-label={ariaLabel}
					rel="noopener noreferrer"
				>
					<GithubLogoIcon aria-hidden="true" />
					<StarIcon aria-hidden="true" />
				</a>
			}
		/>
	);
}
