const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAlternativePathFromRejectedApproval,
  summarizeOutput,
} = require("../dist/agents/runtime/runtimeHelpers.js");
const { composeAssistantMessage } = require("../dist/agents/runtime/answerComposer.js");
const { setNovelSetupGuidanceLLMFactoryForTests } = require("../dist/agents/runtime/novelSetupGuidanceComposer.js");
const { setNovelSetupIdeationLLMFactoryForTests } = require("../dist/agents/runtime/novelSetupIdeationComposer.js");
const { buildCreativeHubTurnSummary } = require("../dist/creativeHub/creativeHubTurnSummary.js");
const {
  deriveNextBindingsFromRunSteps,
  describeBindings,
  toBindings,
} = require("../dist/creativeHub/creativeHubRuntimeHelpers.js");

test("rejected pipeline approval falls back to preview only", () => {
  const result = buildAlternativePathFromRejectedApproval({
    goal: "写第三章",
    context: { contextMode: "novel", novelId: "novel-1" },
    plannedActions: [{
      agent: "Planner",
      reasoning: "execute",
      calls: [{
        tool: "queue_pipeline_run",
        reason: "queue",
        idempotencyKey: "k1",
        input: { novelId: "novel-1", startOrder: 3, endOrder: 3 },
      }],
    }],
  });
  assert.equal(result[0].calls[0].tool, "preview_pipeline_run");
});

test("summarizeOutput handles chapter range summary", () => {
  const text = summarizeOutput("summarize_chapter_range", {
    startOrder: 1,
    endOrder: 3,
  });
  assert.equal(text, "Summarized chapters 1–3.");
});

test("buildCreativeHubTurnSummary skips pure setup chat turns without tool results", () => {
  const summary = buildCreativeHubTurnSummary({
    checkpointId: "checkpoint-1",
    goal: "我想写一本小说",
    threadStatus: "idle",
    latestError: null,
    plannerResult: {
      source: "llm",
      validationWarnings: [],
      structuredIntent: {
        goal: "我想写一本小说",
        intent: "create_novel",
        confidence: 0.88,
        requiresNovelContext: false,
        chapterSelectors: {},
      },
      actions: [],
    },
    executionResult: {
      run: {
        id: "run-setup-1",
        status: "succeeded",
        currentStep: null,
      },
      approvals: [],
      steps: [],
      latestError: null,
    },
    interrupts: [],
    productionStatus: null,
  });

  assert.equal(summary, null);
});

test("buildCreativeHubTurnSummary skips social opening turns", () => {
  const summary = buildCreativeHubTurnSummary({
    checkpointId: "checkpoint-social-1",
    goal: "你好",
    threadStatus: "idle",
    latestError: null,
    plannerResult: {
      source: "llm",
      validationWarnings: [],
      structuredIntent: {
        goal: "你好",
        intent: "social_opening",
        confidence: 0.99,
        requiresNovelContext: false,
        interactionMode: "co_create",
        assistantResponse: "ask_followup",
        shouldAskFollowup: false,
        missingInfo: [],
        chapterSelectors: {},
      },
      plan: {
        goal: "你好",
        contextNeeds: [],
        actions: [],
        riskLevel: "low",
        requiresApproval: false,
        confidence: 0.99,
      },
      actions: [],
    },
    executionResult: {
      run: {
        id: "run-social-1",
        status: "succeeded",
        currentStep: null,
      },
      approvals: [],
      steps: [],
      latestError: null,
    },
    interrupts: [],
    productionStatus: null,
  });

  assert.equal(summary, null);
});

test("creative hub bindings preserve style profile references", () => {
  const bindings = toBindings({
    novelId: "novel-1",
    styleProfileId: "style-1",
  });

  assert.equal(bindings.styleProfileId, "style-1");
  assert.match(describeBindings(bindings), /style-1/);
});

