import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Plus, RefreshCw } from "lucide-react";
import {
  WorkspaceHeader,
  WorkspaceNextAction,
  WorkspaceStateNotice,
} from "@/components/workspace";
import { Button } from "@/components/ui/button";
import BookAnalysisBudgetAdjustDialog from "./components/BookAnalysisBudgetAdjustDialog";
import BookAnalysisCharacterPanel from "./components/BookAnalysisCharacterPanel";
import BookAnalysisCreateDialog from "./components/BookAnalysisCreateDialog";
import BookAnalysisDiagnosisTipBanner from "./components/BookAnalysisDiagnosisTipBanner";
import BookAnalysisDetailPanel from "./components/BookAnalysisDetailPanel";
import BookAnalysisSidebar from "./components/BookAnalysisSidebar";
import BookAnalysisWorkbenchViewTabs from "./components/BookAnalysisWorkbenchViewTabs";
import BookAnalysisWorkspaceToolbar from "./components/BookAnalysisWorkspaceToolbar";
import { useBookAnalysisActiveView } from "./hooks/useBookAnalysisActiveView";
import { useBookAnalysisChapterReader } from "./hooks/useBookAnalysisChapterReader";
import { useBookAnalysisDualPanePreference } from "./hooks/useBookAnalysisDualPanePreference";
import { useBookAnalysisWorkspace } from "./hooks/useBookAnalysisWorkspace";
import { resolveBookAnalysisNextAction } from "./bookAnalysisWorkspaceViewModel";

