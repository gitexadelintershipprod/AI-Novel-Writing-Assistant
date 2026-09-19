import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  checkForDesktopUpdates,
  copyDesktopLogPath,
  openDesktopLogsDirectory,
  restartDesktopApp,
  quitAndInstallDesktopUpdate,
  bundleDesktopLogs,
  type DesktopBootstrapSnapshot,
  type DesktopUpdaterSnapshot,
  useDesktopUpdater,
} from "@/lib/desktop";
import { cn } from "@/lib/utils";
import DesktopBrandMark from "./DesktopBrandMark";

interface DesktopBootstrapShellProps {
  snapshot: DesktopBootstrapSnapshot;
  overlay?: boolean;
}

function resolveStateLabel(snapshot: DesktopBootstrapSnapshot): string {
  switch (snapshot.state) {
    case "launching":
      return "In preparation";
    case "starting-server":
      return "Start local engine";
    case "loading-ui":
      return "Load workspace";
    case "ready":
      return "Ready";
    case "error":
      return "Start blocked";
    default:
      return snapshot.state;
  }
}

function resolveStageLabel(snapshot: DesktopBootstrapSnapshot): string {
  switch (snapshot.stage) {
    case "launching":
      return "ready to start";
    case "app-ready":
      return "Application is ready";
    case "splash-shown":
      return "Start page is shown";
    case "server-starting":
      return "Local service starting";
    case "server-healthy":
      return "Local service is ready";
    case "renderer-ready":
      return "The interface is ready";
    case "main-window-shown":
      return "The main window is shown";
    case "error":
      return "Startup failed";
    default:
      return snapshot.stage;
  }
}

function resolveProgressHint(snapshot: DesktopBootstrapSnapshot): string {
  switch (snapshot.state) {
    case "launching":
      return "Preparing desktop runtime and startup resources.";
    case "starting-server":
      return "The desktop version needs to start the local service first, and then enter the main workspace.";
    case "loading-ui":
      return "The local service is already available and is being cut into the main workbench.";
    case "ready":
      return "Starting the link has been completed.";
    case "error":
      return "If you encounter a problem during the startup process, it is recommended to check the logs and try again.";
    default:
      return snapshot.detail;
  }
}

function resolveUpdaterStatusLabel(status: DesktopUpdaterSnapshot["status"]): string {
  switch (status) {
    case "disabled":
      return "Not available";
    case "idle":
      return "To be checked";
    case "checking":
      return "Under inspection";
    case "update-available":
      return "Discover updates";
    case "downloading":
      return "Downloading";
    case "downloaded":
      return "To be installed";
    case "not-available":
      return "No update required";
    case "error":
      return "Check failed";
    default:
      return status;
  }
}

function resolveUpdaterHint(updater: DesktopUpdaterSnapshot, bootstrapState: DesktopBootstrapSnapshot["state"]): string {
  if (!updater.isSupported) {
    if (updater.isPortable) {
      return "The portable version needs to download the new version installation package and replace it manually.";
    }

    if (!updater.isPackaged) {
      return "The development run will not be connected to the release update channel, and the packaged installation version will automatically check the desktop version.";
    }

    return updater.message;
  }

  switch (updater.status) {
    case "idle":
      return bootstrapState === "error"
        ? "When startup is blocked, the desktop version will be checked simultaneously so that available fixes can be installed first."
        : "The desktop version will be checked before entering the workspace, and you will be prompted here if there is an available version.";
    case "checking":
      return "During version checking, you will be prompted to download when there is an available version.";
    case "update-available":
      return `Desktop ${updater.availableVersion ?? "new version"} is available. Download the update first.`;
    case "downloading":
      return "The update package is being downloaded, please keep the app open.";
    case "downloaded":
      return "The update package has been downloaded and the installation is completed after restarting the application.";
    case "not-available":
      return "Natively installed versions are kept in sync with release channels.";
    case "error":
      return updater.message || "Version check failed, you can try again later.";
    default:
      return updater.message;
  }
}