test("composeAssistantMessage returns a light greeting for social openings", async () => {
  const text = await composeAssistantMessage(
    "你好",
    "执行摘要",
    [],
    false,
    { contextMode: "global" },
    {
      goal: "你好",
      intent: "social_opening",
      confidence: 0.99,
      requiresNovelContext: false,
      interactionMode: "co_create",
      assistantResponse: "ask_followup",
      shouldAskFollowup: false,
      missingInfo: [],
      chapterSelectors: {},
    },
  );

  assert.match(text, /Hi\. I can help polish setup/);
  assert.doesNotMatch(text, /don't treat it as a command/i);
});

test("composeAssistantMessage summarizes produce_novel before queue approval", async () => {
  const text = await composeAssistantMessage(
    "Create a 20-chapter novel titled Anti-Japanese Hero Legend and start full-book generation",
    "执行摘要",
    [
      {
        tool: "create_novel",
        success: true,
        summary: "已创建小说《抗日奇侠传》。",
        output: {
          novelId: "novel-1",
          title: "抗日奇侠传",
        },
      },
      {
        tool: "generate_world_for_novel",
        success: true,
        summary: "已生成世界观。",
        output: {
          novelId: "novel-1",
          worldId: "world-1",
          worldName: "抗战异闻录",
        },
      },
      {
        tool: "generate_novel_characters",
        success: true,
        summary: "已Generate core characters。",
        output: {
          novelId: "novel-1",
          characterCount: 5,
        },
      },
      {
        tool: "generate_story_bible",
        success: true,
        summary: "The novel bible was generated.",
        output: {
          novelId: "novel-1",
        },
      },
      {
        tool: "generate_novel_outline",
        success: true,
        summary: "Story direction generated。",
        output: {
          novelId: "novel-1",
        },
      },
      {
        tool: "generate_structured_outline",
        success: true,
        summary: "A structured outline was generated。",
        output: {
          novelId: "novel-1",
          targetChapterCount: 20,
        },
      },
      {
        tool: "sync_chapters_from_structured_outline",
        success: true,
        summary: "已同步章节目录。",
        output: {
          novelId: "novel-1",
          chapterCount: 20,
        },
      },
      {
        tool: "preview_pipeline_run",
        success: true,
        summary: "已完成整本写作预览。",
        output: {
          novelId: "novel-1",
          startOrder: 1,
          endOrder: 20,
        },
      },
    ],
    true,
    { contextMode: "novel", novelId: "novel-1" },
    {
      goal: "Create a 20-chapter novel titled Anti-Japanese Hero Legend and start full-book generation",
      intent: "produce_novel",
      confidence: 0.95,
      requiresNovelContext: false,
      novelTitle: "抗日奇侠传",
      targetChapterCount: 20,
      chapterSelectors: {},
    },
  );
  assert.match(text, /Core assets for/);
  assert.match(text, /Waiting for approval/);
});

test("composeAssistantMessage summarizes production status query", async () => {
  const text = await composeAssistantMessage(
    "整本生成到哪一步了",
    "执行摘要",
    [
      {
        tool: "get_novel_production_status",
        success: true,
        summary: "已Read full-book production status。",
        output: {
          novelId: "novel-1",
          title: "抗日奇侠传",
          currentStage: "章节正文写作中",
          chapterCount: 20,
          targetChapterCount: 20,
          pipelineStatus: null,
          failureSummary: null,
          recoveryHint: "继续从第 9 章推进正文。",
          progressBasis: "facts",
          factProgress: {
            planningCompleted: 6,
            planningTotal: 6,
            draftedChapterCount: 8,
            reviewedChapterCount: 6,
            committedChapterCount: 4,
            needsRepairChapters: 0,
          },
          runtimeStatus: {
            state: "idle",
            label: "后台任务未启动",
          },
        },
      },
    ],
    false,
    { contextMode: "novel", novelId: "novel-1" },
    {
      goal: "整本生成到哪一步了",
      intent: "query_novel_production_status",
      confidence: 0.92,
      requiresNovelContext: true,
      chapterSelectors: {},
    },
  );
  assert.match(text, /章节正文写作中/);
  assert.match(text, /Planning: 6\/6 items/);
  assert.match(text, /Chapter text: 8\/20 chapters/);
  assert.match(text, /继续从第 9 章推进正文/);
});

test("composeAssistantMessage summarizes generic progress from production status facts", async () => {
  const text = await composeAssistantMessage(
    "小说进展怎么样",
    "执行摘要",
    [
      {
        tool: "get_novel_production_status",
        success: true,
        summary: "已Read full-book production status。",
        output: {
          novelId: "novel-1",
          title: "抗日奇侠传",
          currentStage: "Quality repair待处理",
          chapterCount: 20,
          targetChapterCount: 20,
          pipelineStatus: "failed",
          failureSummary: "The model call failed",
          recoveryHint: "优先处理 2 章Quality repair，再继续后续章节。",
          progressBasis: "facts",
          factProgress: {
            planningCompleted: 6,
            planningTotal: 6,
            draftedChapterCount: 8,
            reviewedChapterCount: 8,
            committedChapterCount: 6,
            needsRepairChapters: 2,
          },
          runtimeStatus: {
            state: "failed",
            label: "Background task failed",
          },
        },
      },
    ],
    false,
    { contextMode: "novel", novelId: "novel-1" },
    {
      goal: "小说进展怎么样",
      intent: "query_progress",
      confidence: 0.92,
      requiresNovelContext: true,
      chapterSelectors: {},
    },
  );
  assert.match(text, /fact progress: Quality repair待处理/);
  assert.match(text, /Chapter text: 8\/20 chapters/);
  assert.match(text, /2 chapters waiting for repair/);
  assert.match(text, /Background: Background task failed/);
  assert.match(text, /Facts already produced can still be used/);
});

test("composeAssistantMessage does not turn novel overview queries into collaborative followups", async () => {
  const text = await composeAssistantMessage(
    "查看一下这本小说",
    "执行摘要",
    [
      {
        tool: "get_novel_production_status",
        success: true,
        summary: "已Read full-book production status。",
        output: {
          novelId: "novel-1",
          title: "妻子的秘密交易",
          currentStage: "初始化设定中",
          chapterCount: 0,
          targetChapterCount: 20,
          pipelineStatus: null,
          failureSummary: null,
          recoveryHint: "先补齐核心设定，再决定YesNo启动整本生产。",
        },
      },
    ],
    false,
    { contextMode: "novel", novelId: "novel-1" },
    {
      goal: "查看一下这本小说",
      intent: "query_novel_production_status",
      confidence: 0.74,
      requiresNovelContext: true,
      interactionMode: "review",
      assistantResponse: "ask_followup",
      shouldAskFollowup: true,
      missingInfo: ["specific aspect to view, such as progress, chapters, or production status"],
      chapterSelectors: {},
    },
  );
  assert.match(text, /妻子的秘密交易/);
  assert.match(text, /初始化设定中/);
  assert.doesNotMatch(text, /这轮更适合先一起诊断和判断/);
  assert.doesNotMatch(text, /specific aspect to view/);
});

test("composeAssistantMessage summarizes world unbinding", async () => {
  const text = await composeAssistantMessage(
    "不使用妻孝世界观了",
    "执行摘要",
    [{
      tool: "unbind_world_from_novel",
      success: true,
      summary: "已将世界观《妻孝世界观》从小说《妻子的秘密交易》解绑。",
      output: {
        novelId: "novel-1",
        novelTitle: "妻子的秘密交易",
        previousWorldId: "world-1",
        previousWorldName: "妻孝世界观",
        worldId: null,
        worldName: null,
        summary: "已将世界观《妻孝世界观》从小说《妻子的秘密交易》解绑。",
      },
    }],
    false,
    { contextMode: "novel", novelId: "novel-1", worldId: "world-1" },
    {
      goal: "不使用妻孝世界观了",
      intent: "unbind_world_from_novel",
      confidence: 0.92,
      requiresNovelContext: true,
      chapterSelectors: {},
    },
  );
  assert.match(text, /解绑/);
  assert.match(text, /妻孝世界观/);
});

test("composeAssistantMessage asks a warm kickoff question when create_novel lacks title", async () => {
  const captured = [];
  setNovelSetupGuidanceLLMFactoryForTests(async () => ({
    invoke: async (messages) => {
      captured.push(messages);
      return {
        content: "当然可以。你想先给这本书起个暂定名字，还Yes先告诉我你更想写什么类型、谁来当Protagonist？",
      };
    },
  }));
  try {
    const text = await composeAssistantMessage(
      "我想写一本小说",
      "执行摘要",
      [],
      false,
      { contextMode: "global" },
      {
        goal: "我想写一本小说",
        intent: "create_novel",
        confidence: 0.86,
        requiresNovelContext: false,
        chapterSelectors: {},
      },
    );
    assert.equal(text, "当然可以。你想先给这本书起个暂定名字，还Yes先告诉我你更想写什么类型、谁来当Protagonist？");
    assert.match(captured[0].at(-1).content, /No novel has been created yet/);
    assert.match(captured[0].at(-1).content, /has not given a clear title/);
  } finally {
    setNovelSetupGuidanceLLMFactoryForTests();
  }
});

test("composeAssistantMessage guides setup after create_novel", async () => {
  const captured = [];
  setNovelSetupGuidanceLLMFactoryForTests(async () => ({
    invoke: async (messages) => {
      captured.push(messages);
      return {
        content: "《风雪断桥》已经开好了，我们先把故事抓手定稳一点。你更想先聊ProtagonistYes谁、他卡在什么冲突里，还Yes我先给你几种Genre方向做选择？",
      };
    },
  }));
  try {
    const text = await composeAssistantMessage(
      "创建一本小说《风雪断桥》",
      "执行摘要",
      [
        {
          tool: "create_novel",
          success: true,
          summary: "已创建小说《风雪断桥》，当前进入初始化引导。",
          output: {
            novelId: "novel-setup-1",
            title: "风雪断桥",
            status: "draft",
            chapterCount: 0,
            summary: "已创建小说《风雪断桥》，当前进入初始化引导。",
            setup: {
              novelId: "novel-setup-1",
              title: "风雪断桥",
              stage: "setup_in_progress",
              completionRatio: 17,
              completedCount: 1,
              totalCount: 6,
              missingItems: ["Genre与风格", "Narrative配置", "世界观基础"],
              nextQuestion: "这本书想讲谁、遇到什么冲突、最后要把故事推向哪里？",
              recommendedAction: "先帮我补这本书的一句话设定，明确Protagonist、核心冲突和故事承诺。",
              checklist: [],
            },
          },
        },
      ],
      false,
      { contextMode: "global" },
      {
        goal: "创建一本小说《风雪断桥》",
        intent: "create_novel",
        confidence: 0.92,
        requiresNovelContext: false,
        novelTitle: "风雪断桥",
        chapterSelectors: {},
      },
    );
    assert.equal(text, "《风雪断桥》已经开好了，我们先把故事抓手定稳一点。你更想先聊ProtagonistYes谁、他卡在什么冲突里，还Yes我先给你几种Genre方向做选择？");
    assert.match(captured[0].at(-1).content, /Genre与风格, Narrative配置, 世界观基础/);
    assert.match(captured[0].at(-1).content, /Recommended question: 这本书想讲谁、遇到什么冲突、最后要把故事推向哪里？/);
  } finally {
    setNovelSetupGuidanceLLMFactoryForTests();
  }
});

test("composeAssistantMessage generates setup options from grounded novel facts", async () => {
  const captured = [];
  setNovelSetupIdeationLLMFactoryForTests(async () => ({
    invoke: async (messages) => {
      captured.push(messages);
      return {
        content: [
          "1. 方案一：ProtagonistYes没落豪门赘婿，被迫卷入妻子背后的地下交易网，故事走压抑黑色都市线。",
          "2. 方案二：ProtagonistYes调查记者丈夫，顺着妻子的异常消费挖出更大的阶层献祭秘密，故事偏悬疑反转。",
          "3. 方案三：ProtagonistYes被家庭伦理绑住的普通人，在守住婚姻与自我尊严之间被不断逼迫，故事更偏情绪撕裂。",
          "你可以先挑最接近的一版，我再继续把它细化成一句话设定。",
        ].join("\n"),
      };
    },
  }));
  try {
    const text = await composeAssistantMessage(
      "Using the current title and known information, offer 3 core-setting options for this novel. Each must include the protagonist, core conflict, goal, and genre tone.",
      "执行摘要",
      [
        {
          tool: "get_novel_context",
          success: true,
          summary: "The novel overview was read.",
          output: {
            novelId: "novel-1",
            title: "妻子的秘密交易",
            description: "都市婚姻危机Genre，围绕妻子隐秘交易展开。",
            genre: "都市情感",
            styleTone: "压抑黑暗",
            narrativePov: "third_person",
            pacePreference: "balanced",
            projectMode: "co_pilot",
            emotionIntensity: "high",
            aiFreedom: "medium",
            defaultChapterLength: 2800,
            worldId: "world-1",
            worldName: "黑暗都市",
            outline: null,
            structuredOutline: null,
            chapterCount: 0,
            completedChapterCount: 0,
            latestCompletedChapterOrder: null,
            chapterSummary: [],
          },
        },
        {
          tool: "get_story_bible",
          success: true,
          summary: "Novel-bible settings were read.",
          output: {
            novelId: "novel-1",
            exists: true,
            coreSetting: "婚姻与忠诚不断被利益侵蚀。",
            forbiddenRules: null,
            mainPromise: "在背叛与尊严之间不断撕扯。",
            characterArcs: null,
            worldRules: null,
          },
        },
        {
          tool: "get_world_constraints",
          success: true,
          summary: "已读取世界观约束：黑暗都市。",
          output: {
            worldId: "world-1",
            novelId: "novel-1",
            worldName: "黑暗都市",
            constraints: {
              axioms: "权势与金钱主导亲密关系。",
              magicSystem: null,
              conflicts: "阶层碾压与婚姻博弈交织。",
              consistencyReport: null,
            },
          },
        },
      ],
      false,
      { contextMode: "novel", novelId: "novel-1" },
      {
        goal: "Using the current title and known information, offer 3 core-setting options for this novel. Each must include the protagonist, core conflict, goal, and genre tone.",
        intent: "ideate_novel_setup",
        confidence: 0.93,
        requiresNovelContext: true,
        chapterSelectors: {},
      },
    );
    assert.match(text, /方案一/);
    assert.match(text, /挑最接近的一版/);
    assert.match(captured[0].at(-1).content, /妻子的秘密交易/);
    assert.match(captured[0].at(-1).content, /都市婚姻危机Genre/);
    assert.match(captured[0].at(-1).content, /婚姻与忠诚不断被利益侵蚀/);
  } finally {
    setNovelSetupIdeationLLMFactoryForTests();
  }
});

test("deriveNextBindingsFromRunSteps clears world binding after unbind tool", () => {
  const next = deriveNextBindingsFromRunSteps({
    novelId: "novel-1",
    chapterId: null,
    worldId: "world-1",
    taskId: null,
    bookAnalysisId: null,
    formulaId: null,
    baseCharacterId: null,
    knowledgeDocumentIds: [],
  }, [{
    stepType: "tool_result",
    status: "succeeded",
    inputJson: JSON.stringify({
      tool: "unbind_world_from_novel",
    }),
    outputJson: JSON.stringify({
      novelId: "novel-1",
      worldId: null,
      worldName: null,
    }),
  }]);

  assert.equal(next.novelId, "novel-1");
  assert.equal(next.worldId, null);
});