export default function BookAnalysisPage() {
  const workspace = useBookAnalysisWorkspace();
  const dualPanePreference = useBookAnalysisDualPanePreference();
  const chapterReader = useBookAnalysisChapterReader();
  const { activeView, setActiveView } = useBookAnalysisActiveView();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [budgetDialogMode, setBudgetDialogMode] = useState<"adjust" | "resume" | null>(null);
  const pendingResultFocusIdRef = useRef("");

  const { generatedCharacterCount, candidateCharacterCount } = useMemo(() => {
    let generated = 0;
    let candidate = 0;
    for (const character of workspace.characters) {
      if (character.status === "generated") {
        generated += 1;
      } else {
        candidate += 1;
      }
    }
    return { generatedCharacterCount: generated, candidateCharacterCount: candidate };
  }, [workspace.characters]);

  const handleCreate = async () => {
    try {
      await workspace.createAnalysis();
      setCreateDialogOpen(false);
    } catch {
      // 保持弹窗打开，用户可在错误提示后重试
    }
  };

  const handleCreateDiagnosis = async () => {
    try {
      await workspace.createDiagnosisAnalysis();
      setCreateDialogOpen(false);
    } catch {
      // 保持弹窗打开
    }
  };

  const handleBudgetSubmit = async (nextBudgetTokens: number | null) => {
    if (budgetDialogMode === "resume") {
      if (typeof nextBudgetTokens !== "number" || !Number.isFinite(nextBudgetTokens)) {
        return;
      }
      await workspace.resumeWithBudget(nextBudgetTokens);
      return;
    }
    await workspace.updateBudget(nextBudgetTokens);
  };

  const characterPanelNode = workspace.selectedAnalysis ? (
    <BookAnalysisCharacterPanel
      analysisId={workspace.selectedAnalysis.id}
      characters={workspace.characters}
      disabled={workspace.selectedAnalysis.status === "archived"}
      isLoading={workspace.pending.loadCharacters}
      pending={{
        generate: workspace.pending.generateCharacters,
        identify: workspace.pending.identifyCharacters,
        generateProfile: workspace.pending.generateCharacterProfile,
        generateAll: workspace.pending.generateAllCandidates,
        generatingIds: workspace.pending.generatingCharacterIds,
        create: workspace.pending.createCharacter,
        update: workspace.pending.updateCharacter,
        delete: workspace.pending.deleteCharacter,
      }}
      onIdentify={workspace.identifyCharacters}
      onGenerateProfile={workspace.generateCharacterProfile}
      onGenerateAll={workspace.generateAllCandidates}
      batchSummary={workspace.characterBatchSummary}
      onDismissBatchSummary={workspace.dismissCharacterBatchSummary}
      onCreate={workspace.createCharacter}
      onUpdate={workspace.updateCharacter}
      onDelete={workspace.deleteCharacter}
    />
  ) : null;

  const sectionsViewDualPaneAvailable = activeView === "sections" && dualPanePreference.dualPaneAvailable;
  const nextAction = useMemo(
    () => resolveBookAnalysisNextAction({
      analysis: workspace.selectedAnalysis,
      analysesCount: workspace.analyses.length,
    }),
    [workspace.analyses.length, workspace.selectedAnalysis],
  );

  const scrollToResults = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("book-analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const focusResults = () => {
    if (workspace.selectedAnalysis?.id) {
      pendingResultFocusIdRef.current = workspace.selectedAnalysis.id;
    }
    setActiveView("sections");
    if (activeView === "sections") {
      pendingResultFocusIdRef.current = "";
      scrollToResults();
    }
  };

  useEffect(() => {
    const pendingAnalysisId = pendingResultFocusIdRef.current;
    if (
      !pendingAnalysisId
      || activeView !== "sections"
      || workspace.selectedAnalysis?.id !== pendingAnalysisId
    ) {
      return;
    }
    pendingResultFocusIdRef.current = "";
    scrollToResults();
  }, [activeView, workspace.selectedAnalysis?.id]);

  const handlePrimaryAction = () => {
    if (nextAction.action === "create") {
      setCreateDialogOpen(true);
      return;
    }
    if (nextAction.action === "view_results") {
      focusResults();
      return;
    }
    if (nextAction.action === "resume_budget") {
      setBudgetDialogMode("resume");
      return;
    }
    if (nextAction.action === "rebuild" && workspace.selectedAnalysis) {
      workspace.rebuildAnalysis(workspace.selectedAnalysis.id);
      return;
    }
    if (nextAction.action === "copy") {
      void workspace.copySelectedAnalysis();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {workspace.selectedAnalysis ? (
        <BookAnalysisBudgetAdjustDialog
          open={budgetDialogMode !== null}
          mode={budgetDialogMode ?? "adjust"}
          analysis={workspace.selectedAnalysis}
          pending={budgetDialogMode === "resume" ? workspace.pending.resumeWithBudget : workspace.pending.updateBudget}
          onOpenChange={(open) => setBudgetDialogMode(open ? (budgetDialogMode ?? "adjust") : null)}
          onSubmit={handleBudgetSubmit}
        />
      ) : null}
      {!workspace.selectedAnalysisId ? (
        <WorkspaceHeader
          className="rounded-[24px] border-b-0 bg-card px-5 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:px-7"
          title="Book split analysis"
          description="Select source documents and generate structured book splitting results. After completion, you can directly read the sections, review the original evidence, and organize the character files."
          actions={(
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Create a new book
            </Button>
          )}
        />
      ) : null}

      {workspace.selectedAnalysisId && workspace.queryState.detailLoading ? (
        <WorkspaceStateNotice
          loading
          tone="info"
          title="Reading the book opening results"
          description="After the results are loaded, readable sections and original text evidence will be displayed directly."
        />
      ) : workspace.selectedAnalysisId && workspace.queryState.detailError ? (
        <WorkspaceStateNotice
          tone="danger"
          title="Unable to read this split book result"
          description={`${workspace.queryState.detailError} Source documents and saved results will not be overwritten.`}
          action={(
            <Button type="button" size="sm" variant="outline" onClick={workspace.retryDetail}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Retry details
            </Button>
          )}
        />
      ) : !workspace.selectedAnalysisId && workspace.queryState.analysesLoading ? (
        <WorkspaceStateNotice
          loading
          tone="info"
          title="Reading open book list"
          description="Existing analysis and recent progress are being confirmed. The next step will be given after the loading is completed."
        />
      ) : !workspace.selectedAnalysisId && workspace.queryState.analysesError ? (
        <WorkspaceStateNotice
          tone="danger"
          title="Unable to read open book list"
          description={`${workspace.queryState.analysesError} Existing source documents and analysis results will not be modified.`}
          action={(
            <Button type="button" size="sm" variant="outline" onClick={workspace.retryAnalyses}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              reload
            </Button>
          )}
        />
      ) : nextAction.tone !== "success" ? (
        <WorkspaceNextAction
          className="rounded-2xl border-transparent px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          tone={nextAction.tone}
          icon={nextAction.action === "view_results" ? ListChecks : undefined}
          title={nextAction.title}
          description={nextAction.description}
          action={nextAction.action && nextAction.action !== "select" && nextAction.actionLabel ? (
            <Button
              type="button"
              size="sm"
              onClick={handlePrimaryAction}
              disabled={workspace.pending.rebuild || workspace.pending.copy || workspace.pending.resumeWithBudget}
            >
              {nextAction.actionLabel}
            </Button>
          ) : null}
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[252px_minmax(0,1fr)]">
        <div className="order-2 min-w-0 xl:order-1 xl:sticky xl:top-4 xl:self-start">
          <BookAnalysisSidebar
            analysisMode={workspace.analysisMode}
            keyword={workspace.keyword}
            status={workspace.status}
            analyses={workspace.analyses}
            selectedAnalysisId={workspace.selectedAnalysisId}
            loading={workspace.queryState.analysesLoading}
            errorMessage={workspace.queryState.analysesError}
            onKeywordChange={workspace.setKeyword}
            onStatusChange={workspace.setStatus}
            onOpenAnalysis={(analysisId) => {
              pendingResultFocusIdRef.current = analysisId;
              setActiveView("sections");
            }}
            onOpenCreateDialog={() => setCreateDialogOpen(true)}
            onRetry={workspace.retryAnalyses}
          />
        </div>

        <div className="order-1 min-w-0 space-y-5 xl:order-2">
          {workspace.analysisMode === "diagnosis" && workspace.selectedAnalysis ? (
            <BookAnalysisDiagnosisTipBanner documentTitle={workspace.selectedAnalysis.documentTitle} />
          ) : null}
          {workspace.selectedAnalysis ? (
            <>
              <BookAnalysisWorkspaceToolbar
                selectedAnalysis={workspace.selectedAnalysis}
                selectedNovelId={workspace.selectedNovelId}
                dualPaneAvailable={sectionsViewDualPaneAvailable}
                isDualPane={dualPanePreference.dualPaneEnabled}
                pending={{
                  copy: workspace.pending.copy,
                  rebuild: workspace.pending.rebuild,
                  archive: workspace.pending.archive,
                  publish: workspace.pending.publish,
                  createStyleProfile: workspace.pending.createStyleProfile,
                  updateBudget: workspace.pending.updateBudget,
                  resumeWithBudget: workspace.pending.resumeWithBudget,
                }}
                onCopy={() => void workspace.copySelectedAnalysis()}
                onRebuild={workspace.rebuildAnalysis}
                onArchive={workspace.archiveAnalysis}
                onPublish={() => void workspace.publishSelectedAnalysis()}
                onCreateStyleProfile={() => void workspace.createStyleProfileFromAnalysis()}
                onDownload={(format) => void workspace.downloadSelectedAnalysis(format)}
                onDualPaneChange={dualPanePreference.setDualPaneEnabled}
                onOpenBudgetAdjust={() => setBudgetDialogMode("adjust")}
                onOpenBudgetResume={() => setBudgetDialogMode("resume")}
              />
              <BookAnalysisWorkbenchViewTabs
                activeView={activeView}
                onActiveViewChange={setActiveView}
                generatedCharacterCount={generatedCharacterCount}
                candidateCharacterCount={candidateCharacterCount}
              />
              {activeView === "sections" ? (
                <div id="book-analysis-results" className="scroll-mt-4">
                  <BookAnalysisDetailPanel
                    analysisMode={workspace.analysisMode}
                    selectedAnalysis={workspace.selectedAnalysis}
                    novelOptions={workspace.novelOptions}
                    documentChapters={workspace.documentChapters}
                    sourceVersionContent={workspace.sourceVersionContent}
                    sourceLoading={workspace.queryState.sourceLoading}
                    sourceError={workspace.queryState.sourceError}
                    chaptersLoading={workspace.queryState.chaptersLoading}
                    chaptersError={workspace.queryState.chaptersError}
                    selectedNovelId={workspace.selectedNovelId}
                    publishFeedback={workspace.publishFeedback}
                    styleProfileFeedback={workspace.styleProfileFeedback}
                    lastPublishResult={workspace.lastPublishResult}
                    aggregatedEvidence={workspace.aggregatedEvidence}
                    optimizingSectionKey={workspace.optimizingSectionKey}
                    isDualPane={dualPanePreference.dualPaneEnabled}
                    currentChapterIndex={chapterReader.currentChapterIndex}
                    chapterHighlightRange={chapterReader.highlightRange}
                    chapterReaderRef={chapterReader.readerRef}
                    rightColumnExtra={dualPanePreference.dualPaneEnabled ? characterPanelNode : null}
                    pending={{
                      regenerate: workspace.pending.regenerate,
                      optimizePreview: workspace.pending.optimizePreview,
                      saveSection: workspace.pending.saveSection,
                      publish: workspace.pending.publish,
                    }}
                    onActiveChapterChange={chapterReader.setCurrentChapterIndex}
                    onSelectChapter={chapterReader.scrollToChapter}
                    onEvidenceJump={chapterReader.scrollToEvidence}
                    onRetrySource={workspace.retrySource}
                    onRetryChapters={workspace.retryChapters}
                    onSelectedNovelChange={workspace.setSelectedNovelId}
                    onPublish={() => void workspace.publishSelectedAnalysis()}
                    onRegenerateSection={(section) => workspace.regenerateSection(section.sectionKey)}
                    onOptimizeSection={(section) => void workspace.optimizeSectionPreview(section)}
                    onApplyOptimizePreview={workspace.applySectionOptimizePreview}
                    onCancelOptimizePreview={workspace.clearSectionOptimizePreview}
                    onSaveSection={workspace.saveSection}
                    onDraftChange={workspace.updateSectionDraft}
                    getSectionDraft={workspace.getSectionDraft}
                  />
                </div>
              ) : (
                characterPanelNode
              )}
            </>
          ) : (
            <WorkspaceStateNotice
              tone="neutral"
              title={workspace.analyses.length > 0 ? "Choose a book analysis" : "No result of opening the book yet"}
              description={workspace.analyses.length > 0
                ? "After selecting an analysis from the left, the sources, generation stages, readable results, and recovery actions are displayed here."
                : "After creating a new book, AI will organize the source documents into readable, publishable and citable results."}
              action={workspace.analyses.length === 0 ? (
                <Button type="button" size="sm" onClick={() => setCreateDialogOpen(true)}>Create a new book</Button>
              ) : null}
            />
          )}
        </div>
      </div>

      <BookAnalysisCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        analysisMode={workspace.analysisMode}
        selectedDocumentId={workspace.selectedDocumentId}
        selectedVersionId={workspace.selectedVersionId}
        selectedDiagnosisNovelId={workspace.selectedDiagnosisNovelId}
        userFocusInstruction={workspace.userFocusInstruction}
        selectedSourceRange={workspace.selectedSourceRange}
        budgetTokens={workspace.budgetTokens}
        analysisPreset={workspace.analysisPreset}
        llmConfig={workspace.llmConfig}
        documentOptions={workspace.documentOptions}
        versionOptions={workspace.versionOptions}
        sourceDocument={workspace.sourceDocument}
        sourceChapters={workspace.sourceChapters}
        sourceChaptersRequested={workspace.sourceChaptersRequested}
        sourceChaptersLoading={workspace.sourceChaptersLoading}
        sourceChaptersError={workspace.sourceChaptersError}
        novelOptions={workspace.novelOptions}
        createPending={workspace.pending.create}
        createDiagnosisPending={workspace.pending.createDiagnosis}
        onModeChange={workspace.setAnalysisMode}
        onSelectDocument={workspace.selectDocument}
        onSelectVersion={workspace.selectVersion}
        onSelectDiagnosisNovel={workspace.setSelectedDiagnosisNovelId}
        onUserFocusInstructionChange={workspace.setUserFocusInstruction}
        onSourceRangeChange={workspace.setSelectedSourceRange}
        onBudgetTokensChange={workspace.setBudgetTokens}
        onRequestSourceChapters={workspace.requestSourceChapters}
        onAnalysisPresetChange={workspace.setAnalysisPreset}
        onLlmConfigChange={workspace.setLlmConfig}
        onCreate={handleCreate}
        onCreateDiagnosis={handleCreateDiagnosis}
      />
    </div>
  );
}
