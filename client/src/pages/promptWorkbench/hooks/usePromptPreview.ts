import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  previewPrompt,
  testRunPrompt,
  type PromptCatalogItem,
  type PromptPreviewPayload,
  type PromptTestRunPayload,
  type PromptTestRunResult,
  type PromptTemplateJson,
} from "@/api/promptWorkbench";
import { useSSE } from "@/hooks/useSSE";
import type { PromptSlotDrafts } from "../promptWorkbenchTypes";

interface PreviewNovel {
  id: string;
  title?: string | null;
}

interface PreviewChapter {
  id: string;
  title?: string | null;
  order?: number | null;
  content?: string | null;
  expectation?: string | null;
  targetWordCount?: number | null;
  taskSheet?: string | null;
}

function buildPreviewExtraContextBlocks(prompt: PromptCatalogItem) {
  if (prompt.id !== "audit.chapter.light" && prompt.id !== "audit.chapter.full") {
    return [];
  }
  return [
    {
      id: "chapter_mission",
      group: "chapter_mission",
      priority: 100,
      content: [
        "Chapter mission: Sample chapter",
        "Objective: Have the protagonist discover the old warehouse code signal and confirm that someone is closing in.",
        "Expectation: This chapter needs to advance clue discovery, create external pressure, and leave a pursuit hook at the end.",
        "Must advance",
        "- The protagonist discovers the code signal on the wall and determines it points to the Old City archive station.",
        "- Footsteps close in outside the door, forcing the protagonist to make an immediate choice.",
        "Must preserve",
        "- The code signal is a real clue, not a hallucination or ordinary graffiti.",
      ].join("\n"),
    },
    {
      id: "chapter_boundary",
      group: "chapter_boundary",
      priority: 99,
      required: true,
      content: [
        "Chapter boundary:",
        "Exclusive event: The protagonist discovers, for the first time, the code signal left behind by the previous investigator in the old warehouse.",
        "Entry state: The protagonist enters the old warehouse alone; the meaning of the code signal is not yet confirmed.",
        "Ending state: The protagonist confirms the code signal points to the Old City archive station, and realizes the pursuer is already at the door.",
        "Next chapter entry state: The protagonist must decide, before being exposed, whether to take the evidence or set an ambush to trace things back.",
        "Do not cross",
        "- Do not directly reveal the Old City organization's true leader in this chapter.",
        "- Do not let the pursuer fully explain the code signal system on the spot.",
        "Protected reveals",
        "- The true identity of the previous investigator.",
      ].join("\n"),
    },
    {
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 94,
      required: true,
      content: [
        "Structure obligations",
        "- Must check whether this chapter completes clue discovery, mounting pressure, and the end-of-chapter decision point.",
        "- Must check whether the protagonist's motivation remains continuous, without knowing the code signal's answer out of nowhere.",
        "- Must check whether the ending creates new suspense or pursuit pressure.",
      ].join("\n"),
    },
    {
      id: "local_state",
      group: "local_state",
      priority: 89,
      content: "Local state before review:\nThe protagonist is inside the old warehouse, an outside pursuer is closing in, and the meaning of the code signal is not yet fully confirmed.",
    },
    {
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: "Relevant world rules\n- The Old City code signal system is known only to a handful of investigators and underground organization members.",
    },
  ];
}

function buildPreviewExecutionMetadata(
  prompt: PromptCatalogItem,
  hasRealChapterContext: boolean,
): Record<string, unknown> | undefined {
  if (hasRealChapterContext) {
    return undefined;
  }
  const extraContextBlocks = buildPreviewExtraContextBlocks(prompt);
  if (extraContextBlocks.length === 0) {
    return undefined;
  }
  return { extraContextBlocks };
}

