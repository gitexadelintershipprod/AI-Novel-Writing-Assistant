# პროექტის მიმოხილვა — AI Novel Writing Assistant

> ტექნიკური აღწერა და ორიენტაციის დოკუმენტი. შედგენილია რეპოზიტორიის კოდის, კონფიგურაციისა და გაშვებული stack-ის პირდაპირი შემოწმებით.
> მდგომარეობა: `2026-09-12` · ბრენჩი `main` · სამუშაო ხე სუფთა

## 1. რა არის ეს პროექტი

**AI Novel Production Engine** — AI-native ღია სისტემა **სრული, გრძელი რომანის დასაწერად**. ეს არა "ჩატის გარსია", სადაც მომხმარებელი წერს წინადადებას და AI აგრძელებს, არამედ **საწარმოო ჯაჭვია (production chain)**: AI მონაწილეობს დაგეგმვაში, გადაწყვეტილების მიღებაში, დისპეტჩერიზაციაში, შესრულებასა და თვალყურის დევნებაში.

რეპოზიტორია არის **fork**:

| | |
| --- | --- |
| `origin` | `github.com/gitexadelintershipprod/AI-Novel-Writing-Assistant` |
| upstream (საწყისი) | `github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant` |
| ლიცენზია | AGPL-3.0-only (+ ცალკე კომერციული ლიცენზია SaaS-ისთვის) |
| fork-ის დანიშნულება | ინტერფეისი **ინგლისურად**, გენერირებული შემოქმედებითი კონტენტი **ქართულად** (`ka-GE`) |

### 1.1 პროექტის მიზანი

მიზანი ჩამოყალიბებულია `AGENTS.md` → *Product Context* და README → *项目定位*-ში, და პრიორიტეტების მიხედვით ასეთია:

1. **მთავარი მიზანი — რომანის დასრულება, არა ტექსტის გენერაცია.** სისტემა ზომავს წარმატებას იმით, დაასრულა თუ არა მომხმარებელმა მთელი წიგნი, და არა იმით, რამდენად ლამაზია ცალკეული აბზაცი.
2. **სამიზნე მომხმარებელი — სრული ნოვიცი.** ადამიანი, რომელსაც არ ესმის სიუჟეტის სტრუქტურა, პერსონაჟის რკალი ან თავების დაგეგმვა. პროდუქტი ვარაუდობს, რომ მომხმარებელი **ვერ** გაასწორებს სტრუქტურულ პრობლემას ხელით.
3. **AI-First არქიტექტურა.** ინტენტის ამოცნობა, ამოცანის კლასიფიკაცია, დაგეგმვა, მარშრუტიზაცია და ხელსაწყოს არჩევა უნდა ხდებოდეს AI-ის სტრუქტურირებული გამოსავლით. აკრძალულია keyword matching, hard-coded regex routing ან manual branch tables პროდუქტის ძირითადი ქცევისთვის.
4. **გრძელვადიანი კონტექსტი, როგორც აქტივი.** სამყარო, პერსონაჟები, სტილი, წიგნის დაშლის შედეგები და ცოდნის ბაზა ინახება როგორც მრავალჯერ გამოძახებადი (recall-able) აქტივები, არა ერთჯერადი prompt-ები.
5. **აღდგენადობა (recoverability).** გრძელი ჯაჭვი უნდა ჩერდებოდეს გააზრებულად checkpoint-ზე და გრძელდებოდეს იმავე წერტილიდან — არა უსასრულო retry.

მიმდინარე პროდუქტული პრიორიტეტები (`AGENTS.md` → *Current Product Priorities*):
Auto-Director-ის აღდგენისა და თავების საწარმოო ჯაჭვის სტაბილიზაცია → ნოვიცისთვის წიგნის დასრულების მაჩვენებლის ზრდა → ახალი workflow-განშტოებების თავიდან აცილება → runtime კონტრაქტების/prompt სქემების გამოსწორება UI-ის ლატანის წინ.

---

## 2. ფუნქციური შესაძლებლობები