function formatSnapshotTime(value: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function DesktopBootstrapUpdatePanel({ snapshot }: { snapshot: DesktopBootstrapSnapshot }) {
  const updater = useDesktopUpdater();
  const didRequestStartupCheckRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const isPromptingUpdate = updater.status === "update-available" || updater.status === "downloaded";
  const isCheckingOrDownloading = updater.status === "checking" || updater.status === "downloading";
  const showDownloadButton = updater.status === "update-available";
  const showInstallButton = updater.status === "downloaded";
  const showCheckButton = updater.isSupported && !showDownloadButton && !showInstallButton && updater.status !== "downloading";

  useEffect(() => {
    if (didRequestStartupCheckRef.current || !updater.isSupported) {
      return;
    }

    if (updater.lastCheckedAt || updater.status !== "idle") {
      return;
    }

    if (snapshot.state !== "launching" && snapshot.state !== "starting-server" && snapshot.state !== "error") {
      return;
    }

    didRequestStartupCheckRef.current = true;
    void checkForDesktopUpdates().catch(() => {
      didRequestStartupCheckRef.current = false;
    });
  }, [snapshot.state, updater.isSupported, updater.lastCheckedAt, updater.status]);

  const runUpdaterAction = async (action: "check" | "install") => {
    setIsBusy(true);
    try {
      if (action === "install") {
        await quitAndInstallDesktopUpdate();
      } else {
        await checkForDesktopUpdates();
      }
    } catch (error) {
      console.error("[desktop] updater action failed.", error);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-3xl border p-5",
        isPromptingUpdate
          ? "border-warning/45 bg-warning/10"
          : "border-border/60 bg-background/55",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">version check</div>
        <Badge
          variant="outline"
          className={cn(
            "border-border bg-muted/60 text-foreground",
            isPromptingUpdate ? "border-warning/50 bg-warning/10 text-warning" : null,
          )}
        >
          {resolveUpdaterStatusLabel(updater.status)}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>native version</span>
          <span className="font-medium text-foreground">{updater.currentVersion}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Available versions</span>
          <span className="font-medium text-foreground">{updater.availableVersion ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>Check time</span>
          <span className="font-medium text-foreground">{formatSnapshotTime(updater.lastCheckedAt ?? "")}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-muted/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
        {resolveUpdaterHint(updater, snapshot.state)}
        {typeof updater.progressPercent === "number" ? ` Download progress ${Math.round(updater.progressPercent)}%.` : ""}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {showCheckButton ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border bg-background text-foreground hover:bg-muted"
            disabled={isBusy || updater.status === "checking"}
            onClick={() => void runUpdaterAction("check")}
          >
            <RefreshCw className={cn("h-4 w-4", updater.status === "checking" ? "animate-spin" : null)} aria-hidden="true" />
            {updater.status === "checking" ? "Under inspection" : updater.status === "error" || updater.status === "not-available" ? "recheck" : "Check for updates"}
          </Button>
        ) : null}
        {showDownloadButton ? (
          <Button
            type="button"
            size="sm"
            className="bg-warning text-warning-foreground hover:bg-warning/90"
            disabled={isBusy || isCheckingOrDownloading}
            onClick={() => void runUpdaterAction("check")}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download updates
          </Button>
        ) : null}
        {showInstallButton ? (
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isBusy || !updater.canInstall}
            onClick={() => void runUpdaterAction("install")}
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Restart installation
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function DesktopBootstrapShell({ snapshot, overlay = false }: DesktopBootstrapShellProps) {
  const surfaceClassName = overlay
    ? "bg-background/88 backdrop-blur-xl"
    : "bg-[radial-gradient(circle_at_18%_18%,hsl(var(--info)/0.22),transparent_34%),radial-gradient(circle_at_88%_82%,hsl(var(--primary)/0.18),transparent_38%),hsl(var(--background))]";

  return (
    <div className={cn("fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto px-5 py-6 sm:px-8", surfaceClassName)}>
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-border/70 bg-card/88 text-card-foreground shadow-[0_32px_120px_-48px_hsl(var(--foreground)/0.55)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-info/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <section className="flex min-h-[420px] flex-col justify-between border-b border-border/60 px-7 py-8 sm:px-10 sm:py-10 lg:border-b-0 lg:border-r">
            <div>
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-[24px] bg-primary/10 p-2 ring-1 ring-primary/20"><DesktopBrandMark className="h-16 w-16" /></div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.24em] text-info">AI NOVEL STUDIO</div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">AI novel creation workbench</h1>
                  </div>
                </div>
                <Badge variant="outline" className="hidden border-info/30 bg-info/10 text-info sm:inline-flex">Desktop version · {resolveStageLabel(snapshot)}</Badge>
              </div>

              <div className="mt-20 max-w-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-info"><span className="h-2 w-2 animate-pulse rounded-full bg-info" />{resolveStateLabel(snapshot)}</div>
                <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{snapshot.title}</h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">{snapshot.detail}</p>
              </div>
            </div>

            <div className="mt-12 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Connecting to your creative space</span><span>{resolveStageLabel(snapshot)}</span></div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {snapshot.state === "error" ? <span className="block h-full w-full rounded-full bg-destructive" /> : <span className="block h-full w-1/2 animate-[desktop-shell-progress_1.4s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,hsl(var(--info)),hsl(var(--primary)))]" />}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">The startup page only appears briefly when preparing local services, and will be entered automatically when the workspace is ready.</p>
            </div>
          </section>

          <section className="space-y-4 bg-muted/20 px-7 py-8 sm:px-8 sm:py-10">
            <div className="rounded-2xl border border-border/60 bg-background/55 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Startup state</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">current stage</span><span className="font-medium">{resolveStateLabel(snapshot)}</span></div>
                <div className="rounded-xl border border-border/60 bg-muted/35 px-3.5 py-3 text-sm leading-6 text-muted-foreground">{resolveProgressHint(snapshot)}</div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Latest updates</span><span>{formatSnapshotTime(snapshot.updatedAt)}</span></div>
              </div>
            </div>

            <DesktopBootstrapUpdatePanel snapshot={snapshot} />

            <details className="group rounded-2xl border border-border/60 bg-background/45 p-5">
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Logs and troubleshooting <span className="float-right transition-transform group-open:rotate-180">⌄</span></summary>
              <div className="mt-4 text-sm leading-6 text-muted-foreground">If the startup is stuck or the local service exits early, you can open the log directory to locate the problem.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void bundleDesktopLogs()}>Download recent log package</Button>
                <Button variant="outline" size="sm" onClick={() => void openDesktopLogsDirectory()}>Open log directory</Button>
                <Button variant="outline" size="sm" onClick={() => void copyDesktopLogPath()}>Copy log path</Button>
                {snapshot.state === "error" && snapshot.canRetry ? <Button size="sm" onClick={() => void restartDesktopApp()}>Restart</Button> : null}
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