function buildPreviewPromptInput(
  prompt: PromptCatalogItem,
  previewNovel?: PreviewNovel | null,
  previewChapter?: PreviewChapter | null,
): Record<string, unknown> {
  if (prompt.id === "audit.chapter.light" || prompt.id === "audit.chapter.full") {
    const chapterContent = previewChapter
      ? previewChapter.content?.trim()
        || previewChapter.taskSheet?.trim()
        || previewChapter.expectation?.trim()
        || "This chapter has no body text yet."
      : "The protagonist walks into the old warehouse and finds the remnants of a code signal left on the wall by the previous investigator. Footsteps close in outside the door; before he is exposed, he must work out where the code signal points.";
    return {
      novelTitle: previewNovel?.title || "Sample novel",
      chapterTitle: previewChapter
        ? `Chapter ${previewChapter.order ?? "?"}: ${previewChapter.title || "Untitled chapter"}`
        : "Sample chapter",
      requestedTypes: ["plot", "character", "continuity"],
      storyModeContext: previewNovel
        ? "Run this book preview using the selected novel's chapter mission, chapter boundary, and structure obligations."
        : "This book leans toward serialized web-novel pacing: chapters must keep advancing the conflict and retain an end-of-chapter hook.",
      content: chapterContent,
      ragContext: "No additional retrieval context.",
    };
  }

  if (prompt.id === "novel.chapter.writer") {
    const targetWordCount = previewChapter?.targetWordCount ?? 3000;
    const softMinWordCount = Math.max(800, Math.round(targetWordCount * 0.86));
    const softMaxWordCount = Math.max(softMinWordCount + 200, Math.round(targetWordCount * 1.14));
    return {
      novelTitle: previewNovel?.title || "Sample novel",
      chapterOrder: previewChapter?.order ?? 1,
      chapterTitle: previewChapter?.title || "Sample chapter",
      mode: "draft",
      targetWordCount,
      minWordCount: softMinWordCount,
      maxWordCount: softMaxWordCount,
    };
  }

  if (prompt.id === "novel.short_story.segment.write") {
    return {
      originalIdea: "A girl who can hear lies meets the one person whose truth she cannot judge.",
      understanding: "Use the breakdown of truth detection to create a crisis of trust, and pay off both the relationship and the truth within one complete event.",
      direction: { id: "preview", title: "Silent Testimony", premise: "The girl must work with a witness she cannot read.", coreExperience: "Suspense and trust", protagonist: "A girl who can hear lies", centralConflict: "A failing ability and closing danger", endingPromise: "Uncover why her ability fails", styleKeywords: ["Fast opening", "Consecutive reveals"] },
      plan: { title: "Silent Testimony", targetWordCount: 8000, endingPromise: "Uncover the truth", segments: [] },
      segment: { order: 1, purpose: "Establish the anomaly and the pressure to cooperate", targetWordCount: 2600, openingState: "Her ability has always been reliable", openingHook: "The only silence", immediateGoal: "Determine whether the witness can be trusted", progressionBeats: ["Danger closing in", "Forced cooperation"], turningPoint: "The ability is not failing after all", payoff: "Discovering the first layer of truth", closingPull: "The real lie comes from someone close", closingState: "The two form a temporary alliance" },
      previousContinuity: "",
      previousContentTail: "",
    };
  }

  if (prompt.id === "novel.chapter_editor.workspace_diagnosis") {
    return {
      chapterTitle: "Sample chapter",
      chapterMission: "Have the protagonist discover a key clue.",
      volumePositionLabel: "Midway through Volume 1",
      volumePhaseLabel: "Conflict unfolding",
      paceDirective: "Accelerate the pacing",
      previousChapterBridge: "The previous chapter left a tracking clue.",
      nextChapterBridge: "The next chapter moves into direct confrontation.",
      activePlotThreads: ["Tracking down the archive station"],
      paragraphs: [{ index: 1, text: "The protagonist walks into the old warehouse." }],
      openIssues: [],
    };
  }

  if (prompt.id === "bookAnalysis.character.profile") {
    return {
      generationDepth: "standard",
      selectedDimensions: ["basic", "personality", "arc"],
      character: {
        name: "Lin Che",
        role: "protagonist",
        briefDescription: "A young investigator compelled to track down the old warehouse code signal.",
        importance: "high",
        occurringChapters: ["Chapter 1"],
      },
      characterSystemContext: "The protagonist carries the responsibility of driving the unveiling of the Old City's secret.",
      notesText: "In Chapter 1, Lin Che discovers the old warehouse code signal and realizes someone is tracking him.",
      ragEvidenceText: "",
    };
  }

  if (prompt.id === "bookAnalysis.character.generate") {
    return {
      generationDepth: "standard",
      selectedDimensions: ["basic", "personality", "arc"],
      characterNames: ["Lin Che", "Shen Wu"],
      characterSystemContext: "The core characters form a relationship web around the Old City secret and the pressure of pursuit.",
      notesText: "Lin Che discovers the code signal, Shen Wu holds the Old City clues, and the two do not trust each other for now.",
    };
  }

  if (prompt.id === "image.novel_cover.brief") {
    return {
      sourcePrompt: "An Old City warehouse, a code signal on the wall, footsteps outside the door, a vertical cover with a strong sense of suspense.",
      title: "The Old City Code",
      description: "A young investigator discovers a destiny-changing code signal in an abandoned Old City warehouse.",
      targetAudience: "Readers who enjoy urban suspense and strong hook openings.",
      bookSellingPoint: "Every chapter advances around a single traceable clue.",
      competingFeel: "Tense, restrained, with a touch of cold-toned cinematic feel.",
      first30ChapterPromise: "Uncover the organization behind the Old City code signal, and draw the protagonist into a far larger conspiracy.",
      commercialTags: ["Urban suspense", "Clue hunting", "High-pressure opening"],
      genreLabel: "Urban suspense",
      primaryStoryModeLabel: "Clue-driven progression",
      secondaryStoryModeLabel: "Identity mystery",
      worldName: "The Old City",
      worldSummary: "An old city district, calm on the surface, with clue networks crisscrossing beneath.",
      styleTone: "Cold, taut, strongly visual",
      narrativePovLabel: "Third-person limited perspective",
      pacePreferenceLabel: "Medium-fast pace",
      emotionIntensityLabel: "High pressure, restrained",
    };
  }

  if (prompt.id === "novel.character.castAuto.relations") {
    return {
      storyInput: "The protagonist traces the code signal through the Old City, gradually uncovering the secrets held by those around him and the pressure from the organization.",
      optionTitle: "Old City Pursuit Cast",
      optionSummary: "The protagonist, the clue provider, and the source of pressure form a web of mutual probing around the Old City secret.",
      protagonistName: "Lin Che",
      memberNames: ["Lin Che", "Shen Wu", "Gu Heng"],
      memberRosterText: "Lin Che: protagonist, a young investigator.\nShen Wu: clue provider, knows the origin of the Old City code signal.\nGu Heng: source of pressure, trying to stop the investigation.",
    };
  }

  if (prompt.id === "world.layer.generate") {
    return {
      layerKey: "foundation",
      targetFields: ["background", "geography"],
      worldName: "The Old City",
      worldType: "Urban occult",
      templateName: "Urban suspense",
      templateDescription: "A secret order that has long operated beneath the surface of a real-world city.",
      classicElements: ["Old city district", "Underground organization", "Code signal clues"],
      pitfalls: ["Don't explain all the mysteries away at once", "Don't leave the rules as mere concepts"],
      axioms: "The Old City's code signal system genuinely exists and will affect the characters' actions.",
      summary: "The Old City consists of a surface layer of ordinary life and an underground network of clues.",
      blueprintPromptBlock: "The core stage is the abandoned warehouse, the old streets, and the concealed archive station.",
      existingJson: "{}",
      ragContext: "No additional references.",
    };
  }

  if (prompt.id === "world.layer.localize") {
    return {
      layerKey: "foundation",
      layerFields: ["background", "geography"],
      sourcePayloadJson: JSON.stringify({
        background: "Old city has a hidden clue network.",
        geography: "Warehouse district, old streets, archive station.",
      }),
    };
  }

  if (prompt.id === "writingFormula.extract.stream") {
    return {
      extractLevel: "standard",
      focusAreas: ["Pacing", "Sentence structure", "Visual imagery"],
      sourceText: "The footsteps outside the door stopped. Lin Che held his breath, fingertips brushing the code signal on the wall, and suddenly understood that it was not a warning, but an invitation.",
    };
  }

  if (prompt.id === "novel.chapter_editor.rewrite_candidates") {
    return {
      operation: "polish",
      operationLabel: "Polish the selected passage",
      scope: "selection",
      customInstruction: "",
      selectedText: "The footsteps outside the door stopped. Lin Che held his breath, fingertips brushing the code signal on the wall.",
      beforeParagraphs: ["Only a single flickering lamp remained in the old warehouse."],
      afterParagraphs: ["The next second, the iron door was gently pushed open from outside."],
      goalSummary: "Have the protagonist discover a key clue, and use external pressure to create end-of-chapter tension.",
      chapterSummary: "The protagonist enters the old warehouse, discovers the code signal, and realizes the pursuer has already closed in.",
      styleSummary: "Cold, restrained, with crisp action details.",
      characterStateSummary: "The protagonist is wary but still willing to take risks to push the investigation forward.",
      worldConstraintSummary: "The Old City code signal is a real clue, not a hallucination or ordinary graffiti.",
      macroContextSummary: "This chapter is what pulls the protagonist past the first threshold into the Old City secret.",
      resolvedIntentSummary: "Make the passage more natural, and heighten the suspense and pressure.",
      constraintsText: "Do not change the three facts that the code signal exists, that someone is closing in outside the door, and that the protagonist is investigating.",
    };
  }

  return {
    goal: "View prompt preview",
    messages: [],
    contextMode: "novel",
    novelId: "novel-1",
    chapterTitle: "Sample chapter",
    chapterMission: "Have the protagonist discover a key clue.",
  };
}

