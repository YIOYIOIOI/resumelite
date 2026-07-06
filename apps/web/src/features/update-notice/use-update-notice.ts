import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { toast } from "sonner";
import { fetchLatestRelease, getDismissedVersion, isElectronRuntime, setDismissedVersion, shouldNotify } from "./check";

// On app open (browser/dev only), check GitHub for a newer release and, if there is one, show
// a dismissible reminder to pull the update. Fails silently and never blocks the app. The
// Electron build is skipped — it has its own native updater.
export function useUpdateNotice(): void {
	useEffect(() => {
		if (isElectronRuntime()) return;

		const controller = new AbortController();

		void (async () => {
			const latest = await fetchLatestRelease(controller.signal);
			if (!latest) return;
			if (!shouldNotify(__APP_VERSION__, latest.version, getDismissedVersion())) return;

			const remember = () => setDismissedVersion(latest.version);
			toast(t`ResumeLite v${latest.version} is available`, {
				id: "update-available",
				description: t`Run "git pull" to get the latest, or open the release on GitHub.`,
				duration: Number.POSITIVE_INFINITY,
				closeButton: true,
				action: {
					label: t`Open GitHub`,
					onClick: () => {
						window.open(latest.url, "_blank", "noopener,noreferrer");
						remember();
					},
				},
				onDismiss: remember,
			});
		})();

		return () => controller.abort();
	}, []);
}