| ბლოკი | აღწერა |
| --- | --- |
| **Auto-Director (ავტო-რეჟისორი)** | ერთი ინსპირაციული წინადადებიდან: მიმართულების ვარიანტები + სათაურთა ჯგუფები → პროექტის პარამეტრები → სამყარო → პერსონაჟები → ტომის სტრატეგია/ჩონჩხი → რიტმის დაფა → თავების სია → თავის დეტალიზაცია → შესრულება → აუდიტი → შეკეთება. ყოველი ეტაპი checkpoint-ით აღდგენადია. ორი რეჟიმი: **Simple** (ავტომატურად ბოლომდე) და **Professional** (სრული workspace). |
| **Creative Hub + Agent Runtime** | ერთიანი შემოქმედებითი ცენტრი: დიალოგი, დაზუსტება, დაგეგმვა, ხელსაწყოს გამოძახება, ამოცანის სტატუსი. აქვს Planner, Tool Registry, approval nodes, interrupt/resume ჯაჭვი. |
| **თავების საწარმოო ჯაჭვი** | ტექსტის გენერაცია → AI აუდიტი → შეკეთებადი პრობლემების დამუშავება → quality debt-ის აღრიცხვა → პერსონაჟის მდგომარეობის/ფაქტების/foreshadowing-ის უკან ჩაწერა → შემდეგი თავი. კონტექსტი იფილტრება მხოლოდ ამ თავის მონაწილეებით. |
| **წიგნის დაშლა (Book Analysis)** | 3 დონე (სწრაფი/სტანდარტული/სრული); პერსონაჟის დოსიე 4 სიღრმით; **პერსონაჟის ვიზუალური ევოლუცია** 25/50/75/100% დაფარვით და თავებზე მიბმული სახის/ტანსაცმლის/სცენის ღუზებით. |
| **Style Engine + Anti-AI** | წერის მანერა შენახვადი/რედაქტირებადი/მიბმადი აქტივია. არსებული ტექსტიდან სტილის ნიშნების ექსტრაქცია, ნიშნების პული, ჩართვა/გამორთვა, წესების რეკომპილაცია. Anti-AI წესები ამცირებს შაბლონურობას. |
| **Knowledge / RAG** | დოკუმენტების bulk import (TXT/საქაღალდე), დუბლიკატების შემოწმება, ცალკე კონტროლი ატვირთვასა და ინდექსაციაზე; ჰიბრიდული ძებნა (ვექტორი + საკვანძო სიტყვა, RRF), reranker, retrieval trace. |
| **სამყარო / პერსონაჟები / ჟანრები** | Book-scoped "ამ წიგნის სამყარო", რუკები, ძალთა გრაფი; პერსონაჟთა ბაზა + სინქრონიზაციის შეთავაზებები; ჟანრებისა და Story Mode-ების ბიბლიოთეკები. |
| **წარმოებული ნაწარმი** | Comic Workstation (სცენის თანმიმდევრულობა, ვიზუალური აქტივები) და Drama/Short-drama pipeline v3 — მუშაობს **მხოლოდ** უკვე დაწერილ თავებზე. |
| **მოდელების მარშრუტიზაცია** | 11 ჩაშენებული provider + custom; ამოცანის ტიპის მიხედვით სხვადასხვა მოდელი (planner/writer/review/repair/…). |
| **Prompt Workbench** | პროდუქტიული prompt-ების რედაქტირება, reference-ტეგებით კონტექსტის ჩასმა, preview და მოდელზე ტესტი. |

---

## 3. არქიტექტურა

### 3.1 Monorepo

pnpm workspace (`pnpm@10.6.0`, Node `^20.19 || ^22.12 || >=24`), 5 პაკეტი:

```
shared/    @ai-novel/shared    ტიპები + zod სქემები (კონტრაქტები)     → აშენდება პირველი
server/    @ai-novel/server    Express 5 + Prisma + LangChain/LangGraph
client/    @ai-novel/client    React 19 + Vite 7
desktop/   @ai-novel/desktop   Electron (Windows-only packaging)
site/      @ai-novel/site      საჯარო დოკუმენტაციის/პრეზენტაციის საიტი
```

build order: `shared → server → client` (`package.json:33`).
`shared`-ს client მოიხმარს **წყაროდან** (Vite alias `../shared`), server/desktop — აწყობილი `dist`-იდან.

### 3.2 Backend — `server/`

- **919 `.ts` ფაილი** `server/src`-ში. ერთადერთი entry point: `server/src/app.ts`.
  - `createApp()` — `app.ts:88`; middleware: dynamic CORS allow-list (`:101-115`), `helmet` (`:116`), `morgan` custom format (`:117-126`), `express.json` limit `20mb` (`:127`).
  - მარშრუტების მიმაგრება `:129-165`; 404 JSON `:167-173`; `errorHandler` ბოლოს `:175`.
  - პორტი `PORT ?? 3000`, host `HOST ?? (ALLOW_LAN ? 0.0.0.0 : localhost)` — `app.ts:228-229`.
  - `startServer()` `:318` — log retention → `ensureRuntimeDatabaseReady()` → RAG legacy settings import → background services `:340`.
- **API დომენები** (≈35 mount point): `/api/health`, `/api/novels` (+ ქვე-რაუტერები: chapters, review, production, planning/volume/storyline, characters, framing, world-slice, short-story, writing-platform), `/api/novels/director`, `/api/auto-director/*`, `/api/creative-hub`, `/api/agent-runs`, `/api/agent-catalog`, `/api/book-analysis`, `/api/knowledge`, `/api/rag`, `/api/worlds`, `/api/base-characters`, `/api/character-conversations`, `/api/writing-formula`, `/api/genres`, `/api/story-modes`, `/api/title-library`, `/api/prompt-workbench`, `/api/comic`, `/api/drama`, `/api/images`, `/api/visual-assets`, `/api/tasks`, `/api/llm`, `/api/llm-live`, `/api/chat`, `/api/settings`, `/api/astrology`.
- **სტრუქტურა**: `routes/` (legacy) თანდათან გადადის `modules/<domain>/http/`-ში (მოდულები: novel, setup, bookAnalysis, characterConversation, comic, drama, export, timeline, visualAssets). `services/` — 23 დომენი. `llm/`, `prompting/`, `agents/`, `graphs/`, `chains/`, `creativeHub/`, `workers/`, `events/`, `db/`, `prisma/`, `config/`, `middleware/`, `platform/`, `runtime/`.
- **ფონური სერვისები** — `initializeBackgroundServices()` (`app.ts:263-316`): `DirectorWorker` (+ `DirectorTaskQueue` lease/renew, ResourceGate concurrency), `RagWorker`, retrieval-trace retention, `NovelSideEffectWorker`, watchdog-ები (book analysis, novel pipeline), pending recovery-ების ინიციალიზაცია.

### 3.3 Frontend — `client/`

