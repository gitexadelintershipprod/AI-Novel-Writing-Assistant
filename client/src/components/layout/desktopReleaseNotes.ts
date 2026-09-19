import { APP_VERSION } from "@/lib/constants";

export interface DesktopReleaseNotes {
  version: string;
  title: string;
  summary: string;
  items: string[];
}

export const CURRENT_DESKTOP_RELEASE_NOTES: DesktopReleaseNotes = {
  version: APP_VERSION,
  title: "Introduction to this update",
  summary: "This update makes it easier to keep the creative workbench clear, stable, and tailored to your personal usage habits.",
  items: [
    "The creation center focuses on status query, problem diagnosis, execution records and formal portal navigation.",
    "Added light color, dark color, follow system, ink inkstone, warm paper, and night flight theme styles.",
    "The homepage and novel preview will switch with the theme, and the visual resource library supports waterfall flow displayed according to the picture ratio.",
  ],
};