interface UsePromptPreviewInput {
  prompt: PromptCatalogItem | null;
  entrypoint: string;
  novelId?: string;
  chapterId?: string;
  previewNovel?: PreviewNovel | null;
  previewChapter?: PreviewChapter | null;
  slotOverrides: PromptSlotDrafts;
  templateDraft?: PromptTemplateJson;
}

export function usePromptPreview(input: UsePromptPreviewInput) {
  const {
    chapterId,
    entrypoint,
    novelId,
    previewChapter,
    previewNovel,
    prompt,
    slotOverrides,
    templateDraft,
  } = input;
  const [streamedTestRun, setStreamedTestRun] = useState<PromptTestRunResult | null>(null);
  const streamedTestRunRef = useRef<{
    prompt: PromptCatalogItem;
    llm?: PromptTestRunPayload["llm"];
    startedAt: number;
  } | null>(null);
  const testRunStream = useSSE({
    onDone: (outputText) => {
      const current = streamedTestRunRef.current;
      if (!current) {
        return;
      }
      setStreamedTestRun({
        prompt: current.prompt,
        outputType: "text",
        output: outputText,
        outputText,
        messages: [],
        context: {
          blocks: [],
          selectedBlockIds: [],
          droppedBlockIds: [],
          summarizedBlockIds: [],
          estimatedInputTokens: 0,
        },
        meta: {
          provider: current.llm?.provider,
          model: current.llm?.model,
          latencyMs: Date.now() - current.startedAt,
        },
        diagnostics: {
          missingRequiredGroups: [],
          resolverErrors: [],
          notes: [],
        },
      });
    },
  });

  const buildPayload = useCallback((): PromptPreviewPayload => {
    if (!prompt) {
      throw new Error("Please select a prompt before generating a preview.");
    }
    const executionNovelId = novelId || "novel-1";
    const executionChapterId = chapterId || previewChapter?.id || (novelId ? undefined : "chapter-1");
    const hasRealChapterContext = Boolean(novelId && executionChapterId && previewChapter);
    return {
      promptKey: prompt.key,
      promptInput: buildPreviewPromptInput(prompt, previewNovel, previewChapter),
      executionContext: {
        entrypoint,
        novelId: executionNovelId,
        chapterId: executionChapterId,
        userGoal: "View prompt preview",
        resourceBindings: {
          novelId: executionNovelId,
          ...(executionChapterId ? { chapterId: executionChapterId } : {}),
        },
        metadata: buildPreviewExecutionMetadata(prompt, hasRealChapterContext),
      },
      maxContextTokens: prompt.contextPolicy.maxTokensBudget,
      slotOverrides,
      templateDraft,
    };
  }, [
    chapterId,
    entrypoint,
    novelId,
    previewChapter,
    previewNovel,
    prompt,
    slotOverrides,
    templateDraft,
  ]);

  const previewMutation = useMutation({
    mutationFn: () => previewPrompt(buildPayload()),
  });

  const testRunMutation = useMutation({
    mutationFn: (llm?: PromptTestRunPayload["llm"]) => {
      const payload: PromptTestRunPayload = {
        ...buildPayload(),
        ...(llm ? { llm } : {}),
      };
      return testRunPrompt(payload);
    },
  });

  useEffect(() => {
    previewMutation.reset();
    testRunMutation.reset();
    setStreamedTestRun(null);
  }, [prompt?.key]);

  const generatePreview = useCallback(() => {
    previewMutation.mutate();
  }, [previewMutation]);

  const generateTestRun = useCallback((llm?: PromptTestRunPayload["llm"]) => {
    if (prompt?.outputType === "text") {
      testRunMutation.reset();
      setStreamedTestRun(null);
      streamedTestRunRef.current = { prompt, llm, startedAt: Date.now() };
      void testRunStream.start("/prompt-workbench/test-run/stream", {
        ...buildPayload(),
        ...(llm ? { llm } : {}),
      });
      return;
    }
    testRunMutation.mutate(llm);
  }, [buildPayload, prompt, testRunMutation, testRunStream]);

  return {
    generatePreview,
    generateTestRun,
    preview: previewMutation.data?.data ?? null,
    previewMutation,
    testRun: streamedTestRun ?? testRunMutation.data?.data ?? null,
    testRunStreamOutput: testRunStream.isStreaming ? testRunStream.content : "",
    isTestRunPending: testRunStream.isStreaming || testRunMutation.isPending,
    testRunError: testRunStream.error
      ?? (testRunMutation.error instanceof Error ? testRunMutation.error.message : null),
    testRunMutation,
    resetPreview: previewMutation.reset,
  };
}
