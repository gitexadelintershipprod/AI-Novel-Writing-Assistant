import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Check, Loader2, Settings2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { selectNovelProductionExperience } from "@/api/novelWorkflow";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import OnboardingTip from "@/components/onboarding/OnboardingTip";
import { queryKeys } from "@/api/queryKeys";

interface NovelProductionExperienceHandoffProps {
  taskId: string;
  novelId: string;
  novelTitle?: string;
}

export default function NovelProductionExperienceHandoff({
  taskId,
  novelId,
  novelTitle,
}: NovelProductionExperienceHandoffProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (experience: "simple" | "professional") => {
      const response = await selectNovelProductionExperience(taskId, experience);
      if (!response.data) {
        throw new Error("The production mode selection does not return to the jump position.");
      }
      return response.data;
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["novels", novelId] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.firstNovel }),
      ]);
      toast.success(response.experience === "simple"
        ? "Switched to Reading Bookshelf, AI continues to complete the entire book."
        : "Switched to the full workbench, the AI continues to complete the entire book.");
      navigate(response.targetRoute, { replace: true });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to select production method, please try again."),
  });

  return (
    <section className="mx-auto max-w-5xl space-y-5 px-3 py-6 sm:px-4 lg:px-0">
      <OnboardingTip
        storageKey="production-experience-handoff"
        title="Choose the authoring interface you want to use"
        description="The two interfaces share the same set of creation, review and recovery capabilities; the reading bookshelf focuses more on the text, and the full workbench displays more creative materials."
      />
      <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-7 text-background shadow-[0_30px_80px_-50px_hsl(var(--foreground))] sm:px-8 sm:py-9">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium text-background/70">
            <BookOpen className="h-4 w-4" />
            Preparations completed before writing
          </div>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Choose how you want to write {novelTitle?.trim() || "this novel"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-background/70">
            The story direction, characters and chapter arrangements are ready. After selecting the interface, AI will continue to advance the entire book; you can switch interfaces at any time, and the creation progress and operation permissions remain consistent.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-3xl border border-primary/30 bg-background p-6 shadow-[0_24px_65px_-50px_hsl(var(--primary))] ring-1 ring-primary/10 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Recommended for newbies</span>
          </div>
          <h2 className="mt-5 text-xl font-semibold text-foreground">reading bookshelf</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Priority is given to displaying chapter progress, saved text, and matters requiring attention.</p>
          <ul className="mt-5 flex-1 space-y-3 text-sm text-foreground">
            {["Continue writing the entire book", "Automatic review, repair and necessary re-planning", "Focus on reading the saved text"].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button type="button" className="mt-6 w-full justify-between" disabled={mutation.isPending} onClick={() => mutation.mutate("simple")}>
            {mutation.isPending && mutation.variables === "simple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Use the reading shelf
            <ArrowRight className="h-4 w-4" />
          </Button>
        </article>
        <article className="flex flex-col rounded-3xl border border-border/80 bg-background p-6 sm:p-7">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Settings2 className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-foreground">Complete workbench</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Display complete creative materials such as planning, characters, chapters and tasks.</p>
          <ul className="mt-5 flex-1 space-y-3 text-sm text-foreground">
            {["Continue writing the entire book", "View and adjust all creative assets", "Freely modify chapter planning and text"].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="mt-6 w-full justify-between" disabled={mutation.isPending} onClick={() => mutation.mutate("professional")}>
            {mutation.isPending && mutation.variables === "professional" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            Use the complete workbench
            <ArrowRight className="h-4 w-4" />
          </Button>
        </article>
      </div>
    </section>
  );
}