- React **19.2**, Vite **7.3**, TypeScript 5.9, react-router-dom **7.13**, TanStack Query 5.90 + axios, zustand 5 (4 store), Tailwind 3.4 + პროექტის საკუთარი UI primitives (Radix-ზე).
- რედაქტორი: **PlateJS 52**. აგენტის UI: `@assistant-ui/react` + `@langchain/langgraph-sdk`. ვიზუალიზაცია: `@xyflow/react`, recharts, d3, dagre.
- როუტერი: `client/src/router/index.tsx` — ბრტყელი `RouteObject[]` ერთი `AppLayout`-ის ქვეშ, ყველა გვერდი `React.lazy`, **≈45 route** (redirect-ებით და `*` catch-all-ით). Web-ზე `BrowserRouter`, desktop-ზე `HashRouter` (`main.tsx:25`).
  - დომენები: novels workspace (`/novels`, `/novels/:id/{simple,story,preview,edit}`, `/novels/:id/chapters/:chapterId`), auto-director (`/novels/auto-director`, `/auto-director/follow-ups`, `/tasks`), `/creative-hub`, `/book-analysis`, `/knowledge(+/imports)`, `/worlds(+/generator, /:id/workspace)`, `/base-characters`, `/style-engine`, `/anti-ai-rules`, `/genres`, `/story-modes`, `/titles`, `/prompt-workbench`, `/comic`, `/drama`, `/settings/{models,director,knowledge,maintenance,appearance}`.
- `client/src/pages` — **448 ფაილი**, 25 დომენი (მხოლოდ `novels/` — 197).
- **API base URL** `client/src/lib/constants.ts:61-112`: web dev/prod → `/api` (Vite proxy → `http://HOST:3000`); desktop → `http://localhost:3000/api`; LAN-ზე loopback ავტომატურად იცვლება გვერდის host-ით. timeout — 10 წუთი.
- **Streaming**: `useSSE.ts` — POST + `fetch` ReadableStream, `data:` frame-ების ხელით დაშლა; frame ტიპები `ping|chunk|reasoning|done|tool_call|tool_result|approval_required|approval_resolved|run_status|runtime_package`. მეორე არხი — `useLlmLiveFeed.ts`. WebSocket არ გამოიყენება.
- **Feature flags** (`src/config/featureFlags.ts`): `creationStudioEnabled` ✅, `worldWizardEnabled` ✅, `worldVisEnabled` ✅.

### 3.4 `shared/`

`@ai-novel/shared` — ESM, ერთადერთი runtime dependency **zod 4**. **69 ფაილი `types/`-ში**: API/SSE frames, chapter runtime (dynamic character / payoff / quality / style zod სქემები), director & auto-director (runtime, issues, risk, approval, follow-up, workflow step catalog), პერსონაჟები, book analysis, creative hub, knowledge, world, style engine, story macro, timeline, task, llm/llmLive, canonical state, volume planning. `utils/`-ში — `georgianTextMetrics.ts`, `bookAnalysisTimeline.ts`.

### 3.5 `desktop/`

Electron **35** + electron-builder **26** + electron-updater; ვერსია `0.4.15`; build — უბრალო `tsc` (bundler-ის გარეშე).
`src/main.ts` (631 ხაზი) — splash + main window, IPC არხები (`desktop:get-bootstrap-snapshot`, `check-for-updates`, `quit-and-install`, `bundle-logs`, `import-legacy-database`, …). `src/preload.ts` აწვდის `window.__AI_NOVEL_RUNTIME__`-ს, რომელსაც client კითხულობს.
`src/runtime/server.ts` ტვირთავს API-ს child process-ად (packaged build-ში `utilityProcess.fork`), პორტი 3000.
შეფუთვა: appId `com.ai-novel.desktop`, asar (`**/*.node` unpacked), extraResources-ში აწყობილი client. Publish → GitHub Releases (channel `beta` → prerelease). **სამიზნე მხოლოდ Windows x64** (`nsis` + `portable`); macOS/Linux ბლოკები არ არსებობს.

### 3.6 `site/`

React 19 + Vite 7, **როუტერის ბიბლიოთეკის გარეშე** (`src/routing.ts` — 2 ლოგიკური გვერდი: home და docs). პორტი **4173** (strictPort), `base: "/AI-Novel-Writing-Assistant/"` (GitHub Pages). კონტენტი **არ დუბლირდება** — `src/docsContent.ts` იღებს რეპოს საკუთარ Markdown-ს `import.meta.glob("../../docs/public/**/*.md")`-ით. Build: sitemap generation → `tsc --noEmit` → `vite build` → static prerender (jsdom). თანმიმდევრულობას იცავს `pnpm check:docs-manifest` (**33 საჯარო დოკუმენტი**).

---

## 4. მონაცემთა მოდელი

**ორმაგი Prisma სქემა**, არჩევა runtime-ზე (`server/src/config/database.ts:87-96`; production-ში `DATABASE_URL` სავალდებულოა):

- `server/src/prisma/schema.prisma` — **PostgreSQL** (`@prisma/adapter-pg`)
- `server/src/prisma/schema.sqlite.prisma` — **SQLite** (`@prisma/adapter-better-sqlite3`), lokალური default

**162 მოდელი / 4172 ხაზი.** დომენური ჯგუფები:

| ჯგუფი | მოდელები (ნიმუში) |
| --- | --- |
| რომანის ბირთვი | `Novel`, `NovelIntentVersion`, `NovelBible`, `NovelSnapshot`, `BookContract`, `CreativeDecision`, `ShortStoryPlan/Segment` |
| თავები / წარმოება | `Chapter`, `ChapterSummary`, `PlotBeat`, `VolumePlan(+Version)`, `VolumeChapterPlan`, `StoryMacroPlan`, `ChapterPlanScene`, `QualityReport`, `GenerationJob`, `ReplanRun` |
| პერსონაჟები (~25) | `Character`, `CharacterMindSnapshot`, `CharacterCastOption(+Member/Relation)`, `CharacterTimeline`, `BaseCharacter(+Revision)`, `CharacterSyncProposal`, `CharacterResourceLedgerItem/Event` |
| სამყარო | `World`, `NovelWorld`, `WorldAsset`, `WorldSnapshot`, `WorldDeepeningQA`, `WorldConsistencyIssue` |
| Knowledge / RAG | `KnowledgeImportBatch/Item`, `KnowledgeDocument(+Version)`, `KnowledgeChunk`, `KnowledgeBinding`, `RagIndexJob`, `RagRetrievalTrace` |
| Style Engine | `WritingFormula`, `StyleProfile`, `StyleTemplate`, `AntiAiRule`, `StyleBinding`, `StyleExtractionTask` |
| Director / Agent runtime | `AgentRun/Step/Approval`, `CreativeHubThread/Checkpoint`, `DirectorRuntimeInstance/Command/Execution/Checkpoint/Event`, `DirectorRun`, `DirectorArtifact(+Dependency)`, `DirectorLlmUsageRecord`, `AutoDirectorFollowUp*` |
| მდგომარეობა / უწყვეტობა | `StoryStateSnapshot`, `CharacterState`, `RelationState`, `InformationState`, `ForeshadowState`, `OpenConflict`, `PayoffLedgerItem`, `CanonicalStateVersion`, `ConsistencyFact`, `AuditReport/AuditIssue` |
| Timeline | `StoryTimelineEvent`, `ChapterTimeAnchor`, `TimelineHook`, `TimelineConstraint`, `TimelineCheckReport` |
| ამოცანები | `NovelWorkflowTask`, `NovelSideEffectJob`, `TaskCenterArchive`, `ImageGenerationTask` |
| პარამეტრები | `APIKey`, `AppSetting`, `ModelRouteConfig`, `TitleLibrary` |
| სხვა | `BookAnalysis*` (~13), `Drama*` (11), `Comic*` (11), `Market*` (5), `Prompt*` governance |

---

## 5. AI ორკესტრაცია

**LangGraph `StateGraph`-ები**: `graphs/{novelOutlineGraph, worldBuildingGraph, characterDesignGraph, writingFormulaGraph}.ts`, `creativeHub/{CreativeHubLangGraph, CreativeHubInterruptLangGraph}.ts`, `services/novel/director/langgraphPilot/DirectorLangGraphPilot.ts`.

**Prompt Governance** — `server/src/prompting/` არის ერთადერთი დაშვებული შესასვლელი პროდუქტული prompt-ისთვის (**104 prompt asset**). ყოველი prompt არის `PromptAsset` `prompts/<family>/`-ში, რეგისტრირებული `registry.ts`-ში `id`/`version`/`taskType`/`mode`/`contextPolicy`/`outputSchema`-ით. აკრძალულია `systemPrompt`/`userPrompt`-ის inline ჩაწერა service-ებში ან პირდაპირი `getLLM()` service კოდიდან. ცენტრალური შესრულების გზა — `prompting/core/promptRunner.ts`.

**Provider-ები** (`llm/providers.ts:20`): deepseek, siliconflow, openai, anthropic, grok/x.ai, kimi, minimax, glm, qwen, gemini, ollama + custom. გასაღებები იხსნება **DB-first, env fallback** (`llm/factory.ts:153,197,398`).

**მოდელის მარშრუტიზაცია** (`llm/modelRouter.ts`): 11 ამოცანის ტიპი — `planner`, `writer`, `review`, `light_review`, `critical_review`, `repair`, `replan`, `state_resolution`, `summary`, `fact_extraction`, `chat`; `DEFAULT_ROUTES` + DB override (`ModelRouteConfig`); აბრუნებს `ResolvedModel`-ს (`requestProtocol`, `structuredResponseFormat`, `routeDegraded`).

**საიმედოობა**: `llm/requestLimiter.ts` — per provider+model concurrency და მინიმალური ინტერვალი; `requestGuard.ts`, `invokeTimeout.ts`, `usageTracking.ts`; structured output + JSON repair (`structuredOutput.ts`, `structuredInvoke*.ts`, `structuredFallbackSettings.ts`); ნატიური Anthropic კლიენტი.

**Agent runtime**: `agents/runtime/AgentRuntime.ts`, `RunExecutionService.ts`, `ApprovalContinuationService.ts`, `runLocks.ts`; planner — `agents/planner/{parser,compiler,intentSchema}.ts` + `agents/orchestrator.ts:12 createStructuredPlan()`; `toolRegistry.ts` — 9 ხელსაწყოს ოჯახი risk level-ებით + `approvalPolicy.ts` + `traceStore.ts`.

**Director runtime & aღდგენა**: `services/novel/director/runtime/` (`DirectorRuntimeService/Store/Persistence`, `DirectorNodeRunner`, `DirectorArtifactLedger`, `DirectorCircuitBreakerService`, `DirectorEventProjectionService`), `automation/novelDirectorAutoExecutionCheckpointRuntime.ts`, `automation/…CircuitBreakerRuntime.ts`, `recovery/novelDirectorRecovery.ts`.

### 5.1 ხარისხის კარიბჭის ინვარიანტები (მკაცრი წესები)

`AGENTS.md` → *Auto-Director Quality Gate Rules*:

- თავის ლოკალური ხარისხის პრობლემა **არ** აჩერებს მთელი წიგნის ჯაჭვს — ის ფიქსირდება როგორც **quality debt** და წარმოება გრძელდება.
- გლობალურად აჩერებს **მხოლოდ**: ცხადი `stop_for_replan` / `replan_required` / `recommendedAction=replan`, გამოუსწორებელი გენერაციის მარცხი გამოსადეგი ტექსტის გარეშე, ან runtime safety / data integrity პრობლემა.
- ერთი თავის **ავტომატური შეკეთება მაქსიმუმ 1-ჯერ** (retry < 2).
- ტექსტის შენახვა, თავის სტატუსი, timeline და task სტატუსი commit-დება **ერთიან lifecycle საზღვარში**.

---

## 6. RAG

`server/src/services/rag/`:

| ფაილი | პასუხისმგებლობა |
| --- | --- |
| `EmbeddingService.ts` | multi-provider embedding, batch split + retry |
| `VectorStoreService.ts` | Qdrant HTTP (points, payload, filters) |
| `RagIndexService.ts` | chunking, contextual prefix, upsert, reindex scope (novel/world/all) |
| `RagContextualChunkService.ts`, `chunkFacets.ts` | კონტექსტური ჩანქები, facets ინდექსი (მოიცავს წიგნის დაშლის დასკვნებს) |
| `HybridRetrievalService.ts` | ვექტორი + საკვანძო სიტყვა, **RRF** (`RRF_K = 60`) |
| `knowledge-retrieval/index.ts` | keyword search |
| `RagRerankerService.ts` | rerank |
| `RagRetrievalTracer.ts` / `…TraceRetention.ts` | ახსნადობა: რატომ მოხვდა ეს ჩანქი |
| `RagWorker.ts` + `importQueue.ts` | `RagIndexJob`-ების claim/დამუშავება |

კონფიგურაცია `config/rag.ts` (`QDRANT_URL/API_KEY/COLLECTION/TIMEOUT_MS/UPSERT_MAX_BYTES`, chunk size/overlap, candidate counts, worker poll/retry) + DB override `services/settings/Rag*Service.ts` — ცვლილება ძალაში შედის რესტარტის გარეშე. chunk hash დედუპლიკაცია იცავს დუბლირებული ვექტორებისგან.

---

## 7. ლოკალიზაცია — fork-ის მთავარი განმასხვავებელი

ორი დამოუკიდებელი ფენა, დეტალურად: `docs/english-ui-maintenance.md`, `docs/georgian-writing-maintenance.md`.

### 7.1 ინგლისური UI

- i18next ინიციალიზდება React-ის რენდერამდე; `lng`/`fallback`/`supportedLngs` **მკაცრად ინგლისური**; ენის ამომრჩევი არ არსებობს; შენახული legacy ენის პრეფერენსი იგნორირდება.
- upstream-ის ფართო UI იფარება **presentation catalog**-ით: `client/src/locales/en/legacy-ui.json` (**14 608 ხაზი** zh→en) + `EnglishUiBoundary.tsx`, რომელიც თარგმნის რენდერილ ლეიბლებს, tooltip-ებს, placeholder-ებს, toast-ებს, დიალოგებს და შეცდომებს — **API payload-ების, შენახული მნიშვნელობების, route-ების, იდენტიფიკატორების, სქემების, provider/model სახელების და გენერაციის ლოგიკის შეუცვლელად**.
- boundary **განზრახ არ ეხება**: `textarea`, `pre`, `code`, contenteditable, Plate/ProseMirror, `[data-preserve-language]`, `[data-novel-content]` — ეს იცავს prompt-ებს, რომანის ტექსტს და მომხმარებლის კონტენტს.
- დინამიური (რიცხვ-/provider-დამოკიდებული) ფრაზები — ვიწროდ განსაზღვრული `client/src/i18n/dynamicUiPatterns.ts`.
- ჩინური წყაროს ტექსტი რჩება მხოლოდ მაშინ, როცა შეცვლა შეცვლიდა ქცევას; ყოველი ასეთი ხაზი კლასიფიცირებულია `config/english-ui-allowlist.json`-ში (path + text + reason).

### 7.2 ქართული კონტენტი

- ეს არის **კონტენტის პოლიტიკა, არა locale selector**: არც ერთი API ველი, DB სვეტი, route, იდენტიფიკატორი ან შენახული enum არ დამატებულა და არ გადარქმევია.
- `CONTENT_LANGUAGE=ka`, `CONTENT_LOCALE=ka-GE`; ყოველი აქტიური შემოქმედებითი `PromptAsset` დეკლარირებულია `language: "ka"`-თი; prompt runner აყენებს საერთო ქართულ პოლიტიკას შესრულებამდე (მათ შორის advanced template-ის რენდერის შემდეგაც).
- **სისტემური ინსტრუქციები რჩება ინგლისურად** (კონტროლის წესები უნდა იყოს შენახვადი), მომხმარებლისთვის ხილული შემოქმედებითი შედეგი — ბუნებრივი ქართული: სწორი ბრუნვა, შეთანხმება, ზმნური ფორმები; აკრძალულია ინგლისური/რუსული კალკები.
- **ტექსტის მეტრიკა** (`shared/utils/georgianTextMetrics.ts`): NFC ნორმალიზაცია, `Intl.Segmenter("ka-GE")` + Unicode fallback; პუნქტუაცია/space არ ითვლება სიტყვად; დეფისით/აპოსტროფით შეერთებული ფორმა — ერთი სიტყვა. default-ები: **1 500 სიტყვა/თავი** (UI რეკომენდაცია 1 200–2 000), 5 000 მოთხრობა, 80 000 გრძელი რომანი. სათაური: 1–10 სიტყვა, ≤80 code point; დუბლიკატის დეტექცია ქართული ტოკენებით + trigram fallback.
- **Writing Profile-ების ID-ები განზრახ სტაბილურია** (თავსებადობა), ლეიბლები ინგლისურია:

| Compatibility ID | UI ლეიბლი |
| --- | --- |
| `fanqie_free` | Georgian Serial |
| `qidian_male` | Progression & Adventure |
| `jinjiang_female` | Character & Relationship |
| `zhihu_story` | Georgian Short Story |

- ჩაშენებული creative seed-ების მარკერი: `system.creative_seed_profile=ka-GE@1`.
- Market Radar წაშლილია: Auto-Director იწყება მხოლოდ ავტორის საკუთარი იდეიდან.
- Georgian-content allowlist-ში **არ დაიშვება** `legacy-compatibility-alias` / `legacy-compatibility-parser` ჩანაწერი — ამ fork-ს ჩინური იმპორტის გზა და dual-read პროტოკოლი არ აქვს.

---

## 8. გაშვება და განთავსება

### 8.1 ლოკალური დეველოპმენტი

```bash
pnpm install
cp server/.env.example server/.env     # DATABASE_URL default = ლოკალური SQLite
pnpm dev                               # shared(tsc -w) + server + client
```

- frontend `http://localhost:5173` (Vite default; `server.host = true` → LAN ხელმისაწვდომი)
- backend `http://localhost:3000`, API `…/api`
- პირველ გაშვებაზე ავტომატურად სრულდება Prisma `generate` + `db push` — ხელით არაფერია საჭირო.
- შემდეგ: `/settings` (provider key), `/settings/models` (მარშრუტები), `/knowledge?tab=settings` (embedding/collection).
- `RAG_ENABLED=false` — Qdrant-ის გარეშე მთავარი ჯაჭვი მაინც მუშაობს.

### 8.2 Docker — `compose.local.yml`

4 სერვისი: `postgres:16-alpine`, `qdrant/qdrant:v1.19.0`, `api` (Dockerfile.api), `web` (Dockerfile.web).
პორტები loopback-ზე: API `127.0.0.1:3165→3000`, Web `127.0.0.1:8045→8080`. `AI_NOVEL_DATABASE_MODE=postgresql`.

### 8.3 Docker — `compose.remote.yml` (რეალური განთავსება)

project name `ai-novel-writing-assistant`, ცალკე bridge ქსელი, ყველა credential `.env`-იდან (`env_file`), volume-ები: postgres data, qdrant storage, app storage.

| სერვისი | გამოქვეყნებული პორტი |
| --- | --- |
| `database` | `127.0.0.1:15432` |
| `qdrant` | `127.0.0.1:16333`, `127.0.0.1:16334` |
| `api` | `127.0.0.1:3165` |
| `web` | `8045` (საჯარო) — nginx, bind mount `infra/nginx/ai-novel-remote.conf` |

**მიმდინარე მდგომარეობა (შემოწმებულია):** ოთხივე კონტეინერი გაშვებულია, `database` — healthy.

**განთავსების პროცედურა** — `scripts/deploy-remote.sh "<commit message>"`, სავალდებულო თანმიმდევრობით:

1. `docker compose up -d --build` (bare restart **არ** აიღებს source ცვლილებას — `api`/`web` image-ებია)
2. ოთხივე სერვისის `restart` (single-file bind mount inode-ზეა მიბმული; `nginx -s reload` ძველ კონტენტს განაგრძობს)
3. ვერიფიკაცია: `pg_isready` · qdrant `/readyz` · api `/api/health` · web `/`
4. მხოლოდ ამის შემდეგ — commit + push `main`-ზე

სკრიპტში ჩაშენებული უსაფრთხოების კარიბჭეები: უარს ამბობს `.env`/`*.pem`/`*.key`/`id_rsa`/არქივების/dump-ების publish-ზე, >5MB ფაილებზე, და staged diff-ში credential pattern-ის აღმოჩენაზე (`sk-…`, `ghp_…`, `github_pat_…`, `AKIA…`, `xox…`, PRIVATE KEY). ბრენჩი უნდა იყოს `main`, თორემ იჭრება.

### 8.4 Dockerfile-ები

- `Dockerfile.api` — multi-stage (base → deps → build → prod-deps → runtime), `node:20-bookworm-slim`, აშენებს shared + prisma generate + server; runtime არა-root (`node`), `EXPOSE 3000`, `CMD node ./server/dist/app.js`, storage საქაღალდეები generated-images-ისთვის.
- `Dockerfile.web` — აშენებს client-ს (`VITE_API_BASE_URL` build arg), აწყობილს გადასცემს `nginxinc/nginx-unprivileged:1.27-alpine`-ს (UID 101, `EXPOSE 8080`).

### 8.5 CI (GitHub Actions)

`desktop-beta-release.yml`, `desktop-release.yml`, `english-ui.yml`, `site-pages.yml`.

---

## 9. კონფიგურაცია

`.env.example` (root — მხოლოდ საცნობარო მიმოხილვა; რეალურად `server/.env` და `client/.env` იკითხება):

- **Provider-ები**: `OPENAI_*`, `DEEPSEEK_*`, `SILICONFLOW_*`, `ANTHROPIC_*`, `GEMINI_*`, `GLM_*`, `KIMI_*`, `QWEN_*`, `XAI_*` (თითოეული `_API_KEY` / `_BASE_URL` / `_MODEL`)
- **Embedding**: `EMBEDDING_PROVIDER/MODEL/VERSION/BATCH_SIZE`, `OPENAI_EMBEDDING_MODEL`, `SILICONFLOW_EMBEDDING_MODEL`
- **Qdrant/RAG**: `QDRANT_URL/API_KEY/COLLECTION/TIMEOUT_MS/UPSERT_MAX_BYTES`, `RAG_ENABLED`, `RAG_CHUNK_SIZE/OVERLAP`, `RAG_VECTOR_CANDIDATES`, `RAG_KEYWORD_CANDIDATES`, `RAG_FINAL_TOP_K`, `RAG_WORKER_*`, `RAG_EMBEDDING_*`, `RAG_DEFAULT_TENANT`, `RAG_VERBOSE_LOG`
- **სერვერი**: `HOST`, `PORT`, `ALLOW_LAN`, `CORS_ORIGIN`, `API_JSON_LIMIT`, `NOVEL_SNAPSHOT_RETENTION_COUNT`, `BOOK_ANALYSIS_LLM_TIMEOUT_MS`
- **კლიენტი**: `VITE_API_BASE_URL`, `VITE_CREATION_STUDIO_ENABLED`

> `*_MODEL` env-ცვლადები არის მხოლოდ **საწყისი default / fallback** — რეალური კონფიგურაცია ინახება DB-ში და იმართება UI-დან (`/settings`, `/settings/models`, `/knowledge?tab=settings`).

---

## 10. ტესტირება და ხარისხის კარიბჭეები

**ტესტები Node-ის ჩაშენებული runner-ით (`node --test`)** — Jest/Vitest/Playwright არ გამოიყენება.

- Server: **252 `*.test.js`** `server/tests/`-ში; ტესტები `require("../dist/…")` — ე.ი. აწყობილ გამოსავალზე. ორკესტრატორი `server/scripts/run-tests.cjs`: `fast` (default, 12 integration ფაილის გამოკლებით), `integration`, `all`; ყოველი ფაილი ცალკე პროცესში (singleton/Prisma mock-ის გაჟონვის თავიდან ასაცილებლად).
- Client: contract/view-model ტესტები `client/tests/` + in-src `*.test.mjs`; `.ts` წყარო იმპორტდება პირდაპირ (`--experimental-strip-types`).

**სავალდებულო შემოწმებები** (ყოველი upstream merge-ის ან შემოქმედებითი prompt-ის ცვლილების შემდეგ):

```bash
pnpm check:english-ui          # Han-ხაზების კლასიფიკაციის ვალიდაცია + fixed i18n config
pnpm check:georgian-content    # აქტიური prompt asset-ები, context builder-ები, seed-ები
pnpm typecheck                 # shared build + server + client + desktop
pnpm lint
pnpm test:all
pnpm build
pnpm build:desktop:all
pnpm verify:desktop-package
```

დამატებით: `pnpm check:deps` (dev-ის წინ ავტომატურად), `pnpm check:docs-manifest`.

---

## 11. სამუშაო წესები (`AGENTS.md`, 28 KB)

უმაღლესი პრიორიტეტის წესები, რომლებიც განსაზღვრავს, როგორ უნდა შეიცვალოს ეს კოდი:

- **Data Protection** — არავითარი დესტრუქციული ოპერაცია (DB ფაილის წაშლა, `prisma migrate reset`, truncate, drop) გადამოწმებული backup-ის და ცხადი ნებართვის გარეშე.
- **AI-First** — იხ. §1.1.3. თუ AI-ის ინტენტის ამოცნობა ჩავარდა, ეს AI-ის პრობლემაა და უნდა გამოსწორდეს; fallback matching-ით დამალვა აკრძალულია.
- **Architecture** — ერთი ფაილი ≈1 200 ხაზი (1 000–1 300 დასაშვები, >1 300 → refactor **სავალდებულო**). ბრტყელი `helper`/`utils` ფაილებით დაშლა აკრძალულია — გამოყოფილი კოდი უნდა გადავიდეს `domain/` / `application/` / `infrastructure/` / `http/`-ში. >12 `.ts` ფაილი ერთ საქაღალდეში ან >4 ერთი პრეფიქსით (`novelDirector*`) → ცალკე მოდული.
- **UI Copy** — ტექსტი მომხმარებლის პერსპექტივიდან; აკრძალულია "ახლა…/აღარ…/უკვე…" ტიპის change-history ნარატივი პროდუქტში.
- **UI Visual** — low-border იერარქია; **ახალი shadcn/ui კომპონენტების დამატება აკრძალულია** (`client/src/components/ui/` არის პროექტის საკუთარი compatibility primitives); border მხოლოდ სემანტიკური საზღვრისთვის, shadow — მხოლოდ მცურავი შრეებისთვის.
- **Prompt Governance** — იხ. §5.
- **ბრენჩები** — `main` **ერთადერთი** ბრენჩია; `beta`/`feature/*`/`desktop-dev` გაუქმდა. ისტორიული upstream მუშაობა შენახულია tag-ში `archive/upstream-main-0.4.17`. ყოველი დასრულებული ფაზა სავალდებულოდ commit-დება.
- **Desktop release** — publish მხოლოდ მაშინ, როცა tag ზუსტად `vX.Y.Z` = `desktop/package.json` version.
- **Wiki** — `docs/wiki/` ინახავს "რატომ"-ს (არქიტექტურული გადაწყვეტილებები, მოდულის საზღვრები, runtime კონტრაქტები, გამართვის დასკვნები), არა "რა შეიცვალა".
- **Release notes** — `docs/releases/release-notes.md` = სრული ისტორია; `README.md` `## Latest updates` = მხოლოდ უახლესი თარიღის ბლოკი + ლინკი. იდენტიფიკაცია **თარიღით** (`### 2026-09-08`), არა semver.

---

## 12. მიმდინარე მდგომარეობა და შენიშვნები

### 12.1 ბოლო მუშაობა (git log)

```
855bba85 chore(deploy): add remote deploy workflow and single-branch rules
db051631 chore(deploy): add remote compose stack configuration
6f97cf0a feat(rag): add keyword knowledge retrieval
37bfb056 chore(knowledge): record safe Docker deployment and import verification
9c4f6c75 feat(knowledge): add staged bulk imports and checkbox-controlled indexing
036c0133 fix(ui): complete knowledge copy and hide studio navigation
2b67ec8a docs: add Georgian navigation usage guide
9c84d326 test(content): use Georgian chapter boundary fixtures
```

ფოკუსი: **remote Docker განთავსება + ცოდნის ბაზის bulk import/RAG + ქართული კონტენტის ფენა**.

### 12.2 გახსნილი სამუშაო

`TASK.md` (P1/P2) — quality governance-ის თავსებადობა და გაწმენდა:

- ძველი task governance snapshot-ების თავსებადი წაკითხვა (მხოლოდ თუ რეალური ძველი მონაცემი არსებობს).
- მიუწვდომელი (unreachable) პრობლემების კატალოგის ჩანაწერების, risk threshold-ის მიბმებისა და გამოუძახებელი კოდის წაშლა — **წაშლამდე უნდა დამტკიცდეს მიუწვდომლობა** call graph-ითა და რეგრესიით.
- `reportIssue`-ის ყოველი გამოძახების აუდიტი: "დაფიქსირდა როგორც დამუშავებული" მხოლოდ მაშინ, როცა governance action **მართლაც** შესრულდა.
- დეგრადირებულად დასრულებული თავებისთვის quality debt-ის წყაროს, შეკეთების მცდელობათა რაოდენობისა და ხელით დამუშავების შესასვლელის ხილვადობა.
- P2: 10+ თავის უწყვეტი გაშვება რეალურ (გაანონიმებულ) რომანზე.

### 12.3 დაკვირვებები და რისკები

| # | დაკვირვება | კომენტარი |
| --- | --- | --- |
| 1 | **ავთენტიფიკაცია პრაქტიკულად არ არსებობს** — `server/src/middleware/auth.ts:3` არის no-op `next()`, თუმცა მიმაგრებულია `rag`, `tasks`, `llm`, `agentCatalog`, `creativeHub` რაუტერებზე. | remote-ზე `web` გამოქვეყნებულია `8045`-ზე საჯაროდ, `api` — მხოლოდ loopback-ზე. საჯარო ექსპოზიციამდე ეს გასაწერია: reverse proxy-ის დონის auth ან რეალური middleware. |
| 2 | `TASK.md` ამბობს `当前集成分支：beta`, ხოლო `AGENTS.md` აცხადებს `main`-ს ერთადერთ ბრენჩად. | `TASK.md` ამ ნაწილში მოძველებულია; `AGENTS.md` არის ავტორიტეტული. |
| 3 | ლოკალურად არსებობს ბრენჩი `feature/english-ui`, თუმცა single-branch წესი ძალაშია. | სავარაუდოდ ნარჩენი; გადამოწმება ღირს წაშლამდე. |
| 4 | Desktop შეფუთვა **მხოლოდ Windows x64**. | macOS/Linux target-ები `electron-builder.config.cjs`-ში არ არსებობს. |
| 5 | Market Radar მოდული წაშლილია. | Auto-Director იწყება ავტორის იდეიდან; ჩინური ranking წყაროები აღარ არის. |
| 6 | `README.md`, `TASK.md` და `docs/`-ის დიდი ნაწილი ჩინურადაა. | fork-ის პოლიტიკა ეხება **UI-ს და გენერირებულ კონტენტს**, არა შიდა დოკუმენტაციას. |
| 7 | რეპოში არის ნულოვანი ზომის ნარჩენი ფაილი `server/p.$disconnect())`. | უვნებელი, მაგრამ წასაშლელი. |
| 8 | `migration/` (ლოკალური data dump-ები) და `.env` განზრახ Git-ის გარეთაა. | უნდა დარჩეს ასე — `deploy-remote.sh` აქტიურად კრძალავს მათ publish-ს. |

---

## 13. სად რა არის

| მინიშნება | გზა |
| --- | --- |
| სამუშაო წესები (ავტორიტეტული) | `AGENTS.md` |
| მიმდინარე ეტაპის ამოცანები | `TASK.md` |
| სერვერის entry point | `server/src/app.ts` |
| DB სქემები | `server/src/prisma/schema.prisma`, `…/schema.sqlite.prisma` |
| Prompt რეესტრი | `server/src/prompting/registry.ts` + `prompts/<family>/` |
| მოდელის მარშრუტიზაცია | `server/src/llm/modelRouter.ts` |
| Director runtime | `server/src/services/novel/director/` |
| RAG | `server/src/services/rag/` |
| კლიენტის როუტერი | `client/src/router/index.tsx` |
| API base URL-ის ლოგიკა | `client/src/lib/constants.ts:61-112` |
| საერთო კონტრაქტები | `shared/types/`, `shared/utils/georgianTextMetrics.ts` |
| ინგლისური UI-ის მოვლა | `docs/english-ui-maintenance.md`, `config/english-ui-allowlist.json` |
| ქართული კონტენტის მოვლა | `docs/georgian-writing-maintenance.md`, `config/georgian-content-allowlist.json` |
| განთავსება | `compose.remote.yml`, `scripts/deploy-remote.sh`, `infra/nginx/` |
| დოკუმენტაციის რუკა | `docs/README.md` |
| ცვლილებების ისტორია | `docs/releases/release-notes.md` |
| ქართული მომხმარებლის გზამკვლევი | `docs/public/georgian-user-guide.md` |
