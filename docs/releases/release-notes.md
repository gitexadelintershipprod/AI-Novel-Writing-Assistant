# Release notes

This file is the complete user-visible update history. The root [README.md](../../README.md) keeps only the latest date block. Use this file for the full record.

## Update history

### 2026-09-20

- Buttons, errors, task names, world templates, character roles, and public help pages now come from English source text, not only an on-screen translation overlay. Auto-Director, Task Center, and export headings stay readable even in native browser dialogs and notifications.
- Remaining system messages, Creative Hub summaries, Auto-Director progress titles, and image-generation prompts now use English control text. Generated fiction stays Georgian. Older saved Chinese protocol values are still understood.
- Older books keep working: saved role names, world types, and beat labels are still understood, while new saves use English protocol values. Your novel text, knowledge files, and Georgian chapter output are unchanged.

### 2026-09-17

- The GitHub README, repository description, and public intro site now tell the same English story: from one idea to a finished novel, with Auto-Director, recoverable chapters, and this fork’s English interface plus Georgian creative output.
- Getting started on GitHub now leads with Docker and local development, which is how this project actually runs.

### 2026-09-08

- Knowledge Base Bulk Import accepts multiple TXT files or folders, checks duplicates, and saves only selected files without starting paid embedding work.
- Select saved files separately with checkboxes and use **Add selected to queue** to make them searchable. Uploads and processing have separate pause, resume, and failed-only retry controls.
- Import history survives reopening the browser; identical content is skipped and matching titles never overwrite existing documents. The Georgian user guide explains the two-stage workflow.

### 2026-09-07

- Knowledge Library progress messages, document previews, retrieval controls, and full-text warnings use complete English text, including changing counts.
- Drama Studio and Comic Studio are hidden from desktop and mobile navigation. Existing studio data is preserved.
- The Georgian user guide identifies these hidden tools separately from the visible navigation.

### 2026-09-04 (Georgian usage and knowledge reliability)

- A Georgian user guide now explains every Creation, Assets, and System navigation item, the recommended first-project workflow, model requirements, and advanced-tool cautions.
- Knowledge Library now preserves valid UTF-8 `.txt` uploads exactly as authored instead of misreading ordinary text as UTF-16.
- The local Docker stack now starts a persistent Qdrant service automatically, so document indexing and recall work without separate vector-database setup.
- Book positioning fields and Knowledge Base task records now use complete English copy, including multiline placeholders and progress labels from previously saved indexing jobs.

### 2026-09-03 (Georgian pipeline hardening)

- Book Analysis section names, presets, and active analytical context labels now use English control text while preserving source material and Georgian generated results.
- Comic cross-episode fact extraction now runs through a registered Georgian prompt while preserving the existing fact schema and category values.
- Supplemental-character generation now supplies English control labels and Georgian-governed creative context throughout cast, relationship, and world inputs.
- The compatibility `NovelService` facade now preserves application-service method binding across isolated and production runtimes.
- Resource recommendation, timeline-reference, and previous-chapter context builders no longer inject Chinese control labels into active creative prompts.
- Chapter diagnosis, timeline extraction, continuation context, chapter-title analysis, and information-boundary parsing no longer accept legacy Chinese aliases; current English control values and Georgian content are now the only supported input path.
- Continuation and contextual-RAG services avoid initialization cycles, and book-analysis token accounting remains atomic across concurrent section workers.
- Server test files now run in isolated processes so provider settings, database mocks, and mutable runtime singletons cannot leak between unrelated checks.

### 2026-09-02 (English interface coverage)

- Dynamic counters, progress messages, provider status text, and task guidance now stay in English when their values change at runtime.
- Source-provided book titles, author names, and categories remain intact while surrounding Market Radar controls and fallback messages stay in English.
- Failed Auto Director tasks continue to show their terminal state instead of being presented as an active dashboard run.
- Market Radar is temporarily unavailable while suitable Georgian or international sources are prepared; Auto Director remains available and starts directly from the writer's own idea.
- Active creative and analysis prompts now produce natural Georgian (`ka-GE`) while preserving JSON schemas, API contracts, identifiers, and stored compatibility values.
- Georgian-aware word and title metrics replace Chinese-character assumptions across long-form writing, short stories, title generation, review, and token budgeting.
- Genres, Story Modes, Writing Profiles, Style Engine, Anti-AI, Title Studio, Book Analysis/RAG, Creative Hub, comics, and drama workflows remain enabled and are adapted for Georgian writing.
- A dedicated Georgian-content audit rejects new Chinese-output instructions or Chinese-length semantics outside the exact disabled-Market-Radar and compatibility allowlist.

### 2026-08-31 (English-only interface)

- The web application now opens in English by default across navigation, creation, writing, knowledge, task, title, market, and settings workflows, with no language selector or saved-language override.
- Existing novels, prompts, provider settings, API values, and persisted Chinese domain values remain unchanged; only their presentation labels are translated.
- The Windows desktop shell now uses English startup, update, import, failure, and diagnostic messages.
- New English UI safeguards detect unclassified Chinese interface copy during development and keep intentional prompt, content, fixture, and protocol text explicitly documented.

### 2026-08-26 (Chapter review and recovery)

- Market Radar clearly separates items already in your library from items you still need to add. Existing genres or story modes open at their library location instead of being reported as new; after you confirm a missing direction, the library refreshes and jumps to that content.
- When you start a book from market signals, the opening page shows and prefills the recommended genre base plus primary and supporting story modes. Choices you made yourself are not overwritten.
- If a manual chapter review says later planning needs to change, the current chapter text is kept and a clear replan suggestion is shown. The chapter window changes only after you confirm; review never silently replans in the background.
- Review conclusions, open issues, and chapter progress are saved as one recoverable state, so finished reviews are less likely to conflict or lose the reason something is still pending after a refresh.
- Full-book Auto-Director records local quality debt and continues when a chapter still has usable text. Quality-first mode can still pause at a saved chapter boundary during manual staged writing until you confirm.
- If chapter text cannot be confirmed as saved, automatic retries stop so the same chapter is not generated again. After a restart or an unresponsive background task, if automatic recovery still fails, the task keeps a recovery entry and continues from the unfinished chapter.

### 2026-08-25 (Auto-Director issue handling)

- Auto-Director no longer has a separate risk-threshold setting. Retry, continue, pause, or stop is decided only by issue-handling rules. The risk score explains severity and does not override your choice or create a second stop path.
- When a background task stops responding or trips a circuit breaker, the book uses the issue action frozen for that run. “Action applied” is recorded only after retry, continue, pause, or stop actually finishes, so the run log matches the real task state.
- Finish-the-book-first keeps usable text, records local quality issues, and continues. Quality-first can pause at a saved chapter boundary during manual staged writing; full-book Auto-Director still records quality debt and continues.
- Issues the system already recognizes run their handling rules directly, without an extra AI risk judgment. Only unclassified runtime exceptions go to AI-assisted identification, which cuts waiting and unused model calls.
- Chapter retries and quality repair share one automatic handling chance (at most once). Separate stages no longer retry on their own, so one problem does not regenerate or repair the same chapter over and over.
- After handling rules decide, Auto-Director continues or pauses immediately. It does not start another model evaluation for the same quality reminder.
- Manual repair first identifies issues in read-only mode, then uses the same final acceptance as automatic writing. Chapter status does not change during the check. Passing text is confirmed together; remaining issues keep the repair draft and a follow-up item.
- If acceptance checking is temporarily unavailable, the text is kept and waits for a later review. A repair that never ran is not counted as an automatic retry.
- Each final chapter version settles timeline state before later chapters continue. Accepted text records a full timeline; usable text with remaining local quality issues saves a minimal carry-forward state so the next chapter still has context after a skipped repair.
- One automatic chapter repair first tries a local patch, then at most one full-chapter repair. There is no hidden second patch request in between, so model calls match the at-most-once retry setting.
- Chapter generation, review, and repair update text and progress through the same save path, which reduces stale status after a successful repair and completed chapters falling back into pending.

### 2026-08-24 (Market Radar analysis range)

- When Auto-Director resumes and a chapter already has a partial task sheet or scene cards with missing fields, it no longer loops on “sync chapter execution contract”. It syncs the chapter seed first, then fills and checks the full execution contract before writing.
- Simple Mode and Professional Mode are two creation interfaces: the reading shelf emphasizes text and progress, and the full workbench shows complete creation materials. They share the same automatic writing, review, recovery, edit, export, and delete capabilities. Switching interfaces does not pause chapter production that is already running.
- Simple Mode and Professional Mode in the Auto-Director title area open their creation interfaces directly. An in-progress chapter task no longer claims that pre-writing preparation is unfinished. Failed tasks show the failure state and the real checkpoint summary instead of looking like a live run.
- Works in the Continue Writing list can be deleted, matching My Works. Deletion still asks for confirmation.
- Auto-Director issue management offers Finish-the-book-first and Quality-first. Both retry automatically at most once: the first keeps usable text and leaves local issues for later polish; the second pauses for confirmation if a local issue remains after handling. Save failures, data risks, and protected content still protect the work first.
- Market Radar uses the full available page width. Each ranking uses a consistent-height card and can show every record identified in this scan. The top-right of a card can select all titles or let you tick books one by one. The AI analysis entry stays above the ranking data. New-book and new-author rankings are recommended by default; mature rankings can be added for comparison. Each ranking shows how many titles were identified this time and the 30-title cap, so one public page is not mistaken for every ranking on the platform.
- Expected chapter count can be cleared and typed again, for example 30. Incomplete input is not silently restored to the default.
- Simple Mode and Professional Mode sit in Enter Creation to the right of the Auto-Director title, so the recommended path is easier to see. Manual create stays a separate secondary entry.
- Professional export can download the whole book as TXT, merging saved chapters in order. Project-asset export still supports Markdown and JSON.
- Global content uses a lighter, flatter hierarchy: ordinary cards drop visible borders and shadows and rely on spacing, type, and muted backgrounds. Inputs, selections, warnings, and floating layers keep the boundaries they need.
- Market Radar’s title-selection area is a compact ranking table. Start analysis is separate from ranking content. Selected works show a check state only, without a full-row color block.
- Duplicate page titles and ranking summaries are removed. The page leads with ranking range, refresh, and analysis.
- A compact page title remains so you can tell where you are when you land on the rankings.

### 2026-08-23 (Opening ideas and model setup)

- Market Radar is new. Opening the page fetches public rankings from Tomato, Qidian, and Jinjiang, with rank, title, author, and category per list. After a scan reaches 100%, analysis is available. When new-book or new-author rankings exist, AI analyzes only those current opening samples. Mature rankings are used only when new-book data is missing, which cuts old-hit noise, excess signal, and overly long analyses that stall. Tomato titles are corrected from public work information into readable text.
- Market Radar recommends a starter set of opening signals and three influence levels: follow the trend, differ within the trend, or downplay the market. After you confirm, those signals feed Auto-Director’s first genre, story star map, book direction, and titles. You do not wait for a later quality review to apply them.
- Auto-Director’s story star map builds 35 selectable opening materials from the current genre and story mode, covering the protagonist start, setting stage, cheat ability or core advantage, first-chapter hook, early goal, core resistance, and key relationships. Labels can be full short sentences; confirm is no longer limited to 16 characters, and the desktop map wraps and avoids other chips. Refresh a set calls AI again, then turns the confirmed chips into an opening idea you can start from.
- Auto-Director sets the main title from each direction’s selling points, character situation, recommended platform, and target readers, so titles are less likely to be only mood or vague suspense. Other titles stay as alternatives from different selling-point angles.
- First-time model setup leads with a recommended plan. You can still browse every built-in provider or connect an OpenAI-compatible service. The provider page groups available connections, text models, image models, and maintenance.
- Knowledge Library can take its own vector-service API key and address without changing writing models, the default model, or task routing.
- If batch refinement of chapter goals, execution boundaries, or task sheets fails partway, finished results are kept and work can continue from the failed chapter.
- The shelf, story-mode details, and Style Engine have clearer hierarchy and dark-theme reading. Work entries and the current selection are easier to spot.
- The chapter editor and Style Engine add a prose-effect lab that opens the chapter-writing template and can try it with the current novel and chapter. Try-write results are for comparing templates only and do not change chapter text.
- Prompt editing hides maintainer slot summaries and lock boundaries. Safe slots use the full editor width. Advanced templates show insertable context references and try-write results.
- Prompt Workbench directory status, immersive-edit controls, the immersive text area, the editor, the bottom bar, and try-write dialogs follow the current theme. Dark Warm Paper uses a neutral deep-blue canvas so large brown backgrounds, white text without a backdrop, or hard-to-read copy do not appear.
- Prose-effect lab text try-writes stream as they generate. Tests that need structured checks still wait until validation finishes.

### 2026-08-16 (Auto-Director continuous writing)

- When Auto-Director finds a local chapter-plan mismatch, it adjusts later unwritten chapters and continues. Saved text, confirmed chapters, and manual content stay as they are.
- Resume from a replan checkpoint jumps to the first unwritten chapter instead of reprocessing finished text.
- Windows desktop `0.4.13` includes this continuous-writing and replan-recovery work.

### 2026-08-15 (Shelf and theme)

- When a chapter no longer matches later planning, Auto-Director adjusts neighboring unwritten chapter plans and keeps writing. Saved text, confirmed chapters, and manual content stay as they are. It pauses only when the whole-book structure needs a person, text cannot be saved, or a safety risk appears.
- Continuing from a historical replan checkpoint first confirms that later chapter plans refreshed successfully, so it does not skip the adjustment and stall on neighboring chapters again.
- Shelf cards drop synopsis text so cover, title, progress, and continue stay in focus.
- Books without a generated cover use a shared default image and still show the title, so novels stay distinguishable.
- Simple Mode text background and type follow the current theme. Dark and Night Cruise no longer show a sudden light reading area.
- Professional workbench stage banners, Auto-Director progress, flow steps, and AI Cockpit follow the theme. Status colors stay readable in dark UI without becoming too bright.
- Simple Mode and Professional Mode both say Continue after replan when chapter plans mismatch. AI keeps existing text, adjusts neighboring plans, and writes from unwritten chapters. A failed replan is not skipped in silence.
- Segmented chapter-list generation avoids sending already finished titles back into the model. If a new title duplicates one already in the volume, AI retries; if it still cannot uniquify, saving stops so duplicate titles do not enter writing.
- Existing books with duplicate chapter titles can regenerate titles segment by segment and sync them to the contents. Finished chapter text is kept and is not rewritten to fix titles.

### 2026-08-13 (Creative Hub boundary and Agent entry)

- The home top area is a daily writing desk: current novel, recommended actions, the full-book journey, and real progress. The cover also helps identify the current work.
- Home summaries are Writing now, Waiting for confirmation, Ready to write, and Settled chapters. Historical failures stay in creation alerts and run records so the next step is easier to see.
- Creative Hub focuses on novel status, diagnosis, run records, and next-step advice. Creating a novel, full-book production, writing text, and Auto-Director actions start from the formal workbench.
- Hub queries and diagnosis stay read-only. Action requests point you to the novel workbench, Auto-Director, Task Center, or model settings.
- The page lists the separate agent-driven novel app’s GitHub repository, clone command, and how to start it, and makes clear that the two projects use their own novel workspaces and run records.
- Run records and director follow-up move to System. Creation navigation stays on novel content and current writing status.
- Cover generation treats the exact book title as required cover text and blocks garbled characters, typos, subtitles, and watermarks.
- Product previews and public module docs use current screenshots. Home, Book Analysis, world, genre, story mode, title, and writing-style management show the current UI.
- First-time DeepSeek setup recommends V4 Flash for Chinese long-form quality and speed. Existing model choices are kept.
- Appearance and theme settings add Light, Dark, Match system, plus Inkstone, Warm Paper, and Night Cruise. The preference is stored on this device.
- Home creation alerts, status colors, and the novel list no longer stay light in a dark theme.
- The visual library is a masonry layout at each image’s original ratio. Tall and wide images are no longer cropped to one height.
- Switching Night Cruise display mode now applies. Light and dark Night Cruise use their own background, card, and text colors.
- Novel preview inherits the theme. Text, contents, toolbar, and selected chapter follow it.
- When the desktop app finds a new version, the top version entry says Update now. The first launch of a client version shows the update intro once.
- The desktop splash focuses on brand, startup stage, and local writing-space connection. Updates and logs sit in a secondary area.
- The splash and desktop update panel can download a recent log pack of the latest desktop logs for support.
- Windows desktop `0.4.12` includes clearer startup guidance and recent log-pack export.

### 2026-08-12 (Simple Mode, settings, and fixes)

- Windows desktop `0.4.11`. After Auto-Director creates a work, you can switch Simple Mode and Professional Mode. Simple Mode focuses on the chapter shelf and saved text; Professional Mode is the full workbench. Switching does not clear chapters, plans, or background tasks.
- The simple shelf adds a preview shortcut and a lighter reading view for finished chapters, whole-book progress, and what AI is processing.
- Auto-Director preparation shows how many chapters are already done and keeps finished story, character, and volume materials available. Closed situational tips stay closed.
- Settings become an overview split into Models and providers, Auto-Director, Knowledge and style, and Desktop and maintenance. Old model-routing links open the new model page.
- Models and providers lead with the provider in use; others sit in a shared management entry. Auto-Director confirmation, follow-up channels, and risk threshold expand when needed.
- Existing local libraries can keep generating chapters after upgrade. Fact-ledger data is filled in at startup so missing historical tables do not stop writing.
- When a chapter needs replanning, any Continue entry keeps current usable text and moves to later chapters instead of stalling on the same place.
- With knowledge retrieval off, import and maintenance no longer stay Queued. Turn retrieval on and rebuild the index to process them.
- World-skeleton generation that runs long, truncates, or times out shows a retry prompt instead of staying Generating or saving a half result.
- Generating a world from this book’s theme first gives compact opening-ready setting, which lowers local-model stalls from huge output and avoids repairing the same large result over and over.
- World-from-theme uses the currently selected model. Local Ollama and similar models no longer require DeepSeek.
- Preview contents return to the matching place when you expand the contents. Closing contents restores full reading width for text and the top bar.
- Preview can download the whole book or the chapter you are reading as TXT.

### 2026-08-11 (Writing mode and continuous generation)

- Windows desktop `0.4.10` includes Auto-Director issue handling, the Simple Mode entry, continuous generation, and workspace navigation.
- After Auto-Director finishes character, volume, and opening-route prep, you choose Simple Creation or Professional Creation. Simple Mode is not chosen for you.
- Simple Creation lets AI finish the whole book. Professional Creation opens the full workbench to inspect, adjust, and schedule writing.
- Later automatic replans keep the writing mode you confirmed and do not send Simple Creation back to the choice page.
- Simple and Professional share Auto-Director, chapter writing, review, and recovery. The simple page only trims information and actions; it does not own a separate continue-writing path.
- After Continue generation, the button area shows queued or current chapter action so you can see AI working before the next chapter saves.
- After a local chapter batch, generation can continue toward the whole-book goal from real chapter progress, keeping existing text.
- Opening a work from the novel list goes straight to its simple shelf or professional workbench instead of the wrong page first.
- Auto-Director drops extra actions such as View execution details and Come back later. Run records stay in global navigation.
- AI Live View opens from the top. Prepared characters, volumes, and similar materials stay available. Non-clickable writing-mode tags are gone.
- After a novel exists, Auto-Director offers Enter Simple Creation and Open novel workbench. Simple Creation opens a read-only shelf immediately; background prep continues and writing starts when materials are ready.

### 2026-08-10 (Auto-Director issue handling)

- Auto-Director records planning, writing, chapter-quality, and background issues together, with type, risk score, chapter, action taken, and rule source.
- Every issue type can auto-retry, continue after a reminder, pause, or end the task. Changes show a risk note. Content protection, data integrity, and critical save failures still take priority at runtime.
- Each novel can override a few handling preferences. Tasks already started keep the rules from launch so mid-run setting changes do not switch behavior.
- Local quality issues, temporarily unavailable acceptance checks, local repair failures, and background prefetch failures stay visible reminders and the book continues when usable text exists. Explicit replan, unusual usage, protected content, and data-integrity risks stop at a recoverable place.
- Task details and director progress show recent issues and can open the chapter or novel workspace.
- The Simple Mode shelf shows this book’s reminder and pause scores, rule source, and recent issues, and can open this book’s issue management without switching to Professional Mode.

### 2026-08-09 (Take over through a chapter)

- Windows desktop `0.4.9` includes Auto-Director chapter takeover and completed-state display fixes.
- Taking over an existing project with Advance to chapter N keeps the start and end chapters and continues prep, generation, and review for that range. It does not fall back to the previous finished batch.
- Takeover keeps the advance method and auto-approval you chose. Progress matches the chapter range you submitted.
- After a chapter batch finishes, background indexing and other wrap-up events do not overwrite the main task’s completed state. The page keeps real completion progress and chapter range.
- README adds an Alipay donation QR code to support ongoing development.

### 2026-08-08 (World graph interaction)

- Faction graphs and geographic maps let you drag nodes. Pan, wheel zoom, button zoom, full viewport, and one-click reset remain.
- Faction cards use a wider two-line name. Hover or keyboard focus shows the full name and faction type.
- Relationship labels prefer short names that do not cover nodes or other links. Hover a line for both sides and the full relationship; click to pin details.
- Moving from a relationship line to the detail overlay stays stable instead of flickering when the hit target changes.
- Viewing a relationship highlights that link and its two nodes. Geographic route details also show type, distance, and risk.
- The same world data keeps a stable automatic layout. Reset restores a clear arrangement without changing saved location coordinates or relationship data in the world handbook.
- The world timeline is a concrete view with event nodes, a progress track, and staggered event cards. Desktop browses horizontally; narrow screens switch to a vertical timeline. Filters, display count, and full screen remain.
- Writing-style assets still expand inside the card for tone, rules, samples, and actions.
- Apply and test use a clear bind-and-try-write flow. Bindings show a readable target level; try-write results use a focused reading area. Prose revision still goes through the separate Anti-AI entry.
- New styles start from Use a template, Describe an idea, or Learn from material. AI drafting is shown first; blank create remains when you know the rules.
- Style files keep their information and expand pattern, with lighter cards, a thin selected state, and excerpt-style samples.
- The top bar adds model settings. With no usable model, quick setup opens automatically. Later you can switch provider, key, address, and default model in the same window. Multi-provider maintenance and routing stay in Settings.
- After the first successful model check, one idea can start the first novel. The page explains say an idea, pick a direction, read chapter one, and the full creation guide stays available.
- Desktop `0.4.8` is on GitHub Releases.

### 2026-08-07 (Workbench reading)

- Book Analysis uses a reading-report hierarchy so title, result tools, analysis contents, and body stay distinct for long reading.
- The analysis list is a light contents view for selection, progress, and status. Any historical result switches the matching analysis. Search, filter, and new analysis remain.
- Opening a readable result goes to the list, result tools, and analysis body. Guidance appears only for new, generating, or recovering tasks. Creative Hub citations sit in result tools.
- Section, character, and analysis-category tabs use text navigation. Completion, budget, publish, and maintenance remain, with less repeated border and status-tag noise.
- Character files lead with motive, need, speech, growth, and key scenes. Generation dimensions, manual add, and visual materials expand when needed. Reference images can be ticked; chapter looks read on a timeline. Interview, edit, scan, and image generation stay available.
- Structured conclusions, source evidence, analysis text, and editing use spacing and soft grouping. Source compare, regenerate, save, publish to Knowledge Library, and Creative Hub citation remain.
- Run records use a task-inbox layout. Stats and filters are lighter. The list leads with work, progress, current action, and exception reason. Model, tokens, heartbeat, and steps expand when needed.
- Tasks that need recovery, approval, or retry are highlighted. Source jump, cancel, archive, and recover remain. Ordinary records stay simple.
- Title Studio organizes generate-from-novel, free studio, and reference adaptation. Candidates and the title library use comparable two-column cards for potential, naming direction, rationale, copy, and save.
- Knowledge Library is a materials shelf for title, version, source, availability, and linked analysis. Health is a light summary.
- View materials and Continue writing stay visible. New analysis, recall test, rebuild index, start/stop, and archive expand when needed. Upload, versions, and retrieval settings remain.
- The index page says whether materials can join writing. Connection problems open retrieval settings. Sync records show material type and action, with failure reasons visible. Task ids and retries expand when needed.
- Retrieval settings group how materials are understood and how the library connects. Collection names, index strategy, recall quality, and performance stay in advanced settings.
- The world-sample library is a lighter setting gallery: concept, core tension, and the scale of rules, factions, places, and relationships. Creation clues and version status expand when needed.
- Import help is a short guide. Handbook, organize, delete, and generate remain. Loading, retry, and empty library give clear feedback.
- World details use shared author-workbench navigation. Sample name and world content lead. Writing model and delete are on demand. Handbook reading is organized by impression, rules, factions, stage, and tension.
- AI layering, fill-in setting, and consistency check each own one task. Answers, summaries, and follow-ups are easier to finish step by step. Materials, assets, snapshots, import/export, and maps remain.
- Faction graphs spread nodes on a wide canvas and keep names and relationship text from overlapping. Geographic maps unpack clustered or stacked coordinates so landmarks, labels, and routes overlap less.
- Graph zoom is enlarge, reduce, and reset. The canvas still pans. Filters, legend, power system, and world timeline remain.
- Geographic maps pull too-close places apart. Route text avoids landmarks and place names. Faction graphs and maps can open a full viewport; Esc exits.

### 2026-08-03 (Short-story web-novel pacing)

- Short stories are designed, planned, and written as shorter but complete web novels, not as essays, literary sketches, or plot summaries by default.
- Openings reach pressure, anomaly, or conflict faster. The protagonist has a clear goal and acts. The middle keeps genre-matched turns and payoffs. The ending lands clearly.
- Full-piece review flags slow-burn exposition, empty lyricism, weak advance, and passages that do not suit phone reading, then does one necessary pass that does not overwrite your edits.

### 2026-07-30 (Creation Studio and finished short stories)

- Creation Studio starts from say the idea. AI reads the experience you want, recommends short story or long novel, and offers two clearly different directions. Confirm one to begin.
- Home and the novel list put Auto-Director long-form and Write a short story side by side. A fast finished story can go straight to the short-story path.
- The short-story first screen is a simple canvas: title, idea, and generate directions as one path, with less decoration and form chrome.
- Short stories support 3,000–30,000 words. Planning, continuous prose, full-piece review, and one necessary pass run in the background. Ordinary polish suggestions do not block delivery. After an interruption you continue from the saved position.
- A short story is one continuous piece. You do not need chapters, stages, or checkpoints. Read, edit, save, and export directly.
- Natural-language edits first show understanding, impact, and a suggested change. Finished text changes only after you confirm.
- A short story can be kept and grown into a long novel. The new long novel inherits core characters, conflict, and ending meaning, then Auto-Director prepares the full book.
- The new creation entry opens with a feature flag. Existing Auto-Director and manual create stay available.

### 2026-07-29 (Desktop release 0.4.7)

- Desktop 0.4.7 includes Auto-Director writing handoff, Simple Mode live chapter shelf, global quick model setup, and a dynamic creation guide.
- Auto-Director prepares direction, characters, world, and volume materials, then you choose AI finishing the whole book or the professional workbench to inspect and edit.
- Simple Creation shows chapter progress, readable drafts, and materials, with export, exception recovery, and an irreversible switch to Professional Mode.
- The desktop workspace top bar opens Version and updates. New version, download progress, and waiting-to-restart show nearby. At the time this shipped, that panel used Chinese copy.
- The docs site updates Auto-Director, first-book guide, and desktop update notes.

### 2026-07-28 (Writing handoff and Simple Creation)

- The desktop version number opens Version and updates without Settings. New version, download progress, and waiting to restart show at the top.
- The desktop update panel showed local version, status, available version, last check, and advice in Chinese. Settings still has the same full details.
- Web and desktop share the same quick setup when no model is available: pick a provider, enter API key or address, and confirm a text model to prepare planning, writing, review, repair, and replan. At the time this shipped, that setup used Chinese copy.
- Quick setup checks ordinary text and structured output. Failed checks keep your input and explain the problem. You can still browse existing work, but AI creation waits for setup.
- Home keeps reminding until the writing environment is configured. The reminder disappears when a model is available and does not nag already configured projects.
- Getting Started becomes a Creation Guide that reads real status. It recommends one next step around environment, idea, opening prep, writing mode, and first-chapter draft instead of a static feature list.
- Home shows a compact beginner route until chapter one is readable, then returns to the usual project workbench. Idea, direction, prep, handoff, and the simple shelf have optional situational notes you can dismiss.
- New-book Auto-Director and existing-project takeover finish direction, characters, volume planning, and opening materials before you choose a writing mode. Beginners are not asked for production parameters while planning is unfinished.
- Simple Creation reuses the same director task for chapter writing, review, repair, and needed replans. Professional Creation opens the full workbench to inspect plans and schedule writing yourself.
- The pre-writing prep page previews the Simple / Professional handoff and uses a stage journey for what AI is preparing. Live metrics, event stream, token use, and milestones expand when needed.
- Ordinary character, volume, and chapter-split prep advance to the writing handoff and are not interrupted early by plan-recalculate prompts. Protected user content and runtime safety risks still pause.
- Simple projects use a live chapter shelf for whole-book progress, current task, and per-chapter status. Only finished drafts can be opened; in-progress text stays hidden.
- The simple shelf read-only shows whole-book promises, story world, main characters, and volume route so you can see which materials AI is writing from.
- Auto-Director and the simple shelf offer task-specific AI Live View. It opens when the model starts generating candidates, story plan, characters, volume plan, or chapter text, without leaving for run records.
- Simple projects are read-only by default. You can still export finished chapters, recover safety-paused tasks, and irreversibly switch to Professional Mode after confirm, keeping content and background tasks.

### 2026-07-17 (0.4.5 release / 0.4.6 navigation fix / Ani Book Skill)

**0.4.6 navigation fix**

- The left navigation menu scrolls inside a fixed height, so System entries at the bottom stay reachable in a short window.

**0.4.5 release**

- The chapter-execution queue on the left scrolls in its own area, so you can still see and select the last chapter when there are many.
- Manually created blank chapters that have not started show Remove blank chapter. Confirm removes them safely. Chapters that already have text, goals, a task sheet, scene cards, or that have entered production stay protected.

**README and writing-workflow notes**

- README now introduces [Ani Book Skill](https://github.com/ExplosiveCoderflome/ani-book-skill) on its own, so people who want to drive a long Chinese novel from a local Codex workspace can see how that skill workflow relates to this project’s full workbench.
- Two complementary paths are clearer: start from this repository for a product with UI, runtime, and asset management; follow README into Ani Book Skill if you prefer a recoverable long-form flow inside Codex.
- The Ani Book Skill entry sits after the desktop download entry on the repository home page.

### 2026-07-16 (Chapter queue)

- The chapter-execution queue on the left scrolls in its own area, so you can still see and select the last chapter when there are many.
- Manually created blank chapters that have not started show Remove blank chapter. Confirm removes them safely. Chapters that already have text, goals, a task sheet, scene cards, or that have entered production stay protected.

### 2026-07-15 (World prep and Auto-Director continue)

- AI Live View is available from the top of every page for fragments the model is generating, checking, or repairing. Formal content still saves to the novel after checks finish.
- AI Live View is a draggable terminal-style overlay that does not cover the current page. It opens on the latest output; reading older output is not forced back to the bottom; closing is not treated as a drag.
- Live View groups each AI call. A new call focuses automatically; finished calls collapse and can be expanded for the full preview.
- You can clear the current window’s live output. Background generation, novel saves, and run records are unaffected. Later calls still appear.
- Task Center is labeled Run records, for execution history, exceptions, and recovery points on demand. You do not leave the current writing page just to see whether AI is still working.
- The novel workbench adds a World prep step after story-level planning: generate, bind, check, or fill this book’s world rules, places, and factions before character prep.
- Auto-Director continue detects whether the world is ready. If it is missing, you finish that step first. Existing story plans, characters, or chapters are not cleared. Recovery opens the right workbench.
- Character prep, volume strategy, and pacing splits depend on this book’s world so later character setting and plot planning stay inside the rules.
- Generating or creating a blank world inside a novel saves it to the world library and links it to this book. You can reuse, view differences, or sync later without an extra save.
- The workbench marks World prep complete from the real book-world state. A generated world is no longer shown as still pending.
- The character workbench combines relationship graph, thought line, cross-source character conversation, and visual materials so relationships, current judgments, and likely next actions sit together.
- Creative Hub, Book Analysis, asset libraries, and run records use more focused workbench views. Chapter plans keep tracking reader payoff, conflict, turns, and end-of-chapter hooks.
- Home and the novel workbench are tighter, so current assets, pending items, and next actions are easier to see.
- Chapter-task quality checks, Auto-Director takeover, and recovery have more regression coverage. Local quality issues stay as handleable reminders and do not stop the whole book without cause.

### 2026-07-14 (Chapter reader contract, promise ledger, and workbenches)

- Chapter refinement states the reader question this chapter answers, visible payoff, the protagonist’s immediate desire, main resistance, key turn, mood and information change, net change at the end, and the continue-reading hook, so the chapter does more than complete an event.
- Each scene card carries specific resistance, turn, mood change, and reader value, which cuts smooth empty transitions, repeated conflict, and vague setup.
- Writing, chapter acceptance, and local repair share the same reader-experience goal. Gaps get repair aimed at that goal, instead of writing one thing and judging another.
- Whole-book reading promise, protagonist fantasy, core selling points, chapter 3/10/30 stage payoffs, upgrade ladder, relationship through-line, and current milestone stay in chapter-writing context so long books keep their opening promises.
- Volume-level reader payoff and the current core payoff sink with chapter execution so each chapter’s local gain matches the volume goal.
- Old chapter plans still load. Newly generated plans must provide a full experience contract and scene-experience fields so incomplete results do not silently enter writing.
- Ordinary weak hooks, payoffs, or mood intensity become this chapter’s repair advice or quality debt. They do not automatically stop the whole book. With timeline off, misleading quality warnings are not raised.
- Book Contract chapter 3/10/30 payoffs enter the existing promise ledger as a stable book-level source with a clear target chapter window, so later planning, writing, and acceptance track the same promises.
- After you change stage payoffs, reconciliation runs in the background. Sync starts only when payoff content actually changes. Blank formatting or other setting edits do not spend an extra AI call.
- Background reconciliation uses durable tasks, idempotency, and retries. A failed sync keeps the last successful ledger and does not slow Book Contract save or delete existing promises.
- When Book Contract stage payoffs are changed or removed, old promises leave later writing obligations. Historical evidence and already-paid records stay, so old and new promises do not both demand fulfillment.
- Overdue promises stay as quality reminders. Overdue chapter count or a citation in the current chapter does not pause the whole book. Stops happen only when AI judges a plan mismatch, acceptance confirms a neighbor-chapter duty mismatch, or you ask to replan.
- Knowledge Library says whether materials can be retrieved, are still syncing, or need a failed task handled, and recommends upload, view progress, rebuild index, or continue writing.
- The genre-base library shows genre count, main categories, linked novels, and how complete descriptions are. Empty library, load failure, and missing descriptions each have a next step.
- The base character library shows reusable characters, types, visual materials, and core fields still to fill, so you complete goals, weaknesses, and growth before bringing a character into novel prep.
- Knowledge, genre, and character pages are quieter asset workbenches. Load, failure, empty, and dangerous actions have clearer impact notes and recovery.
- Task Center gathers global runs, waiting actions, and recoverable tasks, with clear load, failure, empty, and reload for list and details.
- Task failure or explicit replan asks you to handle it first. Chapter-level quality reminders can continue the main chain. Candidate confirm and chapter-batch continue show as actions needed, not as system faults.
- Director follow-up ranks blocked, quality reminder, waiting on you, and auto-advancing. Each recover, retry, or jump explains consequences and risk range.
- Book Analysis first screen shows source document, version, analysis range, current stage, progress, and planned-section completion. When done, you can open the first result that actually has content.
- Even if an analysis partly fails, is cancelled, or the source cannot be read, generated sections stay visible. Remaining gaps, budget continue, or regenerate are explicit. Task success is not treated as guaranteed readable content.
- Archived analysis results can still be read and copied. Sections not included in this generation are labeled Not selected this time, not as failed gaps.
- Creative Hub recommends one next step from the current novel, stage, and thread. Requirements, AI judgments, tool results, and approvals sit in the progress record. Full production parameters and run info expand when needed.
- Switching creation threads does not keep the previous thread’s content. Read failures can retry or switch threads. Create, bind, approve, and production submit lock conflicting actions.
- Entering Creative Hub from analysis, character, or task keeps resource binding on that thread. Switching novels clears the old novel’s chapter and world context so materials from different books do not mix.

### 2026-07-13 (Character thought line and conversation)

- Character prep’s intelligence layer shows how a character reads the situation, what they want, how they act under pressure, what they currently believe, and where they might misjudge, so you see why they would act that way before writing.
- AI can organize or refresh one character’s current thoughts. Each conclusion shows basis, source, and confidence, and is labeled as AI inference that does not automatically rewrite canon.
- After the cast is confirmed, thought lines are prepared. When a chapter is finalized, clear changes in cognition, mood, intent, and action choice feed back so later chapters keep behavior continuous.
- You can talk with a character in natural language. They answer from situation, known information, and current thoughts, and can refuse, misunderstand, or ask back instead of running preset options.
- If conversation produces a stable action tendency, you can carry it into later writing as a soft guide for a limited chapter window. It does not rewrite canon or force plot.
- When later text actually takes on that tendency, the basis is recorded. Unadopted influence expires after the applicable chapters and does not interrupt writing or Auto-Director.
- The desktop workbench fills actual window height. Character list and content are not clipped early on high-resolution or scaled displays.
- Long intelligence-layer content stays in one scroll area, avoiding double scrollbars or content pushed out of the workbench.
- Desktop locks outer-page scroll. Long content scrolls only in the current workspace so navigation and reading position stay put.
- The intelligence layer centers conversation: messages, input, and Carry into later writing sit together. The thought line sits in the scene analyzer for concerns, misreads, and reply logic on demand.
- Conversation supports focused full screen with the shared expand/collapse icons and Esc to leave. Full screen places talk and scene analysis side by side, each scrolling in its own area.
- AI-marked actions keep icon and text on one line. The full-screen icon aligns with the workbench title in compact layouts.
- Conversation covers novel characters, the base character library, and Book Analysis characters. All three open the same talk workbench but only read their own source materials.
- Base characters support read-only interviews around stable setting. Analysis characters lock evidence through chapter N and say so when they cannot confirm.
- Novel characters can still confirm one later-writing tendency after a talk. Base and analysis talks do not rewrite templates, source text, canon, or later prose.
- Base-library interviews open a compact two-column workspace. Conversation and the character sheet share height; longer setting scrolls in the sheet. Full screen still expands the full workspace.
- Talk with character from the base library opens full-screen conversation instead of inserting talk above the character list.
- Analysis characters read the selected through-chapter correctly for evidence interviews.
- Interview from source in an analysis character file opens full-screen conversation and returns to the file when you exit.
- Appearance-evolution chapter snapshots prefer key chapters that have look information, with paging or expand-all so long analyses are not a long stack of snapshot cards.
- Analysis interviews reuse per-chapter look-snapshot evidence, so interviews stay safe even when the base file cannot pinpoint a chapter.
- All three conversation workbenches are quieter reading UIs: talk is the visual center; reply basis sits in a light scene-analysis sidebar, with fewer cards, shadows, and borders.
- Assets add a Visual library for generated character looks, covers, analysis looks, comic settings/boards, and drama keyframes, filterable by type, source, or keyword.
- The visual library also works as a shared image picker. The selection returns a displayable image address and source so the same asset can be reused for covers and reference images.

### 2026-07-10 (Stepwise director, tighter relationships, incremental splits, beat slots)

- The relationship page opens on the network. Top explanation takes less space so the graph and filters come first.
- Character prep adds a Dynamics tab. The dynamic character system is no longer under relationships. Volume duties, new-character candidates, and relationship stages have their own view.
- Pacing / split defaults to generating the next chapter segment first. Generated segments can be refined and written immediately. Generate all volume titles at once stays an advanced action.
- Auto-Director splits by pacing segment. When the current segment is ready, chapter refinement and writing can start. Later segments fill in as you continue.
- New characters, relationship changes, or local edits flag affected later pacing segments. Segments that already have text stay locked by default so new characters do not force a resplit of written work.
- The pacing board keeps opening, upgrade, middle, squeeze, climax, and volume-end roles, and gives each segment a short volume-specific title such as Opening hook · Night-market seal, so you can see what that stretch actually advances.
- Auto-Director adds Stepwise collaboration: it pauses after each planning step so you can inspect, ask AI to improve, or regenerate that step before later planning.
- After a manual edit, Save and confirm in the same director task keeps confirmed content and continues from the next unfinished step. It does not retake over or overwrite existing text.
- Planning assets record your confirm state and downstream impact. Existing text stays locked, which cuts duplicate generation when switching manual and Auto-Director.

### 2026-07-09 (Candidate resume, first screens, character and volume consoles, roadmap)

Resuming an Auto-Director task that already has book-level direction candidates keeps the starting idea on the candidate page so you can pick a plan, generate another round, or revise the direction from notes.

- Returning to direction candidates from Task Center or recovery reads the starting idea from the candidate batch, so you are not told parameters are empty while candidates are on screen.
- If the task record truly lacks a starting idea, the page asks you to add one before generating or confirming a book-level direction.
- Project settings first screen is a Book positioning workbench: title, overview, target readers, core selling points, commercial tags, and the first-30-chapter promise, plus positioning completeness.
- This book’s world and style suggestions stay on project settings but sit in the asset area below so the first visit is not buried in setting fields.
- Story-level planning first screen is a Story engine console: idea, generate actions, readiness, next-step advice, and through-line skeleton for selling points, long opposition, main hooks, advance loops, and key payoff points.
- Advanced story-engine fields, hard constraints, the constraint engine, and story state stay in a fold below.
- Character prep is a Character asset console: switch the cast on the left; overview, file, outward look, resources, timeline, relationships, and intelligence layer on the right, with less long scrolling.
- The current character leads with status, goals, last appearance, story role, and key resources. Full file, outward materials, timeline sync, or relationship checks have their own tabs.
- The console’s visual hierarchy is closer to a character desk than a form: a clearer focus panel, cast navigation, tabs, and an overview dashboard.
- Relationships add an interactive network for the full graph, the current character’s neighborhood, high-tension links, and dynamic stages. Click a character or link for goals, conflict, hidden tension, and the next turning point.
- Viewing one character puts them on the left as the origin; direct relationships expand right as a tree. Lines and details name both sides for the current view direction.
- The network avoids nodes by card size so character cards overlap less.
- Character cards can be dragged to tidy the current canvas. Switching focus in the same view keeps those positions. Switching relationship views or re-entering restores automatic layout.
- The network supports full screen for dense casts. Esc exits.
- The protagonist uses a stronger core style so the narrative center is easy to find.
- Relationship cards are larger, with more stable space for name, identity, goal, and tags.
- Volume strategy is a console: generate, review, and save at the top; current volume, strategy overview, and asset constraints on tabs.
- The current volume leads with promises, pressure sources, payoff method, and a tension thumbnail. Detail fields edit by volume positioning, advance pressure, and payoff pull instead of one long form.
- Volume-count advice is dynamic: stories around 80 chapters prefer a three-act structure; extra-long books can use more volumes so a few huge volumes do not crush stage payoffs.
- Manually fixed volume counts and existing volume drafts still apply. Restoring system advice gives a structure range and recommended count from story length.
- Volume planning protects author-confirmed volume counts. Manual fixes and kept drafts are explicit constraints AI does not change while generating volume strategy.
- Regenerating volume strategy returns the old volume skeleton to pending so new strategy and old skeleton are not mixed as if already synced.
- Auto-Director runs a strategy review after volume strategy. If risk is too high, it stops before the volume skeleton and asks you to regenerate or revise.
- The public roadmap adds a long-term Narrative Engine Studio direction: organizing world, characters, factions, resources, events, and chapter text more like a game editor, while this stage still prioritizes stable Auto-Director, chapter production, and the quality loop.

## v0.4.1 (released 2026-07-08)

This release gathers mainline updates after 0.4.0, focused on Auto-Director opening, chapter-planning control, prose quality protection, the prompt editor, and the public docs site. The goal is to help beginners go from one idea to sustainable writing, and to let advanced users debug chapter generation more safely.

### Creation entry and project workbench

- Auto-Director create is a separate step-by-step page: start from one idea, then confirm positioning, world and style, model and run mode, then pick a direction. Confirmed content collapses into a summary you can revisit.
- Creating a novel recommends AI Auto-Director first. Manual create stays a light form so the first opening is not a pile of fields.
- The novel list and home focus on next writing: recent projects, chapters you can continue, pending items, and recommended entries, so the library works as a writing queue.
- The seven workbench steps use less card and border noise. Left flow, top advice, and primary actions stand out. Logs and advanced info expand when needed.
- This book’s world is more of a world front: overview, core rules, main factions, story stage, and what the generation chain can read. The full handbook opens full screen.

### Chapter planning, pacing, and quality protection

- Pacing splits add a tension curve and conflict-intensity anchors. After you set a chapter’s intensity by hand, later splits, refinement, and replans treat it as a hard constraint.
- Curve editing flags long flats, a weak volume-end peak, and weak beat movement, and shows volume positioning, segment summaries, and chapter goals while you edit.
- Chapter prose adds a naturalness check for AI self-talk, placeholders, prompt leaks, truncation, repetition, and templated sentences. Fixable issues enter this chapter’s repair path. Light leftovers become quality debt instead of stopping the whole book.
- Continuing with quality debt puts character state and resource changes into pending confirmation first, so bad facts pollute later chapters less.
- Auto-Director adds a switch to auto-release pending-confirmation state, for users who accept that advance risk. It is off by default and explains the risk before you turn it on.
- Continuation mode more clearly reads prior-work constraints, character state, timeline, and open threads, so sequels are not hanging on a title or a thin summary.

### Prompt editing and chapter-generation debug

- Prompt Workbench is a visual workbench: pick a prompt on the left, edit and preview in the middle, see injected context on the right.
- Chapter-writing prompts support safe slots and this-book advanced templates. Safe slots are for stable tweaks; advanced templates are for mature users rewriting the full chapter-writing prompt.
- In advanced templates, book contract, chapter task, timeline, character hard facts, chapter title, tone, and pacing references show as readable labels. Type `@` to insert materials, chapter parameters, or writing rules. At the time this shipped, those labels were Chinese.
- Chapter-generation preview uses clearer context headings. Missing key materials are named in plain language so you can go back to the matching module. At the time this shipped, those names were Chinese.
- Test output lets you pick a model and generate once from the current draft before saving. Structured prompts show parsed JSON; text prompts show model prose so you can judge whether the change is worth saving.
- The prompt editor keeps official-template restore and version history so a broken book prompt can roll back or return to official defaults.
- Chapter-task checks, chapter acceptance, and volume chapter-list generation are steadier. Unqualified titles, summaries, or chapter functions give AI a clearer retry direction.

### Interface and docs

- The project uses a shared dropdown. Book Analysis, Creative Hub, the novel workbench, Task Center, Title Studio, world library, comics, and drama no longer mix native browser selects.
- Title Studio, Auto-Director candidates, AI Cockpit, novel-create forms, and several workbenches drop gray boxes and nested cards so primary input and next actions stand out.
- The app top-left adds a GitHub repository entry for source, issues, and releases.
- The public docs site uses real page paths and pre-rendering so docs can be shared, indexed, and searched on the site.
- Prompt-management docs add screenshots and how to find the chapter-writing prompt, edit advanced templates, view context, generate a preview, save, and restore the official template.

### Upgrade notes

- Source users need `pnpm install` for new frontend visualization dependencies. If you skip it, the start script tells you what to do. At the time this shipped, that prompt was Chinese.
- This includes a database migration. Desktop uses the existing database and config at startup. People running the server from source should follow the existing migration flow.

### 2026-07-08 (Clearer prompt editing and chapter-generation preview)

The prompt editor is better for debugging chapter generation. Opening an advanced template shows book contract, chapter task, timeline, character hard facts, chapter title, tone, and pacing as readable labels so you know which kind of material you are citing. At the time this shipped, those labels were Chinese.

Chapter-generation preview is closer to real writing materials. Key background, chapter task, character state, and style requirements use clearer headings, with fewer opaque fields and internal ids mixed into the prompt.

- In advanced templates, type `@` to insert materials, chapter parameters, or writing rules. Inserted items show as labels so you can confirm what the prompt will use.
- Source view remains for advanced template debugging. Everyday editing can stay on the label view without matching underlying names.
- When key writing materials are missing, preview names the gap in plain language, such as Timeline, so you can fill it in the matching module.
- Book contract, chapter task, current situation, and style requirements in the prose preview read more like normal writing notes, so the model also sees clearer materials.
- Chapter-task checks, chapter acceptance, and volume chapter-list generation are steadier. Unqualified titles, summaries, or chapter functions give AI a clearer retry direction instead of regenerating past the point.
- README and the public docs site add prompt-editor screenshots and how to find the chapter-writing prompt, edit advanced templates, view context, generate a preview, save, and restore the official template.

### 2026-07-07 (Prompt Workbench official restore, preview context, and advanced templates)

Prompt Workbench can align changed slots to the current official version, which is useful after a global prompt was edited by mistake and a book needs a reliable default again.

Chapter-writing prompts add advanced-template mode. Mature users can fully rewrite this book’s chapter-writer system and human templates while keeping official restore and required-context safety.

- An Official version entry shows whether slots differ from the current official version and can restore one slot or all slots.
- Restoring the official current version at book level clearly shadows global overrides. Even if a global end-of-chapter hook rule is broken, this book’s preview and generation use official defaults.
- For official copy updates or removed slots, the workbench shows an alignment panel: Restore official current version, or Keep my settings and dismiss the version reminder.
- Slot cards show the current source: official default, global override, book override, or book using official default, so preview makes the winning layer obvious.
- Clear book override and Restore official current version are different actions, so restoring official defaults is not mistaken for inheriting a bad global value again.
- Generation preview gives complete sample input for editable slot prompts. Review, prose rewrite, cover brief, and similar prompts no longer throw a low-level script error for a missing sample array field.
- Full review-prompt preview includes sample chapter-boundary and structure-obligation context. The right context panel shows the injected review blocks instead of immediately complaining that those blocks are missing.
- Book-scoped Prompt Workbench can pick a preview chapter. Full review preview prefers that novel chapter’s text, task, boundary, and structure obligations instead of treating a sample warehouse cipher as this book’s context.
- Book-scoped chapter-writer preview reads that chapter’s writing context. The right panel can show book contract, chapter task, character hard facts, obligation contract, volume window, participating characters, current situation, and style contract, so preview is not blocked by missing required context.
- Book name, chapter number, chapter title, and target length in the prose preview follow the selected novel chapter.
- When required context is missing, Prompt Workbench names the missing context group in plain language so you can tell sample gaps from novel-material gaps or assembly problems. At the time this shipped, those names were Chinese.
- Book-scoped chapter writing can switch Safe slots and Advanced template. Safe slots stay for stable tweaks; advanced templates let mature users edit system and human templates directly.
- The advanced-template editor supports `@` to insert context, runtime variables, and slot references such as chapter task, character hard facts, chapter title, or tone-and-pacing slots. The right panel can also insert the current material block.
- Advanced-template preview shows the final messages, explicitly cited context, and required context the system appends automatically, so you can confirm what the model actually receives.
- Each advanced-template save creates book version history. You can view old versions, roll back, or restore the official template. Official restore does not delete history.
- Advanced templates affect only this book’s chapter-writer generation. Schema, context policy, post-validate, and other prompts stay closed to free editing.

### 2026-07-06 (Prose naturalness, Prompt Workbench, and quieter UI)

After a chapter is generated, a deterministic prose check catches AI self-talk, placeholders, leaked engineering words, truncation, repetition, em-dash/ellipsis overuse, and templated sentences. Clear problems enter this chapter’s repair path. If leftovers remain after repair but the text is readable, they are recorded as quality debt and later chapters continue, so one chapter’s wording does not stop Auto-Director.

- AI identity lines, refusal scripts, TODO / still-to-fill, task sheets, and prompt leaks in chapter text are flagged as prose naturalness / degeneration risk.
- Repeated paragraphs, likely truncated endings, templated “not A but B” sentences, and dense dashes or ellipses enter this chapter’s review and repair advice.
- Light pacing issues such as long paragraphs or fragments stay as tips and do not trigger a full-chapter rewrite.
- Chapter-execution risk summaries show Prose naturalness / degeneration check so this is distinguished from plot replan or a global-chain failure.
- After automatic repair is exhausted, related risks show as non-blocking quality debt. Without a replan signal, one chapter’s naturalness issue does not pause the whole book.
- Prompt Workbench is a visual editor: pick a prompt on the left, edit declared slots and see final messages in the middle, view injected context blocks on the right.
- Chapter-writing tone and pacing, Anti-AI rules, end-of-chapter hooks, narrative point of view, anti-trope reminders, length hints, and custom extra rules can be edited, previewed, and saved as overrides on one page.
- The context-injection panel shows required/optional, injected/trimmed/summarized, token estimates, and lock state. Critical writing context is read-only so required context is not turned off by accident.
- The prompt directory stays on the left and scrolls on its own. Compact list items show more prompts without scrolling the whole page.
- The main chapter-writing prompt keeps a clear directory entry. Immersive edit hides the directory and opens the main editor plus the right-hand context debug desk. Color shifts from flat gray-black to layered deep teal, warm gold, and light blue-gray.
- Novel create focuses on the default opening path: Auto-Director first, manual create as a light form. Starting settings, world and style, run mode, and direction candidates use less card noise. Reader and selling-point extras, model choice, title tweaks, and plan fine-tuning expand when needed. Manual create also softens frames around readers, world samples, continuation analysis, and AI-detect switches so title, overview, and core setting come first. Direction candidates become a divided list instead of stacked gray cards. In-progress and recovery progress, events, and milestones become light lists. Title quick-fill and resource tips get out of the way of the form. Positioning, advanced settings, continuation source, and project status use spacing and dividers. Direction candidates get a numbered track and title rows. After create, book positioning and Title Studio stay light so the jump into the workbench is smaller. AI takeover and the cover stage use lighter sections. This book’s world first screen drops the outer card for source, use range, sync, and handbook summary as light columns.
- Title Studio is a lighter workbench: description, model, generate mode, library filters, and candidates drop frame and tag noise so input and candidates lead.
- The novel list drops stacked top cards, filter boxes, and inner boxes. Cards lead with title, current advance, and the next primary action. Projects without background progress still align their bottom actions so the list reads as a continue-writing queue.
- AI Cockpit highlights current state and next action. Background execution, artifact records, AI usage, and automation become light summaries that expand when needed.
- The seven generation-workbench steps drop border and card noise. The left flow is a light step track. The top shows current step, advice, and primary actions. Project settings, story planning, character prep, volume strategy, pacing split, chapter execution, and quality repair lead with the current task. Logs, sync, connection diagnosis, and advanced config expand when needed.
- This book’s world first screen merges source, writing range, sync, and next action into one compact panel. The handbook reads more like body text. Theme, identity, and tone drop tag borders.
- Project settings strengthen the world front: overview, core rules, main factions, story stage, key tension, and what the generation chain can read. Full handbook, generation constraints, use range, sync, and world assets open as a full-screen handbook.
- Dropdowns use the project control. Book Analysis, Creative Hub, novel workbench, Task Center, Title Studio, world library, comics, and drama no longer mix native browser selects.

### 2026-07-03 (Tension anchors and curve editing)

Conflict intensity in pacing splits can be user-anchored. After you set a chapter’s intensity by hand, later splits, refinement, and replans treat that value as a hard constraint that AI results do not silently overwrite. The volume workspace can also view and adjust the tension curve so volume pacing is easier to control.

- Regenerating the chapter list keeps user-anchored conflict intensity.
- Chapter refinement and execution-contract generation see this chapter’s target intensity and whether it rises, falls, or holds versus neighboring chapters.
- User-anchored intensity inside a replan window enters replan context so AI adjusts around those fixed points.
- Pacing / split adds a draggable tension curve. Dragging a chapter node marks that chapter’s intensity as user-anchored.
- Anchors can be handed back to AI auto-optimize from the curve panel or chapter advanced settings, so a mistaken drag does not lock you into manual maintenance.
- The volume-skeleton page adds a read-only curve thumbnail for this volume’s tension while you edit volume info.
- The curve panel flags long flats, a weak volume-end peak, and weak movement inside a beat, and can overlay upgrade-flow or mystery-flow reference lines.
- The main curve view on pacing / split is read-only so browsing the shape does not drag nodes. Adjust from Edit tension curve in a dedicated dialog.
- The curve dialog shows this volume’s positioning, current segment summary, must-deliver items, and the selected chapter summary so intensity drags stay aligned with story goals.
- The volume-skeleton page keeps the read-only thumbnail and a jump to pacing / split so the same curve does not have different edit rules on different pages.
- Executing chapters still consume only the intensity number. Anchor meaning stays in the planning workspace so the execution chain does not grow another state fork.
- AI Auto-Director opening moves to its own page: one starting idea, then director start settings, world and style, model and run mode, then direction candidates and execution progress on the main page.
- After the starting idea you can refine settings or generate directions with defaults. Confirmed stages collapse into summaries for later edits and regenerate.
- The Auto-Director start page is a quieter opening question. The input leads; inspiration references expand as a row list and fill the input for further editing.
- Start settings drop card and border noise. Stage summaries become a light progress track. Reader channel, point of view, pacing, mood, and book-level framing confirm on a quieter stage.
- World and style, plus model and run mode, are quieter confirmation stages so world samples, styles, models, and run range are easier to confirm.
- Recovery links use the new page. Task Center, candidate confirm, recovery, and post-restart desktop links return to the same candidate or progress scene. Old create-page director links redirect.
- Source `pnpm dev` commands check that dependencies are installed first. After pulling new code without `pnpm install`, the prompt says what to do instead of throwing a missing-module error. At the time this shipped, that prompt was Chinese.
- Frontend visualization dependencies for later curves, world maps, knowledge graphs, and stats land in this update. Source users need `pnpm install` after pulling (the start check also reminds you).
- A GitHub icon and repository name sit beside the product name at top left for source, issues, and releases from inside the app.

### 2026-07-02 (Style Engine JSON save and continuation sources)

Style Engine advanced JSON editing is more reliable. After you edit the four advanced rule groups—plot advance, character expression, language texture, and pacing density—the save keeps what you typed instead of silently restoring old extracted rules when you leave and return.

- After you fill or edit advanced JSON, Save current style prefers the rules you are editing. Reopening the same style still shows that save.
- Style assets still keep the extracted feature pool. Later try-write, bind, and reuse do not lose existing features because of this fix.
- When you explicitly re-extract style features, compatible rules can still be generated from the latest features. The old automatic extract flow still works.

Continuation mode takes prior work more clearly. If a finished Book Analysis is bound, chapter writing prefers structured sections such as character system, story timeline, and plot structure, and sends character state, ending summary, key facts, and open threads into writing context.

- Prior-work constraints enter generation as required writing context, so sequels are less likely to see only a title or a thin summary.
- With a bound analysis, structured analysis results organize continuation info first. Without usable analysis, in-app novel or Knowledge Library summaries still apply.
- If planning fails to read a reference, it degrades to empty reference instead of stopping opening, planning, or the chapter chain.
- Key writing context has regression guards so style constraints, continuation constraints, character hard facts, and resource pressure are less likely to disappear silently in later changes.

### 2026-07-01 (Home cockpit, novel list, quality-debt review, auto-release)

Home and the novel list focus on next writing: novels worth continuing, states that need handling, and each book’s clearest continue entry.

When a chapter continues with quality debt, character state and resource changes extracted from that text go to a pending-confirmation queue first, so unreviewed facts are not written as later hard facts.

> [!WARNING]
> Auto-Director advanced settings add Auto-release pending confirmation, off by default. Confirm the risk note before turning it on. After it is on, it only processes character-relationship and information-cognition proposals created after the effective baseline, waiting more than 14 days, with no unresolved conflict. Qualifying proposals are submitted as canon and written into the director audit trail.

- Home highlights the novel or opening entry most worth continuing, with why it is recommended.
- Creation-status summaries center on in progress, pending, writable chapters, and failed tasks so you can see blockers first.
- Pending items distinguish task failure, waiting for confirmation, recoverable, and ready to write, so you hunt less across modules.
- The recent-novel list keeps continue, execution details, and open project, plus signals for generated chapters, characters, and world.
- Home adds character and world asset summaries so you can tell whether a project is ready for more long-form generation.
- The novel list keeps a two-column card wall and strengthens title, status, advance notes, and the next primary action.
- Auto-Director status is a compact advance area on the card. Chapter, character, world, and resource readiness are light asset info.
- AI Cockpit, execution details, preview, export, and delete become secondary so continue writing stays primary.
- Filters, empty, and loading are arranged like a project library. The first screen is tighter.
- List pagination shows current page and total pages.
- Title Studio is a centered content workspace with breathing room around the generate form, title library, and candidates.
- Quality-debt chapters can still drive later automatic generation, but related character state, goals, and resource changes enter pending confirmation first.
- Writing context marks pending character state and goals as adjustable to the latest plot. Identity, faction, location, and other hard facts stay strong constraints.
- Existing pending proposals are not auto-released. Proposals that hit unresolved conflicts stay pending for a person.

### 2026-06-30 (Public docs real paths, prerender, and RAG)

The public docs site uses real page paths. Each article opens, shares, and indexes at a URL such as `/docs/introduction`. Old `#/docs/...` links redirect.

- The docs sitemap uses real paths so search engines see each article as its own page.
- Build generates full HTML for public docs, with body, title, description, and canonical in the page source.
- GitHub Pages static hosting adds history-path fallback, so opening a docs path no longer depends only on frontend hash routing.
- Local docs development and preview still use port 4173. Real paths can be requested directly.
- RAG retrieval adds an optional rerank stage after vector and keyword fusion. If the external reranker is unavailable, the original fused result is kept.
- RAG indexing adds optional contextual chunks: a short context prefix is added before embedding so a chunk recalled without novel, chapter, or character background is less likely to miss. Original text still shows as evidence.
- Knowledge Library recall tests can show rerank hits and context prefixes so you can see why a passage was recalled.
- A fixed RAG evaluation entry covers character facts, world rules, chapter continuity, style setting, and knowledge documents, for comparing retrieval quality and rerank time.

## v0.4.0 (released 2026-06-29)

This release packages 69 changes accumulated in the 0.3 series: Auto-Director stability, chapter-generation context alignment, deeper Book Analysis character files, RAG performance and recall, comic and short-drama workbenches, the public intro site, and the docs system. Thematic user-visible changes are below; read the matching date blocks for detail.

### Auto-Director and the novel generation chain

- Full-book autopilot: after each chapter batch, pending candidate characters are confirmed into the official roster and dynamics rebuild, which cuts later character-consistency drift.
- Chapter generation filters the character resource ledger to this chapter’s participants instead of stuffing every character into the prompt. High-risk already-booked items and pending proposals use different audit paths, so pending resources are not written as facts.
- Long-running memory leak in the model rate limiter is fixed: when a provider’s settings change, old limiter instances are dropped.
- Auto-Director documents four run modes (prepare until writable / full-book autopilot / run a range / post-prose Anti-AI detect and correct), when to use them, and how to switch. Full-book autopilot stops on unavailable models, exhausted quota, repeated repair failure, or replan instead of retrying forever.
- Browser pause notifications: a system notification when Auto-Director reaches a checkpoint.

### Book Analysis and character looks

- Analysis character files have Brief / Standard / Deep / Full depth. Deep and Full go back to source excerpts to fill dimensions.
- Look evolution: incremental scans of appearance chapters at 25% / 50% / 75% / 100% coverage, depositing per-chapter appearance, costume, state, and scene anchors, then generating stage look images from chapter snapshots.
- Look-evolution scans also extract short appearance phrases into pending confirmation. After you tick them they merge into the character file. Chapter look images can reference the base character image for face, hair, and signature details.
- Book Analysis adds a two-column reading workspace, chapter evidence jump-back, range-targeted analysis, token budget guard, manuscript diagnosis, and chapter-title repair.

### RAG and Knowledge Library

- Knowledge indexing streams in parallel. Embedding and Qdrant write concurrency are adjustable. Long documents no longer wait for every embedding before vector writes start.
- Retrieval can be traced so you can review why a passage hit or missed.
- Analysis outputs enter RAG facet indexes so recall includes analysis conclusions.
- Duplicate chunks are deduplicated by content hash. Rebuilding an index does not create duplicate vectors.
- Knowledge upload is a drop zone plus two-step confirm. Million-word novel previews use virtual scroll and no longer stall.

### Comic and short-drama workbenches

- Comic workbench: scene consistency, character visual assets, visual-anchor control. Boards and character panels use an image-generation confirm dialog so accidental taps do not spend quota.
- Short-drama adaptation pipeline v3: derive short-drama scripts and shots from novel content.

### Public intro site and docs

- GitHub Pages public intro site: from one idea to a finished novel, product console screenshots, docs, and downloads.
- Intro site moves from 5173 to 4173 so it does not collide with other Vite projects or the main app. Brand icon and favicon use the real app icon.
- Docs site adds local full-text search, breadcrumbs, in-page contents, previous/next, tip / warn / checkpoint blocks, and GFM tables.
- Docs tree regroups as Get started / Field manuals / Production-chain depth / Module overview / Creation main chain / Knowledge and style / Setting assets / Derivative studios / System config / Project news.
- 33 public docs: project intro, install and prep, FAQ, troubleshooting, first-novel path, recover-by-stage handbook, end-to-end production chain, Auto-Director stage panorama, chapter execution chain, knowledge and RAG recall chain. Module docs include real screenshots.
- Public docs no longer show internal snake_case stage keys. Readers see names such as Idea alignment and Volume skeleton. A technical alias table stays at the end of the Auto-Director stage panorama for developers.

### Upgrade notes

- First launch after upgrade keeps the existing database and config. No manual migration.
- If you set RAG concurrency or similar run parameters in `.env`, the new version manages those in Settings. Old `.env` values are not read in automatically.

### 2026-06-29 (Public docs, Auto-Director run modes, search, and production-chain guides)

Public docs continue the same-day cleanup: Auto-Director run modes are fully documented, in-docs navigation and images are fixed, and the intro site’s brand icon and port are decoupled from the main app. The site is also better for a first look, troubleshooting, and understanding the production chain.

- Auto-Director adds a full Run modes note: Prepare until writable, Full-book autopilot, Run a range, and Post-prose Anti-AI detect and correct, plus when to switch. Full-book autopilot stop conditions (unavailable model, exhausted quota, repeated repair failure, required replan, and similar) are documented for the first time.
- The first-novel path adds Step 1.5: choose a run mode. The first book recommends Prepare until writable and when to switch to run through execution.
- Public docs replace internal snake_case stage keys with readable names such as Idea alignment and Volume skeleton. Developers can still look up original keys in the technical alias table at the end of the Auto-Director stage panorama.
- The development plan is rewritten as Done (last 3 months) / In progress / Next focus, listing real work (comic adaptation, short-drama adaptation, chapter editor v2, character resource ledger, Auto-Director execution-plane isolation) instead of vague “smoother/more stable”.
- FAQ adds four frequent questions: how to pick a run mode, what to do when full-book autopilot stops, whether the intro-site port collides with the main app, and where desktop data lives.
- How to use becomes an identity-based index (first successful run / want the mechanism / task stuck / want derivatives) so it does not repeat the first-novel path.
- Project intro adds a Derivative studios layer (comic / short-drama workbenches) and says not to open them before the main chain runs.
- GFM tables, strikethrough, and task lists render. Stage comparison tables in the path and depth docs display again.
- Module-doc screenshots (genre-base library, story-mode library, Style Engine, and similar) display. New images no longer need a manual whitelist.
- The right-hand In this article contents scrolls to the matching section instead of jumping home.
- Intro-site brand icon and favicon use the real app icon, not a generic book placeholder.
- Intro-site port moves from 5173 to 4173. The main app stays on 3000.
- Docs pages add local full-text search across public docs for features, problems, and settings.
- Each article adds breadcrumbs, a GitHub source link, right-hand contents with current-section highlight, and previous/next.
- The docs home shows categories by user journey instead of one flat module list.
- Public Markdown loads automatically. After adding a public article you only register it in the docs tree.
- Publish checks that public articles and release-note docs are in the docs tree.
- Field manuals and Production-chain depth cover the first-novel path, recover-by-stage, end-to-end chain, Auto-Director panorama, chapter execution chain, and knowledge and RAG recall chain.
- Auto-Director docs explain real stages from idea alignment through chapter-detail bundle: meaning, inputs, checkpoints, auto-approval, and failure recovery.
- Auto-Director field docs add the click path from Generate first batch through Confirm book-level plan to AI Cockpit finishing planning, splits, chapter execution, and quality repair.
- Auto-Director docs add real screenshots for start settings, idea cards, plan generation, plan confirm, AI Cockpit auto-advance, character prep, and pacing-split status.
- Markdown image resolution is fixed so flowcharts and Auto-Director screenshots show, not only alt text.
- Module docs add product screenshots for novel list, Creative Hub, Task Center, Knowledge Library, Book Analysis, characters, genres, story modes, Title Studio, Style Engine, model settings, and world-sample library.
- Intro-site home uses a light production-chain banner that matches the docs entry. Title, buttons, and path hints match the new art instead of the old dark poster.
- Director follow-up, Task Center, and Creative Hub docs add checkpoint types, pause reasons, background command queues, concurrency limits, stale recovery, and how natural-language intent connects to main-chain stages.
- Docs pages support flowcharts, long tables, collapsible in-page contents, and tip / warn / checkpoint blocks.
- Auto-Director stage docs no longer dump internal stage-validation marks into the body.
- Public-doc registration also checks the Auto-Director stage list so a new stage without docs fails the check.
- Intro-site top nav hides home-page anchors on docs pages so cross-page hash jumps interfere less.
- Home console screenshots use a responsive grid on tablet and desktop.
- Public-site design rules document docs-site boundary, search scope, contents, type, and responsive rules for later maintenance.

### 2026-06-28 (Faster knowledge vectors, upload UX, look phrases, intro site)

Knowledge vectors are faster: embedding and Qdrant write concurrency can be changed in Settings without a restart. Chunk indexing is a streaming pipeline, so long documents no longer wait for every embedding before vector writes start. Knowledge upload adds a drop zone: files preview on drop and upload after confirm. Large-novel source previews use virtual scroll and no longer freeze the page. Look evolution deposits newly found appearance phrases for confirmation; after you tick them they merge into appearance and stable traits. Chapter look images can reference the base character image so the same character stays consistent. Default character-image count is 1 instead of 2. A public intro site can be hosted on GitHub Pages for positioning, the long-form production flow, capabilities, screenshots, and user docs.

- Knowledge indexing adds embedding concurrency and Qdrant write concurrency under Knowledge retrieval settings → Advanced. Changes apply immediately.
- Chunking streams: finished embedding batches enter the write queue while later batches still embed, which speeds long-document indexing.
- Chunk facets (genre, selling points, character names, and similar metadata) make recall filters more precise.
- Duplicate chunks are deduplicated by content hash. Rebuilding an index does not create duplicate vectors.
- Knowledge upload is a drop zone: drop shows name and size, then confirm uploads.
- Knowledge source dialogs use virtual scroll, so million-word novels browse without stalling.
- Look-evolution scans extract short appearance phrases such as silver-gray short hair, old scar on the left shoulder, or often wears a dark coat into pending confirmation, without automatically rewriting the character file.
- Character details add pending appearance phrases: tick, ignore, and merge trusted phrases into appearance.
- Appearance merge refreshes the character file and look-evolution stable traits. Later character and chapter images use the merged look by default.
- Chapter look images prefer the generated base character image for face, hair, body, and signature details.
- With several base images, the look-evolution panel picks the reference for this run. The generate-confirm dialog shows base thumbnails and can exclude references you do not want sent.
- Appearance-dimension recall uses visual search terms so dialogue and inner thought interfere less.
- Character image generation, including chapter snapshots, defaults to 1 image.
- A public intro site shows Auto-Director, the long-form production chain, knowledge recall, Style Engine, and real product screenshots for GitHub Pages hosting.
- GitHub Pages auto-publish builds the intro site after a push to `main` or a manual trigger.
- Intro-site visuals lean literary desk plus AI console. The first screen is from idea to finished novel, with real screenshots of the production chain.
- Intro-site buttons vertically center icon and text. Color is ink, porcelain white, and teal accents.
- Docs entry is for users and potential users: basics, advanced intro, how to use, sidebar modules, public development plan, and release notes.
- Book Analysis public docs become a full handbook: create analysis, range, reading evidence, character files, look evolution, publish and reuse, manuscript diagnosis, and budget recovery.
- Genre-base library, story-mode library, Title Studio, Knowledge Library, world-sample library, Style Engine, Anti-AI rules, and base character library public docs become full handbooks for how those assets serve later writing.
- New runtime-tunable parameters live in Settings, not `.env`.

### 2026-06-27 (Deep analysis character files and look evolution)

Book Analysis character files can be generated at Brief, Standard, Deep, and Full. Deep and Full go back to source excerpts on top of the analysis notes skeleton and fold dialogue, action, inner life, and chapter evidence into character dimensions. Character details add Look evolution: incremental scans of appearance chapters at 25% / 50% / 75% / 100% coverage, depositing per-chapter appearance, costume, state, and scene anchors, then generating stage look images from chosen chapter snapshots.

- Character files add Brief / Standard / Deep / Full so you can skim cheaply, then analyze key characters more fully.
- Deep and Full combine source notes and original-text recall by appearance, personality, ability, relationships, arc, speech, thinking, values, and secret foreshadowing.
- Character evidence records source type, chapter, excerpt, and chunk per dimension so you can view evidence and jump back to the source.
- Look evolution on character details picks a coverage target and scans incrementally. Finished snapshots do not rerun. Manually kept snapshots are not overwritten.
- Look evolution summarizes stable cross-chapter traits and shows per-chapter appearance, costume, accessories, body state, bearing, and scene anchors.
- Each chapter look snapshot can start image generation. A confirmable prompt still shows first. Finished images belong to that snapshot.
- Look-evolution scans run as background tasks. After click, queued or scanning starts immediately and the page refreshes snapshot progress. Long analysis no longer looks like a network failure when the browser connection drops.
- Analysis character routes stay compatible while leaving room for later evidence, snapshots, and image assets.

### 2026-06-26 (Analysis budget, publish isolation, structured retrieval)

Creating an analysis can set a token budget for this task. Usage accumulates during generation. At the cap the task stops and keeps finished sections, so a long document or full analysis does not spend quota unnoticed. Analysis details show usage and why the budget ended, and you can raise the budget. If the task failed because the budget ran out, you can expand it and continue unfinished sections. Successful and frozen sections stay. Character files first identify candidates, then generate one or all deep files so you see who is worth studying before spending more. Publishing to Knowledge Library is a different source from user uploads. Republishing the same analysis appends a version on the same knowledge document so identical titles do not mix materials. Published key conclusions enter the index with genre, selling points, readers, strengths and weaknesses, and chapter anchors so later writing recall hits reusable conclusions. RAG recall also records traces for later quality review.

- New analysis and diagnostic analysis carry a budget cap aligned with server run config.
- After a section generates, token usage accumulates. If the model does not return exact usage, input estimate and output length are used.
- When the budget is exhausted, the task fails with a budget-exceeded mark. Successfully generated sections are not lost.
- Analysis details top and run metadata show used tokens / budget cap, and a clear stop reason when the budget ends.
- Analysis details can change the budget cap alone. Cumulative usage is kept, so you can raise budget mid-run or add a cost boundary to historical analyses.
- After a budget-exhausted failure, Expand budget and continue only remakes unfinished sections. Successful and frozen sections are not overwritten.
- Concurrent analysis stops dispatching new sections after the first error, waits for started sections to finish, then ends together so a failure is not overwritten by concurrent progress.
- Regenerating after budget exhaustion or other failure keeps successful sections instead of overwriting finished analysis while continuing unfinished ones.
- Character files support Identify characters first, then generate a file for one candidate or batch remaining candidates, instead of generating every deep file at once.
- Candidates show positioning, importance, a short description, and appearance-chapter hints. Generated files still show bio, arc beats, key scenes, art, and promote.
- Generate all uses a dynamic hint from candidate / failure mix. After a batch it shows generated / unfinished counts and how to continue after budget or failure is resolved.
- Results switch mutually between Section analysis and Character files. The toolbar is shared and always visible. The view is in the URL, so refresh and share return to the same view.
- The analysis list is not silently filtered by a document id in the URL. New analysis from Knowledge Library still shows all your unarchived analyses. The document id only prefills the source in the new-analysis dialog.
- Character identification and file generation count toward analysis token usage but do not change the base analysis task state. Full analysis still does not auto-generate deep character files.
- Knowledge documents show Uploaded document or Analysis publish as source. Published analysis can return to the source analysis.
- Publishing the same analysis again creates a new version on the original published document. Matching titles do not merge into user uploads or other published analyses.
- Published analysis writes structured conclusions into knowledge-index metadata for more precise recall by genre, selling points, target readers, strengths, gaps, and chapter anchors.
- Indexed knowledge documents can open a recall test from the document list to check how one source hits in writing retrieval.
- Evidence chips mark locatable source evidence. Click to check the excerpt in the current evidence area or two-column source.
- RAG recall samples query summary, retrieval scope, candidate count, hit summary, stage timing, and fallback marks. Records do not save chunk body, for later replay and quality review.

### 2026-06-25 (Tighter analysis first screen, range, two-column compare)

Analysis from create to reading is easier to drive by goal. Creating an analysis can choose full text, a chapter range, or a chapter range converted from word count. Result-page task actions stay in the top toolbar. Analysis info, publish, and run metadata fold by default. The sections tab reaches the first screen earlier. Evidence sits inside the matching section instead of a long separate panel. Wide screens can open two-column compare: source chapter on one side, conclusions and evidence on the other. Knowledge upload moves into a dialog so the document list stays focused.

- New analysis can choose source range: full text, start and end chapters, or a length such as `5k` converted into chapter bounds.
- A partial range is saved and only that source is analyzed. Export and details show the range used.
- Creating an analysis does not load chapters just because a document is selected. Chapter data prepares only when you switch to chapter or length range.
- Analysis details add a sticky toolbar: copy, regenerate, publish, Task Center, export, generate style, archive, and two-column no longer sit in a large info card.
- Analysis overview, publish to Knowledge Library, and run metadata fold into Analysis info and publish.
- Evidence embeds in the section as field chips, preferring bound structured fields and array indexes.
- Click a chip to see the excerpt in this section. Evidence with a chapter location still highlights the source fragment.
- Wide two-column mode shows source chapters on the left, with contents and body side by side so long chapters need less vertical hunting.
- Clicking right-side evidence jumps the left pane to that chapter and highlights the excerpt. When the left reading chapter changes, related structured fields on the right show This chapter.
- Knowledge document upload is a dialog. The document list is not occupied by a standing upload form. After success you return to the list and index status.

### 2026-06-24 (Analysis evidence, timeline structure, focused generation)

Book Analysis results are easier to trace and easier to aim at what you want to learn. New analyses bind evidence to the matching structured-conclusion fields, so key conclusions show supporting excerpts. Source-document versions are cached by chapter, so evidence can jump back to the matching source chapter and highlight the excerpt. The timeline stores time hints, stages, and source fragments as structured nodes. When structured-conclusion fields overflow their cap, the page says which fields were kept at the limit. Creating an analysis or rerunning one section can add a focus so the analysis stays closer to the question you are studying. You can generate or maintain deep character files on the analysis page—arc, key scenes, and motives as reusable character study material—and generate a reference image, set a main image, or promote the character into the official character library. Diagnose manuscript exports your novel text as a knowledge document and creates a diagnostic analysis. Republishing the same analysis to a novel’s Knowledge Library unbinds the old published version so later recall is less likely to hit stale analysis.

- Section evidence binds to specific key-conclusion fields when it can. A source hint beside the field shows which excerpt the conclusion came from.
- Knowledge-document versions are cached by chapter. When evidence matches a source excerpt, the evidence panel can jump to that chapter and highlight context.
- Chapter splitting prefers standard Chinese chapter titles. If they cannot be recognized reliably, the whole text stays one chapter. Old analyses and old evidence still display as before.
- Story-timeline key nodes and event order show as nodes with description, time hint, stage label, and source fragment. Historical string timelines also display as text nodes.
- Timeline key conclusions group by stage. Published and continuation-reference timeline dimensions use readable field names so events, risks, and state changes in the same stage sit together. At the time this shipped, those field names were Chinese.
- When structured-conclusion arrays exceed the cap, the key-conclusion area names the truncated fields.
- Newly generated analyses tell the model the array cap and timeline-node format, and keep more reusable conclusions by importance and narrative order.
- Full analysis generates an overview first, then plot, character, and world sections use that overview’s positioning and key judgments so sections disagree less.
- Creating an analysis can fill This analysis focus, for example ensemble scenes, the protagonist’s speech, or paid payoff. That focus enters every section’s generation prompt.
- Each section can fill Special focus for this section. Save or regenerate carries that instruction. Rerunning plot or character sections still uses the generated overview positioning.
- The analysis page adds Character files: generate deep files, or add, edit, and delete characters by hand. Files show positioning, appearance, personality, and goals, plus arc beats and representative scenes.
- Deep character files do not generate automatically with a full analysis. You trigger them when you want to study characterization or deposit character material, so default analysis cost does not jump.
- Deep files can generate a character reference image, show image-task progress, set a main image, and delete unused images. A confirmable prompt still shows before generation.
- Analysis characters can promote to the official character library in one step. The current main image can come along as a copied independent asset, so later edits or deletes of analysis images do not affect the promoted character.
- Diagnose manuscript lets you pick your novel, export current chapter text as a knowledge document, and create a diagnostic analysis immediately.
- Diagnosis mode uses its own hints and Diagnosis conclusions copy so the same analysis frame can check pacing, characters, theme, foreshadowing, and commercial selling points without changing the original novel text.
- Historical analysis evidence without field binding still displays. You do not need to regenerate to view or export it.
- Republishing the same analysis to the same novel keeps only the latest published Knowledge Library binding. Old published document bodies are not deleted, so other references stay intact.

### 2026-06-23 (Character resource ledger, image-generation confirm, pause alerts)

This update tightens long-form writing and visual production where things easily drift or fire by accident. The character resource ledger distinguishes high-risk already-booked resources from true pending changes, and chapter writing only brings in this chapter’s related resources. Image generation in comic and short-drama workbenches adds confirm and reference-material links, which cuts accidental overwrites and style drift. When Auto-Director is waiting for confirmation, recovery, or a validation block, a browser desktop notification can send you back to Follow-up.

- The character resource ledger no longer labels high-risk already-booked resources as pending facts. Writing context separately flags High-risk booked resources and Pending resource changes.
- Auto-Director or manual confirm of resource changes uses one submit path, which cuts duplicate submits, missing version snapshots, and inconsistent confirm results.
- Chapter-writing context prefers this chapter’s participating characters and resources in the current use window, so unrelated inventory is less likely to bloat the prompt.
- Ownership, state reuse, and visibility rollback enter conflict checks. Conflicting changes wait for confirmation instead of writing straight into the ledger.
- Long-untouched resources or resources past their expected use window show as stale risk, so later chapters can reclaim leftover props, gear, or clues.
- Image generation uses a confirm flow. Comic and short-drama workbenches handle reference images, prompts, and results more clearly before generating character, scene, panel, or keyframe images.
- Comic character assets, scenes, and panel images have a steadier reference-material path, so you can see which character, asset, or scene references the current image used.
- Short-drama visual generation uses the same image-generation confirm experience.
- Settings add Auto-Director pause alerts. After you enable them and allow browser notifications, waiting for confirmation, needing recovery, or a validation block sends a desktop notification you can click to open Director Follow-up.

### 2026-06-18 (Comic consistency: scenes, character assets, appearance-anchor help)

The comic workbench is built so the same character, place, and prop do not look different in every panel of a long serial. It adds a scene library (auto-detect episode places, editable scene bible, multi-angle sheets), a character asset library (costumes, weapons, and props can be generated or uploaded; panel scripts cite them; generation composites a reference), and editable appearance anchors with a face-shape override. If you do not want to rewrite prompts by hand, AI can help rewrite appearance. Character distinctness, balloon text, and art-style unity are also fixed, so villains no longer share the hero’s face, balloons no longer say “XX said”, and an ink-wash project no longer draws Korean-webtoon faces.

- Comics add a Scenes tab. Generating a panel script detects up to 8 places in this episode and writes them into the scene library. Each scene can edit a scene bible (palette, signature elements, materials, mood, spatial structure) and generate a four-quadrant reference sheet.
- Same-named scenes reuse across episodes instead of duplicating. A scene bible you edited is not overwritten when the panel script regenerates.
- Panel images inject the scene’s text description and use the matching sheet as a low-weight reference, locking tone, layout, and material while the camera for this panel stays free, so every panel is not the same shot.
- The character page adds a Character asset library. Each character can add costume variants, weapons, props, vehicles, and skill visuals, generated or uploaded. Panel-script generation cites asset names in character refs, such as costume Combat set or prop Moonlight sword.
- Panel generation composites the character turnaround, current costume, and used props into one sprite-sheet reference, which is steadier than stitching several references and improves body, costume, and prop consistency.
- Appearance anchors are editable. Nine bone-structure shortcuts (round, square, oval, long, youthful, mature, angular, wide-set eyes, phoenix eyes) append description in one click. After appearance changes, later turnarounds, expression sheets, asset images, and panels follow.
- Face-shape override exists for when the main appearance has conflicting words such as carved-sharp or triangular eyes. Text in this field has highest priority in the image prompt and suppresses conflicting bone-structure words in appearance. Sharp gaze or temperament can stay; the skeleton follows what you wrote.
- AI-assisted appearance-anchor polish can take a wish such as rounder face, keep the villain menace. AI removes internal contradictions, keeps signature traits, rewrites with bone-structure-specific words, and shows a change note for review before adopt.
- Characters look less alike. Generation uses the full appearance description instead of a 40-character short version, and appearance weight sits before style words. Prompts add bone-structure constraints to keep a unique skeleton instead of a template pretty face.
- Dialogue balloons no longer show “XX said”. The balloon renders only spoken lines; the speaker drives the tail. Historical “XX said:” prefixes are stripped so you can redraw without regenerating the script.
- Art-style consistency: turnarounds, expression sheets, asset images, and scene sheets used to always generate as color Korean-webtoon. They now follow the project style (ink wash, black-and-white shonen, realistic, chibi, and similar).
- Panel-image details add References used this generation: a thumbnail grid of the turnaround, assets, and scene sheet this panel actually used. Click opens a large image in a new tab.
- The top Image model choice persists across projects and refresh. After you pick Codex, the next comic project keeps it. If the config is invalid, it falls back to the first available option.
- Comic project details are full width, with less side whitespace, for reviewing characters and panels on a wide screen.

### 2026-06-17 (Recommended Auto-Director opening path)

Auto-Director opening more clearly recommends Prepare until writable, so you can check that the plan matches your idea before a large chapter run. Projects with a large expected chapter count are also asked to try a small range first. Resume, full-book auto-run, and quality repair are steadier: skipping the world stays skipped on resume; full-book auto-run with a prepared chapter list fills the task sheet just before writing; a failed local repair on the same chapter upgrades to full-chapter repair instead of looping light patches. The comic workbench is better for continuous production: edit episode outlines, view cross-episode facts, check character-sheet readiness, and review finished panels in a strip view. Entering comics notes that image generation currently supports `gpt-image-2` only. Desktop and web-dev tops also show the current client version.

- Prepare until writable is a clearer recommended style in Auto-Director run mode, and says it is for reviewing book-level plans, volume direction, and chapter-prep results first.
- When expected chapters exceed 200, start settings suggest a small trial, then widen after planning and early chapters match the idea.
- Auto-Director tasks that chose not to use a world keep that choice on resume or continue, without inserting a world-prep step.
- Full-book auto-run continues into chapter production when the chapter list is synced and task sheets wait to generate just before writing, and fills the execution task sheet before each chapter.
- If a chapter’s quality issue already tried local repair, later automatic repair switches to full-chapter repair, which cuts stalls from repeated light patches.
- Comic episode outlines can edit title, synopsis, ending suspense, and paid card. Generating a panel script warns about characters missing a turnaround.
- The comic character page adds a cross-episode fact library for events, first appearances, and state changes extracted from panel scripts, with delete for inaccurate rows.
- The panel page adds a strip reading view for checking finished art in reading order. Balloon hints sit closer to Chinese comics expression, with fewer text-position and balloon-type misses. At the time this shipped, balloon copy targeted Chinese comics.
- The comic workbench top notes that image generation currently supports `gpt-image-2` only, so you can confirm the image model before character sheets or panels.
- The sidebar Comic Studio entry shows `Beta`.
- The current client version sits beside the app name. Update the desktop version source before a new desktop package so installer, UI version, and Release tag stay aligned.
- Windows desktop updates to `0.3.20` for the package that includes comic image-model hints and the top version number.

### 2026-06-16 (Comic character recognition and panel-prompt control)

The comic character page is better for ongoing visual polish, and panel generation is more controllable. The left character list shows thumbnail avatars for characters that already have a turnaround. Fine-tuning a turnaround keeps likeness more steadily. Before generating a panel script you can set information density and extra requirements for this run. Panel-image details can review and edit a single panel’s shot script.

- Characters with a generated turnaround show a thumbnail in the left list. Others keep a placeholder, so switching the current character is easier to recognize.
- The fine-tune panel shows an editable prompt and Restore recommended prompt, so old images without a stored prompt do not start from a blank box.
- Characters with a turnaround can keep using it as a reference, with likeness lock on by default. Existing characters without an appearance anchor can temporarily fill likeness-lock words.
- To fully redraw a character, turn off appearance-anchor lock so the prompt follows the new character setting.
- Panel-script generation adds Loose / Balanced / Compact density and extra requirements for this run. Regenerating when panels already exist warns about overwrite risk.
- Panel-image details can view and edit a single panel’s shot script, then redraw after save. The last full prompt sent to the image model is kept as a review record.
- Panel generation records density, target panel count, and extra requirements, and keeps density, visual focus, and four-panel layout per panel for later script review, shot-script tweaks, and redraws.
- If a panel’s shot script changes after the image was generated, the panel is marked Needs redraw so you know the current image still comes from the old prompt.

In full-book Auto-Director, newly detected character candidates after a chapter finishes are confirmed into the official roster. Unconfirmed candidates used to stay out of later chapter dynamics and volume planning, which let consistency drift; that is fixed. A long-running memory leak in the model rate-limiter cache is also fixed: after a provider’s settings change, the old cache is released immediately.

- Full-book Auto-Director confirms every pending character candidate for this novel before advancing to the next chapter after a batch, without a manual step.
- Changing a provider’s concurrency or request interval no longer leaves old rate-limiter instances around forever. The change clears old instances for that provider.
- Server config examples add a public-deploy safety note: set HOST to 127.0.0.1, turn LAN access off, and tighten the request-body size cap.

### 2026-06-15 (Comic character visual assets)

The comic character page supports expression sheets and turnaround fine-tuning, and becomes an asset workbench: character list on the left, current character details on the right. Panel scripts also pass costume, expression, and lighting as structured refs into image generation, so multi-character frames and emotion panels stay more consistent.

- The character page uses a vertical list. The right details show turnaround, expression sheets, appearance anchors, prompts, and fine-tune.
- Expression sheets can generate six references for the same character: normal, happy, angry, sad, surprised, and cold.
- Characters with a turnaround can open fine-tune, regenerate from the current prompt, or tick use this turnaround as a reference.
- Panel scripts output a structured ref per panel character: name, costume, expression, and lighting, so later panel images are not name-only.
- Single-character panels still use the full turnaround. Multi-character panels prefer a face crop. When an expression sheet exists, the matching expression crop is added.
- Importing comic characters from a novel prefers appearance, body, clothing, and signature details, compressed into short visual anchors suited to image prompts.

### 2026-06-14 (Settings as a writing-readiness console)

Settings becomes a writing-readiness console: it tells you whether you can start a novel and what is still missing. Common config, quality extras, advanced director settings, and system maintenance are layered so beginners are less buried in parameters.

- The top adds a writing-readiness check for prose model, model routing, Knowledge Library extras, and Style Engine. When the base path is ready, you can go create a novel.
- Provider cards default to availability, current text model, image model, and a balance summary. API address, rate limits, thinking, balance detail, and the full model list sit in advanced details.
- Each provider’s connection-test result shows on its card. Unconfigured providers ask you to finish setup before test or refresh.
- Style Engine settings become Fast detect, Stable recommended, and Long-text extract. Minutes can still be tuned in advanced settings.
- Knowledge Library is an optional extra. You can start writing without it. After setup it improves setting, materials, and context recall.
- Approval-authorization preferences stay folded when you enter Settings, with a purpose note. Expand to see current defaults and save new checkpoint choices.
- Director follow-up channel config stays folded. Expand to set in-app access URL, DingTalk, WeCom, and event subscriptions.

### 2026-06-12 (Version snapshots and database size)

Version history loads recent snapshots more lightly. Auto-generated snapshots keep a recent window per novel so the local database grows less after long generation. When old snapshots need cleanup, you can back up first, then reclaim space.

- Auto-snapshots from Auto-Director and batch chapter production keep the latest 10 per novel. Manually saved versions stay in full, so key restore points remain.
- The version-history list reads only snapshot name, type, and save time. Opening the page no longer pulls whole-novel text snapshots, so the list loads more steadily.
- Snapshot cleanup creates and checks an SQLite backup first, then reclaims disk space, which helps local databases that grew after long test generation.
- Snapshot retention count is configurable. The default balances restore safety and local size.

### 2026-06-11 (Chapter writing stage, unified extract, faster style checks)

Chapter generation is clearer about where the book is, and notices long-absent characters who still have duties. After a chapter is finalized, summary, hard facts, character dynamics, and asset write-back complete in one unified extract, which cuts repeated waiting and overwrite risk. Style checks return faster when no literal banned words are hit.

- Chapter writing uses expected total chapters to hint opening, development, convergence, or ending, so later chapters control side plots, payoff, and close more naturally.
- Long-absent characters with high absence risk who already have an appearance duty get a Bring them in naturally hint so writing notices their presence.
- Prose generation stresses that each paragraph should also advance plot, reveal character, build tension, or build world, which cuts empty transition paragraphs.
- After finalization, one unified extract syncs chapter summary, hard facts, state changes, resource changes, foreshadowing, character dynamics, and information boundaries, so the same chapter text is not deep-read many times.
- Character-dynamics extract no longer races unified asset write-back. When unified extract for the same text already succeeded, event side effects stay a fallback, which cuts candidate characters and relationship stages being overwritten twice.
- The next chapter is more likely to see facts, state, resources, and foreshadowing from the just-finalized chapter, so background asset sync lag does not leave stale context.
- Chapter repair also uses the same unified asset write-back, so a repair draft does not get a rough summary first and a deep summary later.
- After upgrade, existing chapters may run one extra asset extract on first resync to fill the new summary, hard facts, and information boundaries. Results still save idempotently.
- Character-dynamics extract can record what major characters know and do not know at chapter end, so later chapters leak less future knowledge.
- Chapter context records budget-observation logs so you can see whether key context may have been squeezed out, which helps later stability work.
- Style checks first fast-scan enabled banned-word rules. No literal hit returns a clean result immediately. Hits or complex-only rules still run full deep detect.

### 2026-06-10 (Fact ledger coverage and short-drama production loop)

The chapter fact ledger only records this chapter’s duties that the acceptance gate confirmed as fulfilled, so later chapters do not treat “planned but never written” as established fact.

- This chapter’s must-hit-now duties enter the fact ledger only when acceptance coverage confirms them complete. Missing duties are dropped.
- If the chapter acceptance gate is unavailable, no this-chapter duties enter the fact ledger, because fulfillment has not been verified.
- Pre-writing foreshadowing instructions no longer become Revealed facts by themselves. Later reveal facts come from observing the prose, foreshadowing-state moves, or timeline-hook parsing.
- Dropped duties during auto-run stay visible quality debt. Task Center can say this chapter had unfulfilled duties that were not booked, instead of silently polluting later chapter context.

The short-drama storyboard-video page adds character reference images, first-frame images, whole-episode batch production, voice synthesis, per-episode SRT export, and generation-history management, moving short drama from prompts and shot assets closer to editable delivery.

- After character design sheets finish, named storyboard characters enter the video task’s reference images automatically. You do not re-upload.
- A storyboard card can generate a 9:16 first frame for one shot and show a thumbnail, so you can confirm composition before spending video quota.
- Creating a video task prefers an existing first frame as the first reference, then character design sheets, so image-to-video keeps composition and likeness.
- Video channels declare whether they support reference images. Unsupported channels still create ordinary text video tasks so external APIs do not fail on unknown reference fields.
- External HTTP video channels can turn reference images on and set a base access URL that turns local character-image endpoints into cloud-reachable addresses.
- Export can download SRT for the selected episode. The timeline is inferred from the latest storyboard shot order and durations. Without storyboard lines it falls back to script body line by line.
- Storyboard video adds whole-episode batch tasks: generate every first frame or create every video task in this episode, with progress, skip count, failed shots, and retry.
- The script page adds whole-episode voiceover: batch-synthesize shot lines from each character’s voice setting, and preview generated audio line by line.
- Voice channels are exposed by the backend. A default mock channel is for local wiring. An external HTTP voice service appears in the workbench selector after it is configured.
- Lines with generated voice use real audio duration for the SRT timeline, so subtitles sit closer to later rough-cut rhythm.
- Export can download this episode’s edit-draft JSON with video, voice, and subtitle tracks in shot order, for rough cut or an external editor.
- Batch first-frame, video, and voice show estimated cost first and record actual cost after. The project page can summarize recent production cost.
- Regenerating a video prompt keeps the old version. Storyboard video distinguishes current prompt from history. Creating video tasks, batch generate, and edit-draft export use the current version.
- Regenerating first frames and character design sheets keeps history. The workbench can open old images to compare composition and likeness. The current image stays the default later video reference.
- Short-drama strategy generates an executable paid-card plan: first paid episode, free funnel, intensity curve, and card-intensity targets. Episode outlines and quality checks follow that plan so a labeled paid episode is less likely to have a weak card.
- Quality adds a platform-compliance precheck for violence, medical mislead, feudal superstition, vulgar edge, and advertising-law wording in existing scripts. Blocking items enter the repair queue. Reminders do not stop production.

### 2026-06-09 (Cross-chapter fact drift, test reset, quality guards)

This update fixes improvised hard facts that would not stay consistent across chapters, adds a chapter-reset tool for repeated tests, and records earlier novel-generation quality guards.

**Improvised facts across chapters**

- The fact ledger used to extract only from the plan layer, so it forgot hard setting the prose invented (a deal is off-books, a specific amount, a count, a ticket number, a weight). Later chapters could rewrite a contradiction, for example turning a private screening for a hardship fee into an official factory dispatch that collected no money.
- Chapter finalization now extracts a summary and hard facts from the prose in one call (promises and deal terms, event nature, key numbers and dates) and writes them into the fact ledger.
- Chapter summaries used to run only from a frontend request and never during auto-run. They now run at finalization, so the next chapter’s just-in-time task sheet can read real prior facts and contradictions are cut at the source.
- In testing, ticket numbers, weights, and event nature stayed consistent across chapters. Private-job-to-official-duty contradictions no longer appear.

**One-click chapter-text reset (test tool)**

- Project tools add Reset all chapter text, which clears prose and related derived state so you can regenerate for tests without rebuilding the novel from zero.

**False “missing outline” on just-in-time planning**

- Full-book auto-run (lazy planning) skips the full chapter-detail bundle on purpose, but validation still used to require a structured outline and falsely report that it was missing. Skipped steps no longer false-report.

**Novel-generation quality guards (catch-up)**

- World-slice prompts guard against polluting proper nouns from a mismatched source world, and a rebuild tool can reconstruct a polluted world slice.
- Volume windows add key-beat guards and a scene-pattern blacklist, which eases repeated milestones and unbalanced pacing.
- A chapter-continuity audit tool is added.

**Short-drama creation chain**

- You can create a short-drama project and assemble a standard material pack from a novel, an original idea, or imported text.
- Short-drama Studio is in the desktop sidebar and mobile creation-assist nav. Pick an existing novel to adapt, or create from an original idea or import, then Organize materials → Generate strategy → Generate first 12 episodes.
- Project lists and project pages show readable track names such as comeback, rebirth revenge, and hidden identity, not internal ids.
- Each project has its own workbench: source materials, strategy, episode scripts, characters, quality checks, repair advice, storyboard video prompts, and export, instead of list-only buttons.
- You can edit and save episode title, opening hook, ending card, and script body. Manual rewrites clear old quality results so you can recheck. The character page is short-drama character asset cards for on-screen function, audience recognition, fixed look, performance voice, line rules, and conflict relations, saveable to the short-drama character library.
- Source materials show whether synopsis, beats, characters, and hard facts can support later production. Characters can import from the short-drama library. Storyboard video can refresh video-task status.
- New projects can let AI recommend a better track, with fit reason, material signals, risks, and alternatives you can adopt.
- Source materials add AI fill-in advice: when synopsis, beats, characters, or hard facts are thin, you get concrete questions and a next step before strategy, episodes, and scripts.
- New projects are a Source → Content → Specs wizard. Importing a novel names the project automatically and opens the workbench.
- Recoverable tasks no longer auto-popup over Short-drama Studio or other pages. Handle them from Recoverable tasks on the novel list.
- Project details add a Next-step main-task card that guides organize materials, generate strategy, episodes, scripts, quality check, repair, storyboard, video prompts, or export from current artifacts.
- Quality issues summarizes checked episodes, awaiting repair, continuable quality debt, passed episodes, and average score, and can jump to the script, recheck, or repair from advice.
- Storyboard video summarizes prompt count, created tasks, generating, completed, and failed. Each video prompt shows provider status, negative prompt, aspect, duration, result link or failure, and can create a task or refresh.
- Video providers come from a backend registry. The workbench reads what is available and lets you choose, so later real providers do not need mock-hardcoded buttons.
- A generic HTTP video channel can be configured for an external create-task and status API, then appears in the workbench channel picker.
- Video-task result links and failure reasons save as stable state. The workbench can show a result entry or failure note without parsing a raw provider receipt.
- When quality check finds a repairable issue, that episode enters the repair queue first. Next-step guidance does not skip repair into storyboard or video with known quality problems.
- Projects can generate vertical paid-drama strategy, episode outlines, and per-episode scripts, then quality-check hooks, cards, duration, and consistency.
- Per-episode scripts can repair from quality advice and export Markdown / JSON episode documents.
- Short-drama characters are managed separately and can settle into a library. Scripts can later generate storyboards and video prompts, and create video tasks through the video-provider abstraction.

### 2026-06-08 (Logs, faster full-book runs, just-in-time task sheets, facts, quality guards)

Desktop and development logs rotate and keep a retention window so long runs do not pile files forever, while recent troubleshooting logs stay.

- The desktop main log rotates past a size cap. New lines keep writing to the current file. You do not empty it by hand.
- Development-session, model-debug, and structured-repair logs clean old files by the default policy and keep the last 24 hours.
- Log cleanup only touches known log files. It does not delete database events, novel data, images, backups, or other product files.

Full-book auto-run is faster and quality repair is more precise: repair aims at what the chapter actually missed, the whole book is not re-queried for every chapter, and the next chapter’s task sheet can start while the current chapter finishes.

- Chapter repair receives structured missing-obligation and blocking-issue detail, so it can fill unfulfilled duties instead of guessing from flattened text.
- If a local patch cannot find its anchor, repair retries once in a looser continuity-only mode before upgrading to a heavier full-chapter repair, which cuts early upgrades.
- Length problems and content problems keep separate retry budgets, so fixing length does not spend the budget that a later content issue still needs.
- Stable book-wide context (world, characters, story plan, volume plans) is reused across chapters in a run. Each chapter only refreshes changing state, payoffs, facts, recent chapters, and recall.
- After a chapter’s facts are written, the next chapter’s just-in-time task sheet can prefetch in the background during full-book autopilot. A prefetch miss does not stop the pipeline; the next chapter retries when it assembles.
- Combined with reused book context, the next chapter starts with cache already warm and a task sheet ready, so assembly waits less.

Lazy planning generates each chapter’s task sheet just before writing instead of pre-generating every sheet in planning, which removes the wait-for-all-chapters gate and keeps sheets aligned with what already happened.

- Full-book autopilot can enter chapter execution after chapter titles and pacing anchors exist. It does not wait for every chapter’s task sheet to pre-generate.
- Each chapter’s task sheet is generated just before writing, with already-written facts injected, so duties do not contradict prior prose.
- Older novels that already have a task sheet and almost no fact-ledger rows (nothing written yet, or chapter one) reuse the existing sheet. Manual single-chapter mode is unchanged.

Chapters that continue with quality debt now record a structured why (first and second failure codes, patch-anchor misses, missing-duty kinds), so later diagnosis can see open-loop repair, patch mismatch, unreachable duties, or signature drift without another model call.

A slim fact ledger remembers irreversible events so later chapters do not rewrite what already happened. Timeline wrap-up no longer sits on the writing path. Timeline display itself is unchanged.

- After a chapter passes acceptance, completed and revealed duties write into the fact ledger without an extra model call.
- Writing context fills already-completed milestones from that ledger so the model is told what already happened and must not be pursued again.
- Completed and revealed facts return in full. State-changed facts take the last 15 chapters, which keeps context length in check.

Quality guards cover four systemic problems: source-world vocabulary leaking into the story, completed events being rewritten, repeated scene patterns, and volume pacing running away.

- World-slice free text must not drop in world-asset proper nouns. When the source world and the story’s era or place clearly mismatch, the slice must include a mapping note and banned words, so a historical setting such as Gaomi Northeast Township does not pollute a modern story.
- A rebuild tool can force-rebuild a polluted world slice when the source world and the novel’s background are badly mismatched.
- Writing context labels completed process events (a license already obtained, an agreement already signed) as already done, and forbids pursuing those goals again.
- Volume-window context shows key-beat guards (target chapter range, event, pacing note) so a climax planned for later chapters is not written early.
- Opening constraints show a scene-pattern blacklist and forbid repeating the same time + place + action combination.
- A continuity-audit tool scans generated chapter text for repeated scene patterns and repeated opening paragraphs, and returns a diagnosis and repair advice without a model call.

### 2026-06-05

Auto-Director continuous runs are steadier and chapter-generation context is more focused: overdue foreshadowing without a clear target chapter window is less likely to be misjudged, batch writing is less likely to stop on duplicate-ledger errors, and chapter retrieval sits closer to this chapter’s task.

- The chapter list in pacing splits is for viewing, generating, and editing existing chapters. A manual add-chapter entry that could bypass automatic planning is gone.
- Foreshadowing-ledger sync recognizes synonymous titles and reuses an existing unfinished ledger, so AI is less likely to create a duplicate overdue item for the same payoff.
- Overdue payoffs without a clear target chapter window degrade to follow-up risk. They no longer directly trigger a whole-window replan or stop later chapter execution.
- Chapter writing builds Knowledge Library retrieval from this chapter’s goal, must-advance items, conflict, and appearing characters, so recall sits closer to this chapter’s writing task.
- Chapter-generation context drops old bulk background that writing did not actually consume, and puts related information into structured runtime context, which cuts useless context bloat.
- Windows desktop updates to `0.3.17` for the package that includes this Auto-Director, world, and chapter-production stability work.
- Windows desktop packaging moves to a Node 24 verification path and prepares a `0.3.18` installer to verify GitHub Actions Node 24 runtime compatibility early.

### 2026-06-04

Continuous Auto-Director writing uses fewer resources and waits less: quality-gate results for the same chapter and same text are reused, and timeline context is tighter, so restarts repeat less review, extract, and execution-contract refinement.

- Chapter quality gates reuse a successful acceptance judgment and timeline check. The same text no longer spends another AI call by default after cancel, failure, or restart.
- Timeline extract carries only recent key events and necessary hooks, so later chapters do not get slower as whole-book history grows.
- Chapter acceptance distinguishes hard blocks from continuable quality debt. Light duty risks keep a reminder and continue, which cuts unnecessary automatic rewrites.
- Chapters that already have a task sheet and scene budget do not regenerate the execution contract during recovery. Regenerates with new instructions can still overwrite.
- Auto-Director watches per-chapter AI usage and pauses later execution when one chapter’s spend is abnormal, so context bloat or a quality loop does not keep raising cost.
- Timeline extract no longer blocks chapter acceptance. After prose passes acceptance, timeline finalization continues. The next chapter still fills necessary timeline checkpoints before it starts.
- Usage pauses focus on the chapter range still advancing. Finished chapters do not keep blocking later chapters because historical cumulative usage is high.
- Chapter batches judge review, repair, and state submit for the current execution range together. Local issues already booked as continuable quality debt no longer pin Auto-Director on chapter-state submit, which cuts repeated recovery and unusual token spend.
- Timeline finalization and chapter-asset write-back claim a sync record before calling AI, so the same chapter and same text are less likely to be extracted twice by concurrent background entries.

### 2026-06-03

Batch chapter generation is less likely to stop on repeated quality debt. The system distinguishes Continue with a reminder, Local repair plan, and Must stop to replan, so the same overdue foreshadowing batch does not trigger whole-window replan across consecutive chapters.

- Short-window overdue foreshadowing that does not directly affect the current chapter stays a reminder and no longer stops the later chapter pipeline by default.
- Only replan advice that clearly needs a whole-window change pauses later chapters. Local plan issues enter repair and quality reminders instead of becoming a whole-book block.
- Must-advance on the chapter task filters system-audit tags such as acceptance-gate unavailable and structured gaps, so AI does not write system problems as plot duties.
- The chapter quality loop judges risk with the new replan actions, so continuable quality debt is less likely to display as must replan.

### 2026-06-02

Major update: the world moves from a field form to a world handbook and world-skeleton flow that beginners can understand and start from. Auto-Director can also prepare this book’s world after story-level planning, so characters, places, factions, and chapter context stay more consistent.

- World generation defaults to World intent → World scale → Skeleton preview → Save world. You can pick a light stage, standard long-form, or complex ensemble, and adjust counts for rules, factions, places, conflicts, and story entries.
- The world library and world workbench show world cards, handbook, core rules, main factions, key places, relationship network, and completeness diagnosis, so you face fewer raw field names such as background / geography / factions.
- World maps and faction graphs have fuller data: places include relative coordinates, direction, risk, controlling faction, and connections; factions include goals, resources, controlled places, relationship type, and tension.
- A novel can manage this book’s world: import a library world as a book copy, or generate a world from this book’s theme. You decide whether to save back to the library or sync differences by hand.
- Auto-Director adds this-book world prep after story-level planning and the book contract. Without a reference world, it generates this book’s world by default and builds usable world context before character prep.
- Character generation can use the current world, and combine faction lean, world rules, and identity bounds so people fit this book’s stage.
- World-generation retrieval is tighter: it defaults to the current world, templates, and references you explicitly chose, so unrelated Knowledge Library documents mix into a new world less often.
- The acceptance gate more steadily recognizes duties this chapter must complete that are missing from the prose, and is less likely to dump missing duties as scattered text that trips the repairer.
- Timeline extract more steadily records events, state changes, and later hooks. Chinese type names or shorthand hooks normalize into a savable structured format.
- Chapter-asset extract handles resource state more steadily. Auto-Director’s high creative temperature no longer spreads into fact-extract tasks.
- JSON-repair logs can group by prompt and failed field, so you can tell whether an example, enum, context, or model output caused a structured failure.

### 2026-05-29

Major update: Auto-Director, chapter production, character casts, model selection, idea help, and runtime governance verified on the pre-release branch after 2026-05-24 merge into mainline, with Windows desktop `0.3.16`.

- Continue from current project is smoother: the dialog first shows volume planning, split sync, chapter refinement, writing, and quality progress, then continues from the recommended place in one click. For a continuous run you can pick Advance to chapter N.
- Taking over an existing project from story planning, character prep, volume strategy, or chapter execution recognizes real progress more accurately. Finished character prep is not shown as still pending. A chapter range is not mis-applied as whole-book pre-takeover.
- Applying a cast is faster: a manual apply syncs characters and relationships first. Outward materials and character dynamics fill in the background. The button does not stay Applying for a long time.
- Pacing splits connect to chapter execution more directly. Split chapters auto-link to execution chapters. Older projects prefer chapter identity, so the execution area is less likely to miss split results.
- The chapter production chain is steadier: quality debt binds to the chapter that actually triggered the issue and already has text. Empty chapters are not skipped by mistake. Timeline, state extract, and quality repair more steadily support later writing.
- Auto-Director cockpit state is unified: progress dialog, novel-page hints, Task Center, and execution details prefer the same cockpit state, so one task is less likely to show different progress, wait states, or a dead confirm button across entries.
- Running tasks prefer the real advancing state. Historical approval projections, chapter-title reminders, or old waiting-for-confirm info no longer show a refining, writing, or reviewing task as Waiting for confirmation.
- Let AI continue Auto-Director from this project only treats a real Auto-Director task as current. Ordinary edit-flow tasks no longer make the takeover dialog show Enter current task.
- Unfinished waiting-for-confirm reminders say Dismiss this reminder, so dismiss is not mistaken for completing or ending the task.
- Auto-Director create fits the beginner default: Prepare until writable is recommended, plus Reader-channel lean so AI can judge male-channel / female-channel reading expectations and payoff emphasis.
- No idea? beside the starting idea can temporarily generate 5 horizontal inspiration cards. Use this fills the input above. Existing content asks confirm before overwrite.
- Switching provider in the model picker refreshes that provider’s model list immediately, so you do not go to Settings, refresh, and come back.
- Home, novel list, and task recovery first screens read lighter. Model status, recovery summaries, and the novel list load in stages, so opening a page is less slowed by background APIs.
- Backend chapter runtime, Auto-Director, novel application services, event side effects, and route boundaries keep tightening. Prompt calls add quality telemetry for later long-chain generation and recovery diagnosis.

### 2026-05-28

Existing-project takeover is more like a continuation assistant. After Let AI continue Auto-Director from this project, you first see a continuation diagnosis and asset-protection notes, then you can continue from the main button.

- The default entry uses the recommended continuation place. You no longer pick a stage card and confirm a second time.
- When the next chapter and whole-book chapter count are known, you can pick Advance to a target chapter and let AI run from the current chapter through that chapter in one click.
- Created characters, volume plans, and chapter assets ask whether to keep them before takeover. Rerun and range-run controls sit in advanced settings.
- Continuation diagnosis shows volume planning, split sync, chapter refinement, prose, and quality progress. If the page has a task id, that task’s real stage and next-chapter progress lead.
- When a chapter range does not fit the current project, the error names a recoverable action and sends you back to the recommended place.
- New Auto-Director recommends Prepare until writable. Full-book autopilot can still be chosen by hand.
- Auto-Director create adds Reader-channel lean, judged by AI by default, to help payoff, emotional center, and relationship-line weight.
- No idea? can temporarily generate 3 different opening inspirations. Use this fills the input above. Existing content asks confirm before overwrite.
- Switching provider in the model picker refreshes that provider’s model list immediately.

Existing-project takeover is smoother: Continue from story-level planning and Advance until writable takes over the whole book and fills preceding assets, instead of failing as a chapter-range task.

- Older projects missing a Book Contract can continue from story-level planning to fill book-level agreements, then later planning.
- Continue on the same takeover task uses the corrected whole-book takeover judgment, so you are not told a chapter range can only start from splits or chapter execution.
- After takeover reaches later stages such as volume strategy, the left flow no longer shows finished character prep as pending.

Applying a cast is faster: after you pick a cast, characters and relationships sync first so you return to the character-asset workbench sooner. Outward materials and character dynamics keep filling in the background.

- Apply no longer waits for each character’s outward materials one by one. The button leaves Applying sooner.
- New characters and relationships enter the character-asset area first so you can view them and continue character prep immediately.
- Outward materials and character dynamics arrive later. Refresh when you want to see them.

Pacing splits connect to chapter execution more directly. Split chapters link to the same execution batch. You do not keep handling Sync to chapter execution as an internal step.

- Saving a pacing split prepares the chapter-execution entry. The execution area can see the matching chapters.
- Older projects’ volume splits prefer chapter identity, then chapter order if a link is missing, which cuts same-name mismatches.
- The pacing-split page puts sync tools in connection diagnosis. The main flow focuses on pick chapter, refine, and continue execution.

### 2026-05-27

AI Cockpit continue is more reliable: when a chapter quality reminder or replan suggestion is parked, the system keeps filling the earliest chapter that still has no text, and does not treat empty chapters as already skipped.

- After Continue, quality debt binds to the chapter that actually triggered the issue and already has generated text. Later empty chapters still enter writing in order.
- Old state that mis-booked empty-chapter quality debt is cleaned on progress recalc, so the run does not jump further ahead.
- While waiting for quality repair or replan, task details prefer the real checkpoint and are not misled by stale run steps into still executing.
- Execution details and AI Cockpit show the same chapter-level progress, such as reviewing or repairing through which chapter, not only a generic batch-node name.

Auto-Director character-prep checkpoints are steadier: when a cast candidate is generated but needs confirm, the run stops at a handleable character-review point instead of being judged as execution failure.

- Cast candidates stay for you to review or apply. Task details keep guiding around Waiting for confirmation.
- Character identity, genre uptake, and hidden truth are not judged with a fixed word list or regex. That creative meaning goes to AI structured understanding and prompt governance.
- Character prep is treated as failed only when characters, candidates, and a recovery checkpoint are truly missing.

First-screen load is lighter: model config, task recovery, director follow-up, and the novel list load in stages, so several background APIs do not slow the page together.

- Provider status first shows current config and current model. The full model list loads per provider when you refresh models.
- Recoverable-task and director-follow-up counts use a lighter summary query.
- The novel list paginates, so the list page does not pull too many projects at once.

Chapter timeline extract is steadier: numeric states such as rating, score, and countdown enter continuity records reliably, so a chapter is less likely to trip repair or interrupt after finish because a structured field type did not match.

- Timeline state changes keep numeric meaning and save as readable state text when continuity records need it.
- Structured repair more clearly handles needed a string but got a number, which cuts the same output being repaired over and over.

### 2026-05-25

Auto-Director chapter-continue judgment is more reliable: it prefers real artifacts such as chapter text, review results, and state snapshots, so an abnormal interrupt is less likely to stick on old state.

- Chapters that already have text can continue from current real progress even if the old task shows failed.
- Chapters whose blocking issues are already handled do not re-enter repair because of an old Needs repair state.
- A chapter missing text or a key artifact is not treated as passed only because old state showed complete.

### 2026-05-24

Knowledge Library archive and restore are steadier: archive asks confirm first, archived materials keep source and versions, and you can restore them from the archived list.

- Archiving a knowledge document asks confirm first, so still-needed references are not pulled out of retrieval by accident.
- The Archived only list can restore and enable a document. Restore queues an index rebuild. After the index finishes, the document joins recall and RAG again.
- Archived-document details fold unavailable actions such as upload version, switch version, and manual rebuild index, and show index status as idle, which cuts mistaken clicks and misread status.
- The desktop client moves to `0.3.15` for the official installer that includes this Knowledge Library fix.

### 2026-05-22

Major update: cover generation, chapter stability, and Auto-Director recovery verified on `beta` in recent days enter mainline together, so cover prep, chapter advance, and task recovery are smoother.

- In novel-edit basic info, you can auto-assemble a cover-input draft from current title, synopsis, selling points, target readers, world mood, and story mode, then AI-optimize or hand-edit into the final image prompt. Cover generation defaults to a vertical main-image approach. Results go into this novel’s cover gallery.
- If this book has no current cover, the first successful image becomes the main cover. With a cover already, you can view candidates, switch the current cover, and delete old images. Deleting the current main cover auto-fills a new main image.
- Task Center and recovery recognize Novel cover tasks and restore to this book’s basic-info page, not an unrelated image or character entry. The OpenAI image default model also switches to `gpt-image-2`, with steadier timeout and compatibility-field handling on long image jobs.
- Chapter execution splits this-chapter overview, timeline, character dynamics, and resource risk into a clearer right workspace. The post-prose acceptance gate reviews and checks timeline in parallel. Only hooks that clearly require the next chapter to pick up immediately become hard blocks. Mid- and long-term foreshadowing stays more often as reminders.
- Auto-Director continue, existing-project takeover, and quality-debt judgment are steadier. When a chapter can continue, task state and execution range stay clear. Non-blocking reminders are not mixed into failure or the same checkpoint loop.
- Applying a cast more steadily fills outward materials. The desktop client moves to `0.3.14` for this mainline round.

### 2026-05-29

Major update: Auto-Director, chapter production, character casts, model selection, idea help, and runtime governance verified on the pre-release branch after 2026-05-24 merge into mainline, with Windows desktop `0.3.16`.

- Continue from current project is smoother: the dialog first shows volume planning, split sync, chapter refinement, writing, and quality progress, then continues from the recommended place in one click. For a continuous run you can pick Advance to chapter N.
- Taking over an existing project from story planning, character prep, volume strategy, or chapter execution recognizes real progress more accurately. Finished character prep is not shown as still pending. A chapter range is not mis-applied as whole-book pre-takeover.
- Applying a cast is faster: a manual apply syncs characters and relationships first. Outward materials and character dynamics fill in the background. The button does not stay Applying for a long time.
- Pacing splits connect to chapter execution more directly. Split chapters auto-link to execution chapters. Older projects prefer chapter identity, so the execution area is less likely to miss split results.
- The chapter production chain is steadier: quality debt binds to the chapter that actually triggered the issue and already has text. Empty chapters are not skipped by mistake. Timeline, state extract, and quality repair more steadily support later writing.
- Auto-Director cockpit state is unified: progress dialog, novel-page hints, Task Center, and execution details prefer the same cockpit state, so one task is less likely to show different progress, wait states, or a dead confirm button across entries.
- Running tasks prefer the real advancing state. Historical approval projections, chapter-title reminders, or old waiting-for-confirm info no longer show a refining, writing, or reviewing task as Waiting for confirmation.
- Let AI continue Auto-Director from this project only treats a real Auto-Director task as current. Ordinary edit-flow tasks no longer make the takeover dialog show Enter current task.
- Unfinished waiting-for-confirm reminders say Dismiss this reminder, so dismiss is not mistaken for completing or ending the task.
- Auto-Director create fits the beginner default: Prepare until writable is recommended, plus Reader-channel lean so AI can judge male-channel / female-channel reading expectations and payoff emphasis.
- No idea? beside the starting idea can temporarily generate 5 horizontal inspiration cards. Use this fills the input above. Existing content asks confirm before overwrite.
- Switching provider in the model picker refreshes that provider’s model list immediately, so you do not go to Settings, refresh, and come back.
- Home, novel list, and task recovery first screens read lighter. Model status, recovery summaries, and the novel list load in stages, so opening a page is less slowed by background APIs.
- Backend chapter runtime, Auto-Director, novel application services, event side effects, and route boundaries keep tightening. Prompt calls add quality telemetry for later long-chain generation and recovery diagnosis.

### 2026-05-28

Existing-project takeover is more like a continuation assistant. After Let AI continue Auto-Director from this project, you first see a continuation diagnosis and asset-protection notes, then you can continue from the main button.

- The default entry uses the recommended continuation place. You no longer pick a stage card and confirm a second time.
- When the next chapter and whole-book chapter count are known, you can pick Advance to a target chapter and let AI run from the current chapter through that chapter in one click.
- Created characters, volume plans, and chapter assets ask whether to keep them before takeover. Rerun and range-run controls sit in advanced settings.
- Continuation diagnosis shows volume planning, split sync, chapter refinement, prose, and quality progress. If the page has a task id, that task’s real stage and next-chapter progress lead.
- When a chapter range does not fit the current project, the error names a recoverable action and sends you back to the recommended place.
- New Auto-Director recommends Prepare until writable. Full-book autopilot can still be chosen by hand.
- Auto-Director create adds Reader-channel lean, judged by AI by default, to help payoff, emotional center, and relationship-line weight.
- No idea? can temporarily generate 3 different opening inspirations. Use this fills the input above. Existing content asks confirm before overwrite.
- Switching provider in the model picker refreshes that provider’s model list immediately.

Existing-project takeover is smoother: Continue from story-level planning and Advance until writable takes over the whole book and fills preceding assets, instead of failing as a chapter-range task.

- Older projects missing a Book Contract can continue from story-level planning to fill book-level agreements, then later planning.
- Continue on the same takeover task uses the corrected whole-book takeover judgment, so you are not told a chapter range can only start from splits or chapter execution.
- After takeover reaches later stages such as volume strategy, the left flow no longer shows finished character prep as pending.

Applying a cast is faster: after you pick a cast, characters and relationships sync first so you return to the character-asset workbench sooner. Outward materials and character dynamics keep filling in the background.

- Apply no longer waits for each character’s outward materials one by one. The button leaves Applying sooner.
- New characters and relationships enter the character-asset area first so you can view them and continue character prep immediately.
- Outward materials and character dynamics arrive later. Refresh when you want to see them.

Pacing splits connect to chapter execution more directly. Split chapters link to the same execution batch. You do not keep handling Sync to chapter execution as an internal step.

- Saving a pacing split prepares the chapter-execution entry. The execution area can see the matching chapters.
- Older projects’ volume splits prefer chapter identity, then chapter order if a link is missing, which cuts same-name mismatches.
- The pacing-split page puts sync tools in connection diagnosis. The main flow focuses on pick chapter, refine, and continue execution.

### 2026-05-27

AI Cockpit continue is more reliable: when a chapter quality reminder or replan suggestion is parked, the system keeps filling the earliest chapter that still has no text, and does not treat empty chapters as already skipped.

- After Continue, quality debt binds to the chapter that actually triggered the issue and already has generated text. Later empty chapters still enter writing in order.
- Old state that mis-booked empty-chapter quality debt is cleaned on progress recalc, so the run does not jump further ahead.
- While waiting for quality repair or replan, task details prefer the real checkpoint and are not misled by stale run steps into still executing.
- Execution details and AI Cockpit show the same chapter-level progress, such as reviewing or repairing through which chapter, not only a generic batch-node name.

Auto-Director character-prep checkpoints are steadier: when a cast candidate is generated but needs confirm, the run stops at a handleable character-review point instead of being judged as execution failure.

- Cast candidates stay for you to review or apply. Task details keep guiding around Waiting for confirmation.
- Character identity, genre uptake, and hidden truth are not judged with a fixed word list or regex. That creative meaning goes to AI structured understanding and prompt governance.
- Character prep is treated as failed only when characters, candidates, and a recovery checkpoint are truly missing.

First-screen load is lighter: model config, task recovery, director follow-up, and the novel list load in stages, so several background APIs do not slow the page together.

- Provider status first shows current config and current model. The full model list loads per provider when you refresh models.
- Recoverable-task and director-follow-up counts use a lighter summary query.
- The novel list paginates, so the list page does not pull too many projects at once.

Chapter timeline extract is steadier: numeric states such as rating, score, and countdown enter continuity records reliably, so a chapter is less likely to trip repair or interrupt after finish because a structured field type did not match.

- Timeline state changes keep numeric meaning and save as readable state text when continuity records need it.
- Structured repair more clearly handles needed a string but got a number, which cuts the same output being repaired over and over.

### 2026-05-25

Auto-Director chapter-continue judgment is more reliable: it prefers real artifacts such as chapter text, review results, and state snapshots, so an abnormal interrupt is less likely to stick on old state.

- Chapters that already have text can continue from current real progress even if the old task shows failed.
- Chapters whose blocking issues are already handled do not re-enter repair because of an old Needs repair state.
- A chapter missing text or a key artifact is not treated as passed only because old state showed complete.

### 2026-05-24

Knowledge Library archive and restore are steadier: archive asks confirm first, archived materials keep source and versions, and you can restore them from the archived list.

- Archiving a knowledge document asks confirm first, so still-needed references are not pulled out of retrieval by accident.
- The Archived only list can restore and enable a document. Restore queues an index rebuild. After the index finishes, the document joins recall and RAG again.
- Archived-document details fold unavailable actions such as upload version, switch version, and manual rebuild index, and show index status as idle, which cuts mistaken clicks and misread status.
- The desktop client moves to `0.3.15` for the official installer that includes this Knowledge Library fix.

### 2026-05-22

Major update: cover generation, chapter stability, and Auto-Director recovery verified on `beta` in recent days enter mainline together, so cover prep, chapter advance, and task recovery are smoother.

- In novel-edit basic info, you can auto-assemble a cover-input draft from current title, synopsis, selling points, target readers, world mood, and story mode, then AI-optimize or hand-edit into the final image prompt. Cover generation defaults to a vertical main-image approach. Results go into this novel’s cover gallery.
- If this book has no current cover, the first successful image becomes the main cover. With a cover already, you can view candidates, switch the current cover, and delete old images. Deleting the current main cover auto-fills a new main image.
- Task Center and recovery recognize Novel cover tasks and restore to this book’s basic-info page, not an unrelated image or character entry. The OpenAI image default model also switches to `gpt-image-2`, with steadier timeout and compatibility-field handling on long image jobs.
- Chapter execution splits this-chapter overview, timeline, character dynamics, and resource risk into a clearer right workspace. The post-prose acceptance gate reviews and checks timeline in parallel. Only hooks that clearly require the next chapter to pick up immediately become hard blocks. Mid- and long-term foreshadowing stays more often as reminders.
- Auto-Director continue, existing-project takeover, and quality-debt judgment are steadier. When a chapter can continue, task state and execution range stay clear. Non-blocking reminders are not mixed into failure or the same checkpoint loop.
- Applying a cast more steadily fills outward materials. The desktop client moves to `0.3.14` for this mainline round.

### 2026-05-21

Major update: the chapter production chain tightens further. Auto-Director and batch chapter execution more steadily distinguish continuable quality debt from replan blocks that must be handled.

- When chapter repair hits its cap but continue is allowed, quality debt is recorded first and later chapters keep advancing. Issues that truly need replan still stop and ask you to handle them.
- Auto-Director continue keeps a clear task state and execution range, so continue is less likely to drop status, mis-report a finished range, or show a non-blocking reminder as an error.
- Before the next chapter, the current final text closes the timeline. Draft pass, repair pass, and allowed skip all leave a traceable timeline result, so the next chapter is less likely to forget the previous hook or jump back to an old time.
- Writing and repair bring a fuller chapter task sheet, previous-chapter tail, and continuity context, so chapter goals, payoff, timeline pickup, and character-resource state stay aligned.
- Chapter-asset write-back and structured output are steadier on common field drift, so enum names, range fields, or sync-plan shape mismatches interrupt a chapter batch less often.

### 2026-05-19

Chapter generation is faster and steadier: the post-prose acceptance gate reviews and checks timeline in parallel, and the same chapter with the same content reuses results, which cuts repeated waiting.

- Only timeline hooks that clearly require the next chapter to pick up immediately become hard blocks. Mid- and long-term foreshadowing stays as reminders, not as a failure every chapter must solve.
- Passed, needs repair, and human-confirm boundaries are clearer. After repair passes, passed and needs-repair no longer fight each other.
- Chapter details separately show writing time, review time, and background-sync time, so you can see whether the stall is writing, review, or async write-back.

Applying a cast steadily fills outward materials: after you confirm a cast from Auto-Director or character prep, appearance, body, clothing, signature details, voice, and first-impression generate with the currently selected model.

- The character page no longer leaves outward materials empty after a cast is applied, so later chapters lack visual character info less often.
- Batch-applying a cast reuses the current task’s model settings, so fill-in tasks wait less or fall back to an unavailable default model less often.

Chapter-sync status in task details is more reliable: viewing an Auto-Director task no longer shows a recoverable hint as if the chapter were still looping foreshadowing sync or resource sync.

- Stably finished chapters do not keep appending fake Still executing hints because the details page is polling.
- When a task is only recoverable or continuable, details keep the current progress judgment and do not mix those recovery suggestions into real in-flight sync steps.

### 2026-05-18

Character prep and chapter writing add character hard-fact constraints. Identity, faction, stance, realm, and current state enter writing context before prose.

- Core casts and supplemental characters both generate full files, including personality, background, and growth, so the character editor is less likely to sit without a complete setting.
- The character library stores identity tags, faction, stance, realm / power, current location, can-appear state, and do-not-miswrite items. Chapter writing treats these as untrimmable constraints.
- Manual edits on existing characters are not overwritten by an automatic cast. Only missing fields are filled, so regenerating a character does not wipe your setting.
- Chapter-list planning intercepts too many empty summaries, consecutive passive advance, first-person long-sentence titles, missing active action, or missing stage payoff / hooks, so later generation spins in place less.

The right side of chapter execution becomes a chapter sidebar. While writing this chapter you can see this-chapter overview first, then switch timeline, character dynamics, and resource risk.

- The right dynamics bar adds This chapter overview. Status, word count, goals, pending issues, and updated time leave the timeline so chapter summary and timeline constraints are not mixed.
- The timeline area shows chapter time anchors, previous-chapter hooks, planned advance this chapter, must-not-happen-yet items, and the latest timeline check.
- Character dynamics gather character state, relationship changes, and foreshadowing from the state snapshot, so you can see what later writing will be affected by.
- Resources and risk keep this chapter’s key resources, pending resource changes, and a run-risk summary. Desktop pins this on the right. Mobile folds by group.
- Left, middle, and right are equal-height workspaces. Queue, prose, and sidebar each scroll in their own area so one column does not stretch the whole page.
- On desktop the right sidebar scrolls inside the workspace. Long timelines, dynamics, or resource risk do not push out of view.
- The right panel switches Dynamics / AI execution desk, one workspace at a time, so both dynamics and execution actions can use full right-column height.
- Overview, word count, goals, pending issues, and updated time sit in This chapter overview on the right. The middle shows prose, with less summary interrupting reading and checking.
- This-chapter overview is vertical blocks readable in a narrow sidebar, not four metrics squeezed into too-narrow two-column cards.
- Chapter details and context diagnosis move into Materials diagnosis on the right. Task sheets, scene breakdown, quality reports, repair records, and diagnosis no longer stack under the prose.

Chapter production adds timeline-constraint checks. Auto-Director writing tracks previous-chapter hooks, planned events, plot that must not happen early, and key character state.

- Before generation, a separate timeline context helps the prose pick up the previous ending, skip less foreshadowing, and cite later events less early.
- After prose finishes, this chapter’s key events are extracted and timeline-checked. Future-event leaks, unpicked hooks, time going backward, repeated events, or character-state conflicts show as timeline issues in task details.
- A chapter that fails the timeline check keeps its text and is marked needs repair. Problematic events are not written into later timeline. Auto-Director can still hand them to the existing repair path.

Turning automatic review off no longer makes auto chapter execution fail for a missing review report.

- When a chapter range chooses Do not run automatic review, that choice is an explainable skip. After prose finishes, later state submit and resource sync continue.
- Quality-check progress in execution details shows this round does not run automatic review, so 0 review reports are not read as a chapter quality-check failure.
- The desktop client moves to `0.3.13` for custom image providers, quality-repair skip, and chapter-execution stability after automatic review is off.

### 2026-05-15

When Auto-Director stops on a quality-repair / replan suggestion, you can skip this suggestion first and continue later chapters.

- The top takeover bar and execution details offer Skip this suggestion, continue the current chapter range on quality hints that need replan, which fits pushing the whole book forward first.
- Skipped issues enter quality-to-reclaim records. You can still see the chapter and reason later. They are not treated as already fixed.
- Direct quality-issue handling stays. To repair the current chapter first, you can still open the quality-repair area.

Character look images can use a custom image provider: after you fill an image model for any OpenAI-compatible provider in Settings, character-look generation can use it as an optional provider.

- A custom provider can have its own default text model and image model, which fits a local gateway, aggregator, or a service compatible with `/images/generations`.
- The character-look provider list shows enabled, configured providers that have an image model, so you are less stuck on a provider that cannot generate images.
- Local or custom compatible services can omit an API key. The saved API address and image model are used to submit image tasks.

Chapter execution names the real stall and prefers automatic repair: when prose is generated but missed foreshadowing, character appearance, or goal changes this chapter must pay, those gaps are chapter-duty issues, not a generic chapter-draft-write complete failure.

- Writing, the acceptance gate, repair, and replan share one chapter-duty contract, so planning says one thing and execution another less often.
- Locally fillable duty gaps enter automatic patch repair. Overloaded chapter duties or neighbor-chapter division mismatch become replan reasons.
- Execution details show root cause, missing duties, quality budget, and quality-to-reclaim summary, so you can tell whether the system is auto-repairing, auto-reordering, or continuing later chapters with risk.
- Old tasks entering chapter repair auto-fill the new chapter-duty context, so historical run records do not stop repair for missing new fields. Unavailable resources and overdue foreshadowing also stay in repair hints.
- The desktop client moves to `0.3.12` for chapter-execution recovery, chapter-duty repair, and structured-output stability.

Auto-Director Continue automatic chapter execution truly resumes a chapter batch: when a task stops at a chapter-execution confirm such as chapters 2–10, Continue carries chapter-range authorization into later recovery, instead of only saying success while staying at the old checkpoint.

- If recovery must first sync the execution contract or fill structured artifacts, this chapter-execution authorization is kept, then writing, review, and repair continue.
- If the previous batch already generated text but left quality reminders, Continue uses this confirm to release the current reminder and start remaining chapters, instead of looping the same quality-repair checkpoint.
- If the batch stops at a confirm that needs replan, the top takeover bar opens quality repair instead of a Continue Auto-Director button that would idle.
- Task details and the top takeover bar do not give misleading success when a command ran but the chapter-execution node is still waiting for confirm.

Auto-Director chapter repair is no longer stuck on should-advance payoff: when a chapter enters a window that should touch foreshadowing or a reader promise, that is treated as a writing duty, not as a post-write failure from a pre-generation urgent-payoff state that then loops replan.

- If prose and review already show the chapter can continue, the same urgent-payoff signal does not keep entering local repair.
- AI-driver mode stops at confirm on a notification that truly needs replan, and does not auto-confirm then immediately rerun the same chapter.

Chapter acceptance and asset write-back are steadier on AI structured output: common aliases or old field shapes normalize by structured meaning, which cuts repeated JSON repair from enum, risk, or relationship field mismatch.

- Pacing, repetition, and mid-chapter setup acceptance issues go into the correct chapter-repair category, instead of retriggering structured repair because field names differed.
- Common aliases for foreshadowing state, risk signals, relationship changes, and new-character candidates normalize at the schema layer, which lowers background asset write-back failure.

### 2026-05-14

Auto-Director chapter quality repair repeats fewer saves: when the same chapter already has text and quality repair needs a recheck, unchanged prose is not saved as a draft again, and repair switches to full-chapter repair after local repair is exhausted.

- Retrying quality repair no longer refreshes chapter updated time and background knowledge sync because the same text was saved again.
- After the same issue already tried local repair, later automatic repair upgrades by quality budget, so it stays on local repair less.

Quality-repair retry is steadier: when an AI local patch has a bad format, a location fragment that is too short, or needs to delete a repeated paragraph, it is treated as recoverable repair instead of pinning Auto-Director on the raw validation error.

- Deleting repeated prose can safely replace the unique matching fragment with empty content.
- If a local patch cannot be applied safely, the run continues with a light full-chapter repair or needs-repair, instead of turning a technical validation message into the task failure reason.

The top model picker follows the current model saved by the system. After restarting the project or opening the desktop app, the last available provider and model are restored first, instead of the frontend default returning to DeepSeek Chat.

- The current model choice saves in server settings, so a new browser cache or desktop start environment stays consistent more easily.
- With no saved current model, a candidate is chosen from configured, enabled providers that have a usable model list, not an old built-in default as the top selection.
- A provider with only an API key and no explicit model prefers a fetchable model list. If none can be fetched, Settings asks you to pick or fill a model.
- The desktop client moves to `0.3.11` for model-choice persistence and available-model restore.

Auto-Director step location and recovery hints are more consistent: the same step catalog judges current stage, waiting-for-confirm points, auto-approvable items, and write range, so different entries disagree less.

- The Auto-Director panel, task details, and auto-approval use the same step and pause-point judgment, so you can see where it is stuck and whether the next step can continue.
- Historical stages, nodes, and pause points on old tasks still recognize. You do not migrate the database or rebuild existing tasks.

Execution-details task location is clearer: old links, Task Center, the novel list, or Follow-up all recognize the same AI director run, so you are less shown a failed task while actions cannot find a retryable one.

- Continue automatic execution, retry with the task model, retry with the selected model, and follow-up actions operate the currently shown AI director task.
- Old execution-details links still open. They align to the new director-task parameters, without breaking historical notifications and task entries.

Auto-Director retry and recovery are steadier: when chapter auto-run failure, retry, and post-restart recovery interleave, the page prefers the current real task state and does not keep showing a requeued or recovering task as the old failure.

- After retry with the current model or the original task model, execution details, the top takeover bar, and Auto-Director overview align to the same AI director run.
- If the chapter pipeline paused because the service restarted, Continue or Retry restores the pending batch, then advances from the current chapter.
- The desktop client moves to `0.3.10` for Auto-Director task location, retry recovery, and progress display.

### 2026-05-13

Chapter writing returns to writing a whole chapter in one pass. Chapter contracts, scene cards, or multi-round per-scene writing no longer sit on the writing main chain, so the same chapter is less generated over and over, cost less spikes, and each scene is less written as a whole chapter.

- The writer no longer receives chapter-boundary, scene-plan, or scene-contract inputs. Chapter-contract information stays an auxiliary asset for planning, review, diagnosis, and local repair.
- Length control only gives a target length and acceptable range in the generation prompt. Prose is not force-failed or truncated because generated length exceeded a cap.
- A standing rule is recorded: chapter contracts stay off the writing hot path until a new complete plan is confirmed.

Writing starts using a lighter acceptance gate: first confirm this chapter has a writable goal, then generate the whole chapter, then one acceptance judgment decides whether prose can continue, needs a local repair, or needs human confirm, which cuts multiple post-generation checks and repeated waiting.

- Writing can start without scene cards if chapter goals and context can support it.
- Default acceptance watches continuity, characters, plot advance, reading feel, and style risk together, and hands locally handleable issues to the repair path.
- When acceptance clearly asks Repair once, only one local repair runs. Issues that need human confirm stop at needs-repair so you can continue, repair, or replan.
- Full review stays as a strict check and a manual review capability. It is no longer a required step on every chapter’s default hot path.

After a chapter finishes, asset write-back merges into one background extract: one structured judgment pulls state snapshot, character resources, relationship dynamics, and foreshadowing delta, then writes each ledger, so the same chapter text is deep-read by fewer background AI tasks.

- Background progress shows Writing assets back. Readable-prose status is no longer mixed with multi-path state-snapshot, resource, and foreshadowing sync.
- Each chapter writes a foreshadowing increment by default. A full foreshadowing reconcile runs extra only when AI judges high ledger risk or a full calibration is needed.
- If this chapter’s text has not changed, background asset write-back hits a checkpoint, so state, resource, and foreshadowing ledgers do not sync twice.
- Chapter pipeline and Auto-Director support adaptive, deferred, and strict asset-sync modes: adaptive by default, fast mode defers write-back, strict waits for asset sync before continuing.
- Adaptive mode triggers a full foreshadowing calibration every 3 chapters, at volume end, or when AI judges high risk. Otherwise it only writes this chapter’s delta.
- The chapter-execution panel separates Prose readable, Writing assets back, and Ledger calibrating, so you can read prose first, then watch background asset sync.
- Old state, character-dynamics, resource, and foreshadowing sync stay for later manual rebuild or historical data.

Empty model returns are steadier: the current chapter retries once automatically. If there is still no prose, the run stops on this chapter with a clear reason, instead of treating an empty chapter as generated and continuing.

- Manual single-chapter generate and automatic batch generate share the same empty-prose guard, so blank content is not written into chapter text.
- When auto-run pauses, chapter, task, model, and retry info are kept, so you can see which chapter got no prose and resume from this chapter.

Auto-Director candidate plans can regenerate reliably: after two plans exist, Generate two more truly starts a new candidate round, instead of treating last round’s candidates as this round already done.

- Candidate-stage runtime reuse no longer applies too early, so a background command does not error before reading the new batch.
- Generated candidates stay for recovery and compare, but manually triggered regenerate, directed revise, and title redo force this command.

The character-asset workbench makes the protagonist easier to see: the protagonist stands alone at the top of the list, and the right editor keeps saying whether you are editing the protagonist or another relationship character.

- The supporting-cast list does not repeat the protagonist, and prefers relationship to the protagonist or role positioning, so the group is easier to read around the lead.
- Current-character details add an edit summary at the top for protagonist goals, story role, relationship info, and last appearance chapter, so beginners hunt less in the materials area.
- The desktop client moves to `0.3.9` for whole-chapter writing return, empty-chapter guard, candidate regenerate, and protagonist recognition.

Asking about novel progress prefers real artifacts to judge how far the whole book has come: planning, book contract, characters, volume planning, chapter task sheets, prose, review, repair, and state submit enter one progress judgment.

- Background task success, failure, queued, or running is only supplemental status. It does not overwrite already produced novel facts.
- After a whole-book generate interrupts, the system still says which chapter prose reached, which chapters finished review, and which still need repair, so you can continue from usable artifacts.
- Asking “novel progress” or “how far did whole-book generate get” uses the same fact-progress entry: real artifact progress first, then background-task status.

### 2026-05-12

Chapter writing strengthens chapter contracts and scene boundaries: task sheet, scene cards, and chapter boundary are confirmed executable before writing, which cuts crossing chapters, revealing early, repeating advance, and old plans polluting new prose.

- Foreshadowing enters prose by stage: setup, light touch, pressure, partial reveal, payoff, or do-not-reveal. Pending or overdue foreshadowing is no longer stuffed into must-advance.
- Writing, review, and repair all receive chapter boundaries. Protected information and chapter/scene ranges that must not be crossed outrank ordinary advance requirements.
- The chapter execution contract is checked before writing. When the task sheet, scene cards, or boundary change, the chapter plan rebuilds so an old plan does not keep affecting new prose.
- With valid scene cards, the chapter prefers generating scene by scene, and passes each scene’s entry, exit, and do-not-expand to writing. The whole-chapter fallback keeps the same boundary checks.

Post-writing Anti-AI detect and automatic correct can be controlled per novel. Anti-AI rules still mainly participate as pre-generation hints. Rules-center effect tests only preview a rule’s effect and do not change novel generation settings.

- Project basic settings add Post-prose Anti-AI detect and correct, which you can turn off when you want to keep the original draft more carefully.
- Auto-Director offers the same setting. The choice at opening or takeover writes into the novel config and later manual chapter generate and auto-run follow it.
- With post-prose detect off, generation still uses bound style and Anti-AI rule hints. Only post-generation detect and automatic correct are skipped.
- The desktop client moves to `0.3.6` for the Anti-AI rules center, rule effect tests, and the post-prose detect switch.

### 2026-05-11

Anti-AI rules get their own management entry: you can view, create, and adjust rules in one place, and control which rules default into writing versus optional constraints on a style asset.

- The Anti-AI rules center filters All, Global default, Style-specific available, and Disabled, and shows type, severity, generation instruction, correction advice, and auto-rewrite status.
- New rules save as optional by default and do not automatically affect every novel’s writing. Turn on Global default separately when you want that.
- Enable, global default, and auto-rewrite switch quickly, so you can control the effective range while debugging generation.
- Effective preview shows current global-default rules, or a style, so you can confirm which style-specific Anti-AI rules writing will stack.
- The rules center adds an Anti-AI effect test: paste prose and see risk score, hits, reasons, and a revised-draft preview.
- Any rule in the list can join a test temporarily to compare one rule’s effect on detect and correct. Tests do not change enable, global default, or style binding.
- Anti-AI detect and correct are steadier: detect covers high-frequency template words, beauty templates, explaining tone, and summarizing tone across the full text. Correct does not copy example sentences from detect advice, and avoids adding hard reversals or fact clues the original did not have.
- Style Engine keeps rule binding on style assets and offers an entry into the rules center, so library management and one-style binding stay separate.
- Creating or editing an Anti-AI rule can describe in natural language what to suppress or strengthen, and let AI generate or polish an editable draft. The draft only fills the form until you check and save.
- AI-generated new rules do not enter global default and do not turn auto-rewrite on, so they can be tried as optional without affecting every novel.

### 2026-05-10

Auto-Director opening plan confirm is clearer: after book-level directions generate, candidates pop above the start-settings dialog. You do not scroll to the bottom of the form for results, and you can return to settings to view generated plans again.

- After Generate first batch, generate another round, fine-tune one plan, or redo a title group, Confirm book-level plan opens so you can compare two directions and pick one.
- Start settings keep View generated plans, so you can reopen results after closing the plan dialog without regenerating.
- While Auto-Director advances, the workbench refreshes matching content with the current step and progress. After AI writes story plan, characters, volumes, chapters, or quality results, you do not wait for a pause or a manual refresh to see the latest fill.
- Volume chapter-list generation is steadier: if the model outputs the current pacing-segment chapter list as an array, it is arranged into validatable chapter blocks for the current segment contract, so splits interrupt less from top-level JSON shape drift.
- When split titles are too concentrated in sentence pattern, AI is asked to rewrite first. If they are still not spread enough, it stays a handleable reminder instead of stopping the whole auto-advance.
- While refining task sheets chapter by chapter, finished chapters sync to chapter execution in time. Refreshing mid-way still shows refined goals, task sheets, and scene cards. You do not wait for the whole volume to finish refining.
- While Auto-Director runs, real background-task status leads. When chapter execution or quality repair is still advancing, the page no longer shows Waiting for confirmation or a dead Continue button.
- After chapter text changes, character key-resource sync rechecks from the new text and is not blocked by an old sync record. Later chapters more easily keep the latest props, clues, trump cards, and resource limits.
- The character page adds outward-material fill-in: you can generate appearance, body, usual clothing, signature details, voice, and first-impression suggestions for the current character or the whole book, then confirm onto the character card.
- After Auto-Director applies a cast, missing stable outward materials auto-fill for new or updated characters. Clear existing content is kept. Low-quality suggestions are skipped, so character prep can continue.
- Chapter generation brings a short outward summary for each participating character, preferring look/body, signature details, and voice so later prose is easier to remember.
- Outward-material generation feedback sits closer: after Fill in, progress, writable items, and confirm show under the button. You do not scroll to the bottom of the materials card for results.
- Fill-in supports an author lean: more oppressive, a little frail, a gentler voice, then AI generates writable suggestions for this character or the whole book.
- When you fill a lean, this character’s outward materials can generate suggestions that overwrite existing content. The page shows the diff and a reminder first, then saves after confirm.
- The desktop client moves to `0.3.5` for outward materials, Auto-Director split tolerance, and chapter-refinement sync.

### 2026-05-09

When the desktop client publishes to GitHub Releases, this version’s update notes write into the release-page body. Before downloading the Windows installer or portable build, you can read the main capability and experience changes in the same Release entry.

- Stable and Beta desktop publish both sync release notes after uploading packages, so the Release page is less a version number and asset list with no update content.
- Notes come from the project’s full update history and write into the matching GitHub Release with the current desktop client version, so you can confirm before download whether this version has the capability or fix you need.
- Desktop packaging reuses already finished staging artifacts for check and publish, which cuts waiting from rebuilding during publish.
- The novel preview page can copy the current chapter’s prose. Viewing a generated chapter, you do not enter the editor to copy text. If the browser limits standard clipboard permission, a fallback copy is tried automatically.
- Auto-Director chapter location while running is more accurate: entering Pacing / Split follows the chapter the background is currently processing, instead of refreshing back to chapter 1 from an old link parameter.
- Novel-list background progress is lighter: when several novels auto-advance at once, the list shows the current action from a light summary, which cuts stall from repeatedly fetching full execution details per book.
- Chapters in Pacing / Split that are not in a pacing segment can be deleted directly. Cleaning extra chapters, you do not switch to the right details panel one by one.
- The desktop client moves to `0.3.4` for Auto-Director progress display, list performance, and split-chapter cleanup.

### 2026-05-08

This update merges Auto-Director, task recovery, chapter execution, quality loop, prompt governance, and desktop-client prep that were ahead of the previous public surface into one formal release entry. The focus is making it easier for writing beginners to start from one idea and let AI keep advancing a whole-novel production chain that can start writing, continue, recover, and diagnose.

- Beginner entry is more complete: Getting started help is added, and Home, the desktop sidebar, mobile entry, novel list, and novel workbench give a clearer start path. You can finish a first book by configuring models, opening with AI Auto-Director, confirming a direction, advancing to ready-to-write, and entering chapter execution.
- Whole-book Auto-Director advance is stronger: after you pick a direction, the system can continuously prepare the story plan, character assets, volume strategy, pacing split, chapter task sheets, writing, review, repair, and state sync. Ordinary quality issues, low-risk state proposals, and repairable review issues prefer AI continuing, repairing, rewriting, or replanning automatically. Only hard boundaries such as unavailable model, service exception, protected prose, or unrecoverable risk stop for you.
- AI Cockpit becomes the unified status entry for one novel: novel page, novel list, Task Center, and execution details show the same book’s automation status, main reason, recent progress, background queue, executor status, artifact summary, recovery advice, and AI usage, so different entries disagree less on progress.
- The background execution chain is steadier: candidate generate, direction refine, local patch, title polish, direction confirm, takeover continue, recover, retry, cancel, workspace analysis, and manual-edit impact analysis gradually enter one background command and runtime. After service restart, worker interrupt, expired command, or leftover old task, the nearest safe progress is preferred.
- Auto-Director candidate-generate continue is more reliable: after a book-level candidate generate interrupts, background Continue and Retry keep the current run step, so it sticks less at 0% with a missing-executor hint.
- Chapter execution and Pacing / Split are more consistent: real chapter artifacts judge whether the target chapter has executable resources. Missing task sheet, execution boundary, or scene breakdown returns to Pacing / Split to fill first. Running a specified chapter range accepts prose completion for this range, and does not mis-report interrupt because later chapters have not started.
- The quality loop better fits finishing a whole book: chapter review, local repair, full-chapter rewrite, window replan, quality budget, quality pending reclaim, and state sync form a continuous judgment. Repair count and affected chapter window for the same issue are recorded, so the same model round is not spent over and over, and you can advance the whole book first, then handle reclaimable quality issues together.
- Prose protection and state write-back are steadier: AI-generated or AI-repaired prose is not mistaken for user-handwritten protected content. Truly protected prose stays a hard boundary. After a chapter finishes, foreshadowing ledger, reader promises, character state, and continuity facts keep affecting later chapters and necessary replan.
- Prompt and context governance upgrades: style references first clean into transferable style guidance so source-work entities do not pollute a new book. Product-level prompts for style generate, state-proposal parse, replan-window judgment, chapter task-sheet quality gate, chapter repair, and workspace analysis enter unified prompt assets and a context broker, which makes later tuning, audit, and versioning easier.
- Prompt Workbench read-only catalog and materials check are more complete: you can see each prompt’s context needs, expression slots that can be adjusted safely, locked fields, structured output, and retry / repair. You can also read materials the current prompt needs by novel, chapter, or task, and see what is ready, missing, or trimmed, so you diagnose materials assembly before later optimization.
- Prompt Workbench adds custom extra requirements: you can set global or per-novel extras for chapter writing, review, and repair. When enabled they join real generation as extra context, without covering built-in prompts, structured output, or tool boundaries.
- The prompt list prefers prompts that support custom extras, so opening management you can handle the generate paths that most often need extra style preference and review emphasis first.
- Top-right global error hints are easier to handle: the close button fully shows outside the hint card. Long errors still wrap. You can close a failure hint that stays on screen.
- Pending-recovery reminders are more controllable: after close, refresh in the same browser session does not auto-pop again. The novel-list top offers a shortcut when pending-recovery tasks exist, so you can open them when needed.
- Main dialogs share a more unified read-and-action area: recover task, continue Auto-Director, AI Cockpit, model-provider config, knowledge-document details, genre edit, and character-image preview use a unified title, scrollable content, and bottom actions, so scrolling less exposes background at the bottom or a messy button area.
- Task Center and recovery are clearer: the task panel shows quality budget, quality pending reclaim, chapter-execution summary, run projection, fail / cancel actions, and a complete-and-archive entry. Cancelled tasks enter a cancelled final state. Completed tasks can archive and refresh the reminder area.
- Startup is smoother: the frontend can first show connecting to the local creation service, then enter the workbench when the service is available, so you see fewer load errors the moment the page opens.
- Desktop client public-release prep is complete: desktop version moves to `0.3.1` for this combined public client build and startup polish. Public release still requires the desktop package version to match the `vX.Y.Z` tag.
- Desktop client version moves to `0.3.2` for the candidate-generate continue-path fix.
- Desktop client version moves to `0.3.3` for Prompt Workbench and custom extra requirements.

### 2026-05-07

Auto-Director Pacing / Split, chapter execution, and cockpit status unify further: real chapter artifacts judge which chapters still need execution resources filled. Cancelled tasks and completed reminders truly settle, so a stopped or completed old projection no longer stays pending.

- Pacing / Split and chapter execution use a complete prose execution contract to judge whether they can sync. Chapter goal, execution boundary, task sheet, and scene breakdown are all required. Manual refine of the current chapter and Auto-Director batch refine use the same fill standard, so “looks refined but failed to sync to chapter execution” happens less.
- Continue or takeover of a specified chapter range prefers restoring progress from current workspace artifacts. The historical first-10-chapters judgment closes into a general chapter-batch judgment, so old state does not treat chapter 10 as a special flow.
- Running a specified chapter range accepts prose completion for this range. After a batch such as chapters 11–13 finishes, it does not mis-report 98% interrupt because later chapters have not started.
- After Auto-Director finishes a chapter, collected foreshadowing ledger, reader promises, and character-state facts go to later sync-step judgment. At 100%, it no longer mis-reports Interrupted because the projection step cannot see facts just collected.
- Task details, the novel-page main banner, and the left AI Cockpit show the same task state. After a true cancel, the task enters a cancelled final state. Refresh no longer keeps showing Error needs handling.
- Fail / cancel buttons on execution details and the cockpit point at the currently shown real task, so you can stop the old task, see the reason, or continue from the right entry.
- After Auto-Director completes, Complete and collapse on the novel page archives this completion record and refreshes the reminder area. A completed banner is not stuck because only a historical projection remains.

### 2026-05-06

Auto-Director background commands and desktop preview builds align further: the same API process starts the director-command consume loop, so a long-novel background task does not depend on starting a second Node process. Command enqueue and the execution chain also keep simplifying, which cuts alignment cost from the old dual-track runtime tables.

- Starting the novel-creation API service automatically starts the Auto-Director background command queue in the same process as other background work such as knowledge retrieval. Day-to-day use generally needs one server process to handle queued director tasks.
- Director commands stay on one main execution chain. The old parallel runtime execution-queue table and coordinator are removed, so recover and diagnose paths are shorter.
- Candidate generate, direction refine, local patch, title polish, takeover continue, workspace analysis, and manual-edit impact analysis still share the background command chain. Run projection and chapter-execution summary on the novel page and task drawer stay as previously described.
- Planning and recovery still prefer current workspace artifacts to judge whether a step is done. After you hand-edit content, skip, continue, or backfill from existing data is easier.
- Pre-release desktop installers stay on the GitHub Releases Beta channel. To try a pre-release Windows installer, get the latest build under that page’s Beta entry.

Auto-Director task display and continue keep closing to a facts-first first-step judgment: novel page, Task Center, and task drawer prefer a unified director display state and chapter-execution summary, so different entries guessing state misalign progress less.

- Auto-Director runtime adds a unified display-build layer: first derive “where it is stuck now, what to do next” from current real artifacts and step facts, then return that to the frontend.
- Novel-page workspace, task drawer, and Task Center read director status more consistently. Switching the same task among entries, step, block reason, and suggested action stay aligned more easily.
- Waiting for confirmation, can continue, locally recoverable, and in chapter execution sit closer to real progress, instead of over-relying on old task-status fields or a single percentage.
- Chapter-execution progress derivation covers more edge cases. Single-chapter repair, state submit, and continuable range are recognized more correctly, so “looks running but has already stopped” happens less.

### 2026-05-05

Auto-Director continue, recover, takeover, retry, and cancel start closing onto one execution chain. The same run facts are read first, then the pipeline advances, which cuts idle spinning, duplicate execution, and recovery misalignment from different entries each judging state.

- Auto-Director candidate generate, candidate rewrite, local patch, and title polish become background commands. The UI submits the task first, then reads results to show candidates, so a long request blocks the page less.
- Confirm and continue while waiting for confirmation becomes an independent approval command. Policy adjustments also enter the background command queue first. After service restart or worker interrupt, the same recoverable path can continue.
- Workspace AI analysis and manual-edit impact analysis enter background commands when they need AI judgment. Ordinary light fact reads can still return synchronously, so analysis operations bypass director runtime less.
- Chapter-execution progress derives from a chapter-artifact matrix: writing, review, repair, state submit, and continuable range are distinguished. When a single chapter needs repair, it shows as locally recoverable, not as whole-book failure.
- Auto-Director step modules fill input, output check, submit, progress self-check, and recovery contracts. Chapter repair and quality repair also have independent runtime step identity, so later diagnose and recover can locate a concrete action more accurately.
- Run projection adds a chapter-execution summary. Task Center and the novel page can read lighter, more traceable status instead of guessing real progress from old task status or a fixed percentage.

### 2026-05-03

Auto-Director background running closes as a whole: long-flow tasks are managed as each novel’s own runtime. The background executor only takes time-consuming flows and does not replace the front-end interaction entry. Several novels can start Auto-Director at once, and the system schedules by current machine and model resources.

- Sidebar and Home offer a Write a whole book from scratch guide, chaining in recommended order to Creative Hub, create novel, Task Center, and novel list, and complementary with Getting started help.
- In Style Engine, Extract formula from sample and Rewrite by formula / Generate by theme prompts enter unified prompt assets, so later they can be tuned and versioned independently.

- Auto-Director takeover, continue, recover, and confirm book-level direction enter a recoverable background runtime. Each novel has independent progress, execution action, checkpoints, and event records. One book waiting or failing does not block other books.
- The background executor can process Auto-Director tasks for several different novels at once. The same novel still keeps a single active execution, so one book is not written concurrently into a state conflict.
- Writing, light review, strict review, repair, replan, and state parse control instantaneous call volume by resource type. When resources are short, the novel shows waiting for background execution or waiting for model resources, instead of limiting you to starting only one book.
- Cancel Auto-Director immediately settles that novel’s runtime, execution steps, and background tasks, instead of queuing cancel as a new long task. Other running novels are unaffected.
- After service restart or background-executor interrupt, expired executions, queued commands, and hanging tasks are scanned, and recoverable Auto-Director tasks rejoin the queue from the nearest safe progress.
- Auto-Director prefers showing each novel’s current running, taking over, queued, or waiting-for-confirm status. Historical interrupt records stay as diagnose clues, so several novels less all show Background executor connection interrupted.
- While the background executor waits for model resources, it keeps the current execution right alive. Under resource pressure it also continues from already claimed progress, so waiting for resources is less mistaken for a connection interrupt and then recovered over and over.
- The task panel and Auto-Director progress show current background execution, wait reason, execution queue, and executor info, so Takeover task submitted stays less while the terminal is actually running.
- Historical Auto-Director commands are adopted safely into the new runtime. A running command is not reset to waiting-to-run because it was re-adopted, which cuts duplicate model calls and progress rollback.
- Runtime migration is added. Historical task and command data are kept, and later Auto-Director gets a more stable base for recover, cancel, concurrency, and progress explanation.

### 2026-05-02

Whole-book Auto-Director keeps closing in, and beginner entry is clearer: ordinary quality loops interrupt beginners less. Issues that cannot be repaired for now enter later quality reclaim. First-time users can also start a first novel from Getting started along the recommended path.

- Getting started help is added. Home, the desktop sidebar, and the mobile more menu can all open it. First use can follow configure models, open with AI Auto-Director, confirm a direction, advance to ready-to-write, then enter chapter execution.
- When the desktop app has no model configured, you can open Getting started for the recommended path, then complete provider, API key, and default model in Settings, so first launch is less “what next?”
- Whole-book auto-advance that hits repeated replan or exhausted automatic repair registers the current chapter as quality pending reclaim and continues later chapters. Only hard failure, protected prose, and unrecoverable risk stop.
- Auto-Director keeps quality-loop counts, quality pending-reclaim chapters, and a summary. After Continue or Recover, the same kind of issue is not treated as a first failure again, which cuts burning the same model round twice.
- When target chapters lack Pacing / Split resources, Let AI fill chapter splits then continue is offered. Whole-book auto-advance fills executable resources first, then returns to chapter execution.
- The task panel shows quality pending-reclaim chapter range and how it will be handled, so you can see the system is finishing the whole book first, then later quality repair.
- Whole-book auto-advance records a quality budget by the same issue and the same affected chapter window. After service recover, already-tried repair and replan counts are reused, so the same class of issue is less reprocessed across chapters.
- The task panel shows this chapter’s quality-budget use: how many times local repair, full-chapter rewrite, and window replan ran, and whether the next step for the same issue is keep repairing, rewrite, replan, or enter quality pending reclaim.
- When the chapter quality loop judges can-continue, the chapter card prefers Continue next chapter or Write this chapter, so quality can-continue no longer still prompts repair.
- Ordinary state proposals during whole-book auto-advance first let AI judge auto-apply, stash-and-archive, or replan affected chapters. Low confidence, high-risk overwrite, and protected content still stop for human recover.
- Low-risk quality reminders in manual / semi-automatic modes go through explicit authorize or keep-confirm, and do not skip your choice. Whole-book auto-complete still handles ordinary issues by auto-advance policy.
- Whole-book progress and task status keep using real chapter advance, quality status, and run projection, so “background task near 99% but the book is not done” misleads less.
- Choosing AI auto-recommend into auto-advance no longer treats a new book’s placeholder volume as a real volume strategy that needs confirm. Already authorized volume-strategy and split checkpoints go straight to AI to continue.
- The Auto-Director background executor puts takeover, continue, and cancel on the same execution lifecycle. Cancel settles running steps and chapter tasks together, so clicking Continue again does not stick on Takeover task submitted.
- Auto-Director tasks distinguish Waiting for background executor, Taking over, Running, and Recovering after interrupt. When the executor starts, leftover steps settle and recoverable tasks return to the queue.
- AI Cockpit and the task panel show background-execution queue, takeover, run, and recover counts, and wait duration when a task is waiting to be taken over.
- After Continue or Recover, a queued Auto-Director task prefers Waiting for background executor. After the background starts, it switches to the real execution step, so 0% stuck on a takeover hint happens less.
- After you pick a book-level direction, the task dialog shows direction submitted, waiting to create the project, or the real execution step. It does not stay on candidate-generate results as if the direction did not take effect.
- Refreshing Pacing / Split execution resources protects already-written chapter prose. Updating task sheets, scene cards, and chapter materials does not empty existing prose.

### 2026-05-01

This update closes Auto-Director mode work into a more complete whole-book production experience: you can more clearly see which book AI is advancing, why it stopped, and what to click next. The system also continues more steadily from long-task interrupts, quality repair, chapter batches, and replan.

- Chapter quality scoring unifies as a repetition-control score: higher means less repetition and better quality. Automatic review, rule scoring, and chapter-pass judgment use the same standard, so a reversed understanding of the repetition dimension causes less wrong repair.
- The chapter quality loop starts recording the same failure signature and a repair budget. When the same issue repeats, it can recognize this is the same quality-failure round looping, and give a clear basis for local repair, full-chapter rewrite, window replan, and hard recover, which lowers burning model calls on one chapter over and over.
- Style references first clean into transferable style guidance. Character names, place names, and proper titles from the source work that should not enter the new book are extracted from the bound style. Writing only injects abstract style. If review finds source-work entities leaking, a full-chapter rewrite is triggered automatically.
- Model-call routing starts recording by layer: writing, light review, strict review, repair, replan, and state parse. With no separately configured stronger model, the current model is still used, but the usage ledger marks that route as degraded, which makes cost and quality diagnosis easier.
- Whole-book auto-advance prefers AI automatically continuing, repairing, full-chapter rewriting, or replanning for ordinary state proposals, repairable review issues, and quality suggestions. Only unavailable model, consecutive lease / database failure, protected-prose conflict, and data-safety risk stop for you.
- A failed local patch upgrades automatically to a full-chapter rewrite, then quality review runs again, so issues such as target fragment does not exist pin the whole book in chapter repair less.
- Risk hints in the chapter queue show user-facing labels such as Suggest replan and Continuity risk, instead of raw backend structured JSON.
- Auto-Director progress adds explainable fields: block reason, recommended action, whether AI can auto-recover, split progress for planning / chapter execution / quality repair, and visible risk labels. Task panel, workbench, and AI tools read the same status.
- Whole-book progress prefers continuable chapters / total chapters, and no longer shows a single background task near done as the whole book near done. The progress panel shows planning, chapter, quality, and current-action progress together.
- The chapter queue derives the next step from the latest quality loop. When a chapter rechecks as can-continue, it shows View suggestions, Write this chapter, or Continue next chapter, instead of leftover One-click repair.
- When a whole-book auto-advance task hits a worker-lease expiry, it prefers auto-requeue from the nearest safe progress. The same task enters pending recover only after consecutive failures pass a threshold, which lowers frequent manual recover on a long chain.
- The chapter-execution page and left flow sit closer to real background nodes. When prose has started generating or reviewing, the flow shows chapter execution advancing, instead of staying on Pacing / Split because of a historical checkpoint.
- After chapter repair finishes, status settles automatically. When the latest quality recheck judges can-continue, the chapter queue switches back to later actions such as View suggestions / Write next chapter, instead of still showing One-click repair on the same chapter.
- Auto-Director distinguishes AI-generated prose and user-handwritten prose more accurately. AI-generated or AI-repaired chapters are not mistaken for protected handwritten content, so Continue less repeatedly stops on confirm-overwrite risk.
- Old repair tickets expire automatically with the latest quality status. After a chapter passes recheck, historical repair tickets no longer count in the pending-repair summary, and Auto-Director is not dragged back to already-handled chapters.
- The whole-book auto-advance chapter pipeline keeps Auto-Director policy. After Continue or Recover, chapter writing continues only when there are ordinary state proposals and no hard review issues. Risks that truly need review still block, and a chapter is not left in a contradictory Generating state early.
- Auto-Director adds more complete whole-book auto-advance: after you pick a book-level direction, it can continuously prepare story plan, character assets, volume strategy, pacing split, chapter task sheets, writing, review, repair, and state sync, so beginners judge the next step across pages less.
- Each novel has its own AI Cockpit. Novel list, novel workbench, and execution details show unified status, main reason, recent progress, AI usage, artifact records, and a single primary action around the same book, so you can see where this book is stuck and what to do next.
- Task entries converge further. The left of the novel workbench keeps only a minimal status entry. Full progress goes in a dialog and execution details. Task Center keeps background history, filter, and diagnose, and is no longer the only entry to continue the current novel.
- Waiting-for-confirm entry is clearer. When Auto-Director would affect your edits or protected content, the progress dialog, execution details, and AI Cockpit all show Confirm and continue, instead of only hinting confirm in logs.
- AI Cockpit adds an automation timeline and artifact summary. You can see recent status of tasks, commands, events, auto-confirms, chapter prose, review reports, repair records, reader promises, character state, foreshadowing sync, and artifact dependencies.
- AI usage stats sit closer to real work. Calls, tokens, and accumulated call time show by stage such as chapter planning, writing, quality check, text repair, style adjust, foreshadowing sync, and character / state sync, so the whole quality loop is less mistaken for Writing.
- Chapter-execution cost converges further. Expensive foreshadowing sync, character-resource extract, state snapshot, and character-dynamics extract prefer running only after the finally kept prose is confirmed, so first draft, style rewrite, and repair draft less trigger the same sync twice.
- Local chapter repair is steadier. After exact match fails, a local patch tries deterministic whitespace-equivalent match. If it cannot uniquely hit, hits in several places, or replace has no effect, it does not force a text change; it upgrades to a full-chapter rewrite and re-review.
- Chapter-repair failure pins the whole book less. When a local patch cannot land safely, a full-chapter rewrite is tried first. Unrecoverable issues such as empty prose, save failure, or missing core structure still pause for you.
- Chapter task sheets pass a quality gate before writing. Chapter goal, execution boundary, scene breakdown, and task sheet are checked for enough clarity, so a bad task sheet entering writing causes less later rework.
- The chapter quality loop is more continuous. Light review, necessary repair, re-review, retention, continuity, and recent recap enter one judgment chain, deciding continue, local repair, rewrite, or replan.
- Replan sits closer to real story state. AI judges the chapter window to adjust from chapter goals, review issues, foreshadowing ledger, and current state. After replan finishes, later chapter batches can reconnect.
- Whole-book auto-advance adds pause protection. Repeated failure, repair failure, abnormal usage, and risk that may affect protected prose are recorded. When the same kind of issue repeats, new batches pause and recovery advice is given.
- Auto-Director recovery covers more real scenes. Service restart, expired background command, old task cancel or fail, old batch still has chapters to write, historical artifacts missing a ledger, and empty chapter prose whose status shows complete all return more accurately to a continuable place.
- After Continue Auto-Director, chapter execution rejudges real remaining chapters. An old successful-step record does not make a new batch think chapter execution is already done. When an old pipeline job fails or cancels, the binding clears and a new execution batch is created.
- Volume planning and split writes are steadier. On brief local-database busy or concurrent write, it waits and retries, so a long chain stops at pending recover less from a momentary lock conflict.
- Auto-approval authorize is clearer. AI auto-advance and AI copilot confirm use different approval boundaries: auto-advance tries to spare beginners from understanding every advanced checkpoint item by item; copilot confirm still keeps key nodes for you.
- Existing-novel takeover and recover are more reliable. Context restores from existing project assets, takeover request, run records, and artifact ledger, so Missing recovery context, or re-entering director mode after takeover and returning to candidate generate, happens less.
- Run records and ledgers are more complete. Auto-Director records run, steps, events, commands, AI usage, artifacts, dependencies, auto-confirms, and recovery advice, which gives cockpit display, task diagnose, and later Continue one shared basis.
- The novel list can also open a single-book cockpit. You do not enter the editor or Task Center to quickly see that novel’s AI run status, recent progress, and executable primary action.

### 2026-04-30

- Auto-Director adds a Whole-book auto-complete advance mode. After you pick a direction, planning, chapter tasks, writing, review, and repair prepare automatically for the whole-book range. It stops for you only on unavailable model, service exception, protected prose, unrecoverable data risk, or consecutive automatic-repair failure.
- Authorize boundaries for AI auto-advance and AI copilot confirm are clearer. Choosing AI auto-advance no longer asks beginners to understand every advanced approval item. Choosing AI copilot confirm still gives key checkpoints to you.
- The novel-workbench AI Cockpit shows progress by this book’s automation status. It aggregates Auto-Director tasks, background commands, run events, auto-confirm records, and artifact overview, so you can see what this book is doing, why it stopped, and what is next. Task Center stays the execution-details entry.
- Before chapter writing, Auto-Director checks that chapter goal, execution boundary, task sheet, and scene breakdown can be executed reliably by the writer. Whole-book auto mode hands ordinary quality issues to AI to regenerate or repair. AI copilot mode only gives checkpoints that need judgment to you, so a bad task sheet flows into writing less.
- Chapter repair is more cautious by default. It first tries replacing only a local fragment with a clear location, so ordinary review issues do not trigger a full-chapter rewrite. Full-chapter repair starts only when you choose rewrite or the system confirms a larger range is needed.
- After chapter review, handling is more continuous. Chapter retention, continuity, and recent-chapter recap summarize into one quality status, deciding continue, local repair first, or replan, so beginners judge back and forth among several quality hints less.
- AI Cockpit artifact records sit closer to the book itself. Besides tasks and events, it shows how many usable artifacts, need-recheck artifacts, protected content, repair items, and artifact dependencies this book has, and recent artifact status by type.
- AI Cockpit artifact summary hints affected chapters, need-recheck artifacts, repair records, and new-version artifacts, so you can see where quality repair and replan landed.
- AI Cockpit shows Auto-Director step time and token usage. You can see which recent steps called AI, input / output tokens per step, total spend, and approximate duration, which makes diagnosing long tasks more direct.
- Whole-book auto-advance adds pause protection. Chapter quality assessment, repair failure, repeated replan, and abnormal usage are recorded. When the same issue fails repeatedly or may affect protected prose, new batches pause and AI Cockpit gives recovery advice, so a long chain burns less in a bad state.
- When whole-book auto-advance hits a replan hint, AI first finishes chapter-window adjustment, then reconnects later chapter batches. Replan records also enter this book’s automation timeline, so you can look back at why those chapters were adjusted.
- The left AI Cockpit on the novel workbench keeps only a light status entry, so flow-step navigation has more room. View progress opens the full Auto-Director progress dialog. Task Center still carries execution details.
- The Auto-Director progress dialog adds All progress. In the same dialog you can see this task’s progress stream, shown count, and total records, instead of judging whether the task is still advancing from only the latest few hints.
- Novel-workbench top status follows book-level automation status. When background running has interrupted or is waiting to recover, the top banner, task panel, and AI Cockpit show the same status, so one task is less in-progress in one place and abnormal in another.
- Replan sits closer to current story state. It judges which chapters to adjust from chapter goals, review issues, foreshadowing ledger, and whole-book state, and explains why those chapters were chosen, instead of only rearranging a fixed window.
- Auto-Director recover first judges whether the target chapter truly has an executable range. When existing chapters leave needs-repair but later chapters still lack Pacing / Split refine, it returns to split to fill resources, instead of leaving you facing No continuable chapter-execution range and judging by hand.
- When Auto-Director background execution interrupts briefly, a safe Continue / Recover first returns to the queue and continues from the latest progress. The same task enters human recover only after repeated expiry, which cuts frequent manual intervention during long split and chapter refine.
- Continuing from pending recover first cleans expired background-recover records, then submits a new continue task, so Hinted continued but back to pending recover loops less.
- On brief local-database busy, it waits and retries volume-plan write automatically. When a task stops at pending recover, workbench and task panel both show a Continue entry, so you can find the recover action.
- After Auto-Director enters chapter-prose execution, the left flow follows the real run step and shows Chapter execution advancing. A leftover pre-write checkpoint on a historical task no longer mis-shows the step as Pacing / Split or makes chapter execution look pending.

### 2026-04-29

- Auto-Director Continue, Recover, and existing-project takeover enter a more stable background-execution mode. After Continue, the page quickly gets a submitted result, then the background keeps advancing, so a whole-page request hang and browser request pile-up happen less.
- Page refresh while Auto-Director is running is lighter. Run status prefers light progress, instead of continuously force-fetching the full volume workspace, so Task Center, project navigation, and current progress feel smoother.
- Waiting-for-confirm steps continue on a clear user confirm and only release the current pause point. Later new high-risk operations still stop for confirm, so Hinted success but stopped back on the same step loops less.
- Chapter-title repair also enters the background command queue. After you trigger repair, the page quickly confirms received. It does not run a heavy repair chain inside the request, and does not immediately force-refresh the full volume workspace.
- Auto-Director background-execution failure returns to a recoverable state faster. Running steps settle as failed together, and the task shows waiting for manual recover, so after a background command fails the page looks less still queued or running.
- When Auto-Director continues an old task, artifact-dependency records first confirm both ends are written, then save the dependency. Restoring an old task from chapter refine, split, or quality repair less often stops because a dependency write order failed.
- Old artifacts in historical run records fill into the Auto-Director ledger on recover. When an old task only saved artifacts in an early snapshot, those artifacts are filled first, then new dependencies are saved.
- Auto-Director recover is steadier under concurrent change. If the target artifact was replaced or cleaned by an update task before the dependency wrote, that expired dependency is skipped and the rest of the run record still saves.
- Recover samples recognize a later task on the same novel. When an old failed task has already been advanced by a later task to waiting-for-confirm or complete, the check demotes the old task to history, so it is less treated as the current highest-priority problem.
- Existing-novel takeover recover is more reliable. Even if the task has not yet written full director input into the run record, context continues from the original takeover request, so Missing recovery context fails recover less.
- Continue after existing-novel takeover also reuses the original takeover context. Continue, Retry, or Recover first confirms whether restore from the takeover request is possible, so entering from Continue first 10 chapters and then being told recovery context is missing happens less.
- Continue first 10 chapters recognizes your choice more accurately. Even if the old task saved a prepare-to-executable-resources mode, as long as chapter task sheets have synced to the execution area, Continue directly approves entering chapter writing, and does not stop back at waiting-for-confirm at the chapter-execution entry. Incomplete resources still return to Pacing / Split first.
- When existing-novel takeover recovers Continue first 10 chapters and target chapters still lack Pacing / Split refine, it automatically returns to split to fill the gap, instead of repeatedly stopping at pending recover for missing pacing split.
- Continue auto-run first 10 chapters: automatic review and state sync after writing follow the same confirm. After you choose a range to run, you do not confirm again between writing, review, and sync nodes.
- Existing-novel takeover first enters background analysis and a takeover task, instead of turning takeover into a long wait on the page.
- After service restart or background-execution interrupt, tasks prefer an explainable pending-recover status, so Looks running but actually paused happens less.
- Pending-recover after service restart is smoother. After Recover, the page quickly confirms the task started background recover, instead of staying long on request wait or a Recovering dialog button.
- Left flow status on the novel workbench sits closer to real Auto-Director progress. When a director task is advancing, step-complete prefers the task stage, so an old volume-strategy asset does not mark later Volume strategy / Volume skeleton complete too early.
- Auto-Director artifact-ledger recover is steadier. The same artifact or dependency prefers reusing an existing record on service restart, repeated recover, or concurrent recover, so unique-constraint conflicts and duplicate dependency edges fail recover less.
- Auto-Director planning-recover closes further. With story macro plan, book contract, character assets, and volume plan already present, it continues by real gaps, does not skip missing assets, and does not punch through a volume-strategy pause into split by mistake.
- Recovery covering old-project takeover, persisted volume-strategy restore into split, background-recover entry, and duplicate artifact-dependency recover sits closer to real use, so later Continue feels more like actual writing.
- After Auto-Director takes over an existing novel, leaving and re-entering director mode restores by the real task stage. A task already at pacing split, chapter refine, or chapter execution is not shown again as waiting to generate candidate directions.
- Continue by chapter range judges the executable range from whole-book plan, volume chapter plan, and structured catalog. It no longer treats chapters 1–10 as beyond the whole-book plan just because only a few prose chapters have synced.
- Auto-Director Continue, Recover, and the chapter pipeline more steadily reuse existing run records and artifact dependencies. Repeated clicks, continue after service restart, or the same artifact entering the ledger twice prefer reusing existing records, which cuts duplicate create, duplicate write, and dependency conflict.
- Artifact ownership on the Auto-Director runtime ledger is more accurate. Chapter writing, review, state sync, and foreshadowing / character sync only register what they truly produced, so later recover, local rerun, and expiry judgment are less misled by unrelated artifacts.
- Auto-Director recover samples get a read-only sampling check: which tasks fit takeover, pending recover, chapter-batch, and edit-impact checks can be seen quickly. If existing prose lacks a chapter-prose ledger baseline, the check marks it directly.
- Historical prose can safely get a chapter-ledger baseline. Already-tracked prose and historical chapters that truly lack a baseline are distinguished first. Fill-in only adds missing records and does not overwrite existing prose or existing ledger, so edit-impact checks start more easily from real samples.
- Chapter-batch recover uses whether real prose exists as the done basis. Even if chapter status was marked repaired or complete, empty prose still returns to that chapter to continue, so Auto-Director less misjudges the whole batch already done.
- Auto-Director write contracts unify further. Candidates, confirm-and-create, existing-novel takeover, story macro plan, book-level creation contract, character prep, volume plan, split, writing, review, repair, and state submit all pass one step-contract check, so different entries writing on their own fork recover less.
- Story macro plan and book-level creation contract split into independent recover nodes. With a story macro plan but no book-level contract, it continues from the book-level contract instead of skipping to character prep.
- Later Auto-Director work is prioritized around recovering from real books, keeping artifact records truthful, policy gates, the quality loop, state-driven replan, chapter task-sheet gates, beginner entry, and closing technical debt.
- Chapter-title generate and repair actively lower duplicate-title risk. Before split results enter later prose execution, overly similar titles in the same volume are easier to find, and a repair result that can keep advancing is given.
- Auto-Director confirm-plan, existing-project takeover, structured split, chapter execution, and recover close further into one runtime, which gives later normal-flow work a more stable recover-and-check base.
- On an existing project, Regenerate current step can clear Volume strategy / Volume skeleton and take over again. Current step cleared, waiting to regenerate is recognized as a valid state, so a temporarily empty volume plan no longer prompts a parameter-check failure.

### 2026-04-28

- Auto-Director starts closing into one runtime. New books, candidate confirm, existing-project takeover, and manual continue settle into the same run state, so later switching among automatic, semi-automatic, and manual is easier.
- When AI takes over an existing novel, it first analyzes current workspace assets, then decides how to continue. It indexes key artifacts such as book contract, story plan, characters, volumes, chapter task sheets, prose drafts, and review reports, so takeover and new-book paths split less.
- Auto-Director control policy has one entry. Suggest only, run next step, run to checkpoint, and auto-advance in a safe range share the same policy judgment. Overwriting your handwritten content enters protection. Automatic repair is allowed once by default.
- Auto-Director run status adds snapshot, policy switch, and a Continue entry. Creative Hub can later read next-step advice, switch advance policy, and continue the task through one interface, instead of calling old stage functions directly.
- The foundation that is already live is clearer, and chapter-execution and writing-quality pieces that still wait for a later split are called out, so you can see what Auto-Director already runs versus what still comes.
- Chapter execution, chapter quality repair, and Continue after existing-project takeover first pass unified policy judgment. When a task needs confirm or touches a protected range, it enters a clear pending state, so auto-advance less edits your content by mistake.
- Auto-Director run status includes a progress summary fit for the UI: current node, recent events, whether you need to act, and block reason, so Task Center and Creative Hub can later give a clear Continue entry.
- Chapter task sheets, prose drafts, review reports, and repair tickets record source, dependencies, and user-content protection status, so later auto-run can more steadily judge what is fit to keep advancing.
- Later Auto-Director work stays on one path: manual-edit impact analysis, Creative Hub, context assembly, step runtime, and quality modules keep joining the same main chain.
- Auto-Director adds a manual-edit impact-analysis entry. After you change chapter prose, it can compare the runtime-recorded prose fingerprint with current prose, identify affected chapters, related review reports, and later artifacts, and use AI structured judgment for a minimal recheck or repair path.
- Auto-Director runtime orchestration concentrates chapter execution, policy gates, run-status refresh, and waiting-for-confirm handling, so later Creative Hub and step runtime stay easier to keep stable.
- Confirm-plan duplicate-submit protection is steadier. When a task is already bound to a novel, or another confirm request is already creating the book, existing results are reused first, so a mistaken double submit less rebuilds the project or is interrupted by a mid-inventory.
- Unified Auto-Director progress starts entering the UI. The opening-progress panel, Task Center details, and novel-workbench sidebar read the same director progress: current node, whether you need to act, recent progress, and advance mode.
- Task Center adds a chapter-edit impact check. After an Auto-Director task binds a novel, you can check the difference between current prose and director records, see affected chapters, whether Continue is fit, and a suggested minimal recheck or repair path.
- Task Center adds director advance-mode switch. After an Auto-Director task enters the unified runtime, task details can switch Suggest only, Advance next step, Advance to checkpoint, or Auto-advance in a safe range.
- Auto-Director artifact records start tracking content-version changes. After chapter prose or similar content changes, review reports that depend on old prose mark Need reconfirm. Run progress also shows key artifacts entering director records, so a manual edit less reuses an old result by mistake.
- Bound world view, continuation materials, chapter task sheets, prose, review reports, and repair tasks form a more complete dependency chain. After world rules or a materials pack enter director records, it is easier to judge which chapter task sheets and repair results need reconfirm.
- Reader promises, chapter-retention agreements, continuity state, character-governance state, and recent-chapter recap start entering Auto-Director artifact records. Book-level promises, volume-level promises, chapter tasks, prose, state snapshots, and review results can be chained, so it is easier to judge whether the next chapter still has a clear reason to keep reading and a local recheck basis.
- Auto-Director progress copy is more complete. Task Center, the opening-progress panel, and the novel-workbench sidebar show next-step advice, workspace range, completed-step count, artifact-record count, protected content, and pending-confirm artifacts, so during a long wait you can still see what the system is advancing.
- Long Auto-Director steps write a runtime heartbeat while waiting. While volume plan, split, and chapter refine keep running, recent progress shows a Waiting status update, so you less think the task is stuck.
- Chapter-execution progress splits into standard nodes: generate, quality check, issue repair, state submit, foreshadowing sync, and character-resource sync. After a long chapter task finishes, you can more clearly see which step among writing, review, repair, and sync it reached.
- Creative Hub starts connecting to Auto-Director runtime. Asking current status, next-step advice, manual-edit impact, or Continue Auto-Director in the hub reads and controls the task through the unified runtime. Continue and high-automation policy first enter a confirm flow.
- Prompt Workbench gets a read-only catalog and preview base. Later UI can first view registered base prompts, configurable slot boundaries, and context blocks in the preview. Preview only shows the final send content, does not save custom overrides, and does not call the model directly.
- Creative Hub context starts organizing through one context layer. Resource bindings, recent chat, novel basic-info status, and whole-book production status enter prompt preview as standard context blocks, so later custom prompts make it easier to confirm what will affect AI judgment.
- Chapter writing, chapter review, and Auto-Director workspace analysis start sharing one context organization. Book contract, story macro plan, chapter tasks, character subset, local state, recent chapters, and workspace inventory enter real prompt calls as standard context blocks, so prompt preview and actual execution stay more consistent.
- Chapter repair brings fuller character-dynamics hints. During local repair, character duties, goals, and relationship pressure in the current volume are easier to keep, so repair less only changes the text surface and drops character drive.
- Auto-Director candidates, book-level planning, chapter writing, quality check, repair, and state sync advance by one step plan. The chapter pipeline reuses the same standard steps, so later manual buttons and Creative Hub more easily join the same execution capability.
- Auto-Director run records start landing in a dedicated ledger. Run, steps, events, artifacts, and dependencies are kept together. Later Continue, Recover, or workspace check no longer rely only on temporary notes on an old task.
- Continue or manual recover records a clear Run restored event. After you confirm recover after a service restart, task progress can say this continues from the interrupt point, instead of suddenly restarting a stage.
- Planning, split, chapter execution, and repair check existing related artifacts more strictly. When existing prose or protected content enters the affected range, policy judgment runs first, so a normal flow less silently overwrites your edits.
- Continue chapter execution re-finds the earliest unfinished chapter from real chapter results. When the chapter-execution area and pacing plan agree, existing data is not cleared. If chapter 5 is done, chapter 6 is not generated, and chapter 7 was triggered by mistake, Continue first backfills chapter 6 instead of skipping.
- Continue on a waiting-approval chapter batch is no longer mistaken for Skip this chapter and continue. Ordinary approval-continue and a recover action that may skip a review-blocked chapter after failure are distinguished, so Continue less skips the current chapter.
- After a service restart, Auto-Director interrupted by the restart enters a pending-recover hint. Still queued or running Auto-Director marks Pending manual recover, then continues after you confirm. Waiting-approval, failed, and cancelled tasks keep a human-handling boundary.
- Auto-Director recover after service restart is steadier. Manual recover judges the recover point directly from current novel assets, and no longer shows `Maximum call stack size exceeded` and stops at failed because recover judgment recursed on itself.
- When AI Driver runs chapters, a low-risk reminder that is still below threshold after quality repair records a notice and continues. One automatic repair for this chapter finishes first. If it still does not meet the bar, you are reminded to look at the result, but the whole auto-run is no longer pinned on the quality-repair checkpoint.
- When AI Driver hits a replan suggestion, it records a reminder and continues later chapters. It does not auto-run replan, and does not pause the whole flow because of a replan suggestion. The reminder is clearly marked Replan reminder recorded, so you can later look back at direction adjustments that still need human handling.
- WeCom, DingTalk, and Auto-Director Follow-up distinguish Auto-passed and Replan reminder. A replan scene no longer shows as the system already auto-passed or already auto-replanned, so you less think later chapters have already been replanned.
- Non-AI-Driver human-review paths still keep a replan checkpoint. When you choose confirm-by-stage or manual continue, a replan suggestion still stops at pending, so you can confirm first then advance.
- Opening and takeover advance settings are clearer. Default is still AI auto-advance, but approval-point items fold into advanced approval authorize. Settings also unify as approval-authorize preference, so Execution target range and Which checkpoints may auto-confirm stay distinct.
- Auto-Director Retry directly continues a failed or cancelled director task. Retry with the original model from the novel workbench or Task Center both re-enter background advance, so Shown recovered but progress stuck on the original node happens less.
- When Auto-Director on an existing project interrupts after pacing split finishes, then takeover or continue from the project page again, completed split-sync status is recognized, and Target range missing pacing split is not shown by mistake.
- Task Center and director Follow-up detail jumps are steadier inside the desktop client. Clicking the Task Center entry or follow-up details stays in the current app. When old task data lacks steps or milestones, task details show a still-viewable status, instead of one abnormal task sending the client to a black screen.

### 2026-04-27

- Model routing can now set request protocol and structured-output format per task. Different channels can separately pick Auto, OpenAI-compatible, or Anthropic protocol, and can specify `json_schema`, `json_object`, or prompt JSON, so a relay that does not support one format fails less in a row.
- Choosing Anthropic protocol pins structured format to prompt JSON. The page no longer shows native JSON options that do not apply. Illegal combinations also normalize to a usable way, so a misconfig fails fast less.
- Model-routing connectivity checks test protocol and structured format together, and keep the preference after a usable combination is found. Structured tasks prefer an already-verified combination, instead of repeatedly trying incompatible response formats at run time.
- Empty requests are guarded before they go to a channel. Empty messages, empty batches, and blank content are intercepted, so a real model-compatibility issue and a service-side empty request stay distinguishable.
- Anthropic native-protocol requests join the model-call path. After you choose Anthropic protocol, ordinary calls, structured calls, and JSON-repair calls keep the same protocol, so protocol switching causes fewer failures.
- Auto-Director WeCom and DingTalk follow-up notices retrigger when task status changes. When a task enters waiting-for-confirm, abnormal, recover, or complete, a reminder sends by channel config and delivery is recorded, so a background task stops with no notice in the collab group less.
- When Auto-Director takes over or continues from Pacing / Split, chapter execution, quality repair, and old waiting-for-confirm checkpoints reset as later nodes first. This target range re-enters pacing plan and chapter refine, and is no longer taken straight to quality repair by old needs-repair chapters.
- Auto-Director chapter-advance order is stricter. Chapters in the target range must finish pacing plan and all chapter refine before chapter execution. Chapter execution finishes writing and quality repair one chapter at a time, then advances the next, so later chapters start writing less after only part of the range is refined.
- Continue on an old task rechecks the target range from real chapter assets. Even if a historical task left a batch-ready or auto-run status, as long as any chapter in the range still lacks a complete task sheet, execution boundary, or scene breakdown, it returns to Pacing / Split to fill refine, and does not go straight into chapter execution or quality repair.
- Whole-book Auto-Director judges whether execution can start from whole-book chapter-refine completeness. Chapter prose, complete status, and extra chapters in the old execution area that disagree with the latest pacing split clean up on sync, so old chapter data less misjudges an unfinished later volume as already executable or already done.
- System settings add same-model concurrency cap and request interval per provider. A high-failure or burst-sensitive channel can rate-limit by provider. Fill `0` to keep unlimited, so the same model is less overwhelmed by too many requests in a short time.
- Volume, chapter-refine, and story-plan saves are steadier. Only changed volume-plan and chapter-refine content is updated when possible, and large volume writes, standalone story-plan writes, and Auto-Director batch-plan saves get more transaction time, which lowers “the model returned but the plan did not save, so Continue calls the model again.”
- Local and deployed database shapes stay in sync. Provider rate-limit fields, character-sync tables, and volume / workflow query indexes cover both, so a missing field or index shows up less only after an internal release.
- After a desktop upgrade, the novel database in the local data directory keeps being used. After installing a new desktop package, upgrade start does not stop on the start page because a local database address is missing.
- Knowledge-library retrieval settings fit ordinary users better. The page prefers Embedding provider, Embedding model, and vector-store connection. Collection naming, index rebuild, chunking, recall-candidate count, timeout, and background-task parameters fold into advanced config, so opening the page is less crushed by technical parameters.
- Knowledge-library Embedding providers are no longer limited to OpenAI and SiliconFlow. Available models load from configured built-in or custom model providers. You can also fill an Embedding model from an OpenAI-compatible, local, or self-hosted service.
- Vector-store connection supports filling a Qdrant Cloud, self-hosted Qdrant, or local vector-store URL directly. For a local service you can fill an address such as `http://127.0.0.1:6333`, without having to understand a full cloud-Qdrant config.
- Recent tasks in knowledge-library run status can be cleaned. Successful, failed, or cancelled index records support one-click clean, or single delete. Queued and running tasks stay, so a running index task is not deleted by mistake.
- Model-provider settings fit custom OpenAI-compatible services better. Adding a custom provider can fetch available models first, then pick a default. Local or no-secret services also configure API address and model more naturally.
- The Windows desktop packaged runtime clearly uses the desktop built-in SQLite database config, so an installer start less takes another database mode by mistake.
- The Windows desktop start page checks for a new version before entering the workspace. A blocked start also checks for updates. If the release channel already has a new version, the page prompts download, then guides restart-and-install after download finishes.
- Creative Hub top adds a still-in-progress hint. After you enter the module you can first see current capability boundaries, which fits diagnosing writing questions, discussing a plan, and light advance.
- Home and novel-list load lighter. Home prefers recent projects. The novel list no longer returns full outline, structured outline, book bible, and book contract together, so entering the page waits less.
- Volume-plan history versions open more steadily. The version list shows a summary first, then reads full content when you pick a version. Many history versions, or one very large version, stall the page less.
- The novel list adds a preview entry. You can read generated prose by chapter, see generated chapter count, total words, and chapter status, then decide to return to the workspace or edit a specific chapter.
- Home and sidebar task-overview refresh costs less. Switching pages in a short time reuses an existing overview. Background stats also read archived records less twice, so task-status hints appear faster.
- Auto-Director continuous generate of the first three chapters is steadier. Chapter prose, summary, facts, and character-timeline sync skip duplicate saves, and wait-and-retry automatically when the local database is briefly busy.
- Model pick and auto-approval preference in opening and existing-project takeover dialogs are more stable. Recovering a task, switching provider, or reopening the dialog reduces duplicate refresh and config snap-back.

### 2026-04-26

- Auto-Director opening dialog supports picking a world view directly. A new project can bind an existing world setting in start settings, so director planning follows matching rules, stage, and boundaries from the start.
- Model-routing management adds quick apply and unified save. Pick one model set, fill all tasks, exception tasks, or blank routes in one click, then save all changes once, so batch-adjusting models across tasks is less work.
- DeepSeek V4 Pro and DeepSeek Reasoner pass thinking config by the Thinking switch. When structured output is needed or thinking is off, model calls sit closer to DeepSeek’s interface capability.
- When Auto-Director enters character prep, it prefers reusing a usable cast. An already directly usable cast keeps being used. A candidate cast first passes quality judgment, then applies, so the same book generates characters twice less.
- Project license wording adjusts to AGPLv3 plus a commercial-license note. By default this version is licensed under GNU Affero General Public License v3.0. If you provide this project or a modified version as a backend to third parties as SaaS, hosted, or similar service, you need the author’s commercial license first.
- Contribution entry syncs the dual-license wording. Submitting a Pull Request, you need to confirm you have the right to submit the content, and agree the contribution may distribute with the project under AGPL-3.0-only, and may also enter a commercial license the maintainers offer separately.
- A light contributor license agreement is added. External contributors submitting a Pull Request can confirm through the CLA and PR template that they have the right to submit, and that the contribution may be used in the project’s open-source version and in a commercial-license version the maintainers offer separately.
- Character library and in-novel characters start separating reusable assets from this-book plot instances. Current state, goals, relationship progress, and chapter results in a novel do not automatically pollute the external character library, and do not automatically affect other novels using the same character.
- A novel character can save as a character-library character. Reusable setting, plot state that belongs only to this novel, and high-risk content that needs confirm are split first, so you can settle stable character assets instead of copying the whole character card into the library.
- A character-library character can import into the current novel and keep source version and reference. Later library updates only generate optional sync suggestions. You can apply, ignore, or keep this novel independent.
- Character sync adds AI-assisted judgment. Structured distinction among base identity, stable personality, this-book adapt, runtime state, and settleable growth lowers the burden of understanding complex boundaries by hand.
- Character-system next steps further clarify around character narrative posts, relationship tension, and chapter character-context packs, so a character is not only a materials card, but a long-form narrative asset that can keep entering chapter writing, review, and repair.
- After service restart, Task Center and automatic-recover prep stay less interrupted because writing-formula extract task status stays consistent with the system’s unified task-status type.
- Frontend requests in the internal web environment use same-site `/api`. Online pages still connect to the correct service when extra frontend config is missing, so opening a page less immediately shows Network connection failed.
- Auto-Director’s new version fills mobile support. Follow-up, opening Auto-Director, existing-project takeover, and auto-advance preference switch to a layout fitter for single-column reading and touch at phone width. Risk hints, validation blocks, safe repair, and primary actions are not squeezed off screen by horizontal content.
- Phone Auto-Director uses unified mobile layout rules. Follow-up, task entry, and Settings single-column reading, touch spacing, and scroll behavior stay more consistent, so the operation gap among pages is smaller.
- Mobile novel-details and creation workbench fit phone operation better. At phone width an independent workspace is used. The top shows novel title, current step, and flow recommendation. Step navigation, task progress, export, and save are easier to reach.
- Mobile Home, Task Center, and director Follow-up filters use less space. Key statuses such as auto-advance, pending, can enter chapter execution, failed, running, and queued compress into a compact four columns. Task filters and director Follow-up filters also fold into 1–2 rows, so on a phone you scan current status and keep handling the list faster.
- Mobile Pacing / Split fits touch better. Volume pick becomes compact tap. Chapter navigation and sync diffs follow page scroll, which cuts in-card horizontal swipe and nested scroll.
- Auto-Director Follow-up overview and section entries fold into the same card. All, Pending, Auto-advance, Abnormal, Replaced, and Need check can switch on a shorter page, which cuts up-and-down scroll.
- When an existing project is taken over again, range reset more accurately cleans target chapters, volume pacing, and the active execution batch. Choosing regenerate or takeover from a specified stage, planning and prose assets outside the target range are kept when possible, and old execution tasks inside the target range more clearly give way.
- Volume-split chapter-list generate fits long-chain continue better. A staged result saves after each pacing segment generates. On service interrupt or recover, already-saved chapter-list fragments are recognized, so rerunning the whole-volume chapter list from scratch is less likely.
- Long-form volume-plan chapter assignment sits closer to the whole-book plan. After the previous volume generates, later volumes are not compressed into obviously too few chapters just because only generated chapters were counted, which better fits 400+ chapter projects advancing across several volumes.
- The pacing board first checks whether it continuously covers the target chapter range. If model-returned pacing segments only cover a few chapters, skip chapters, or pad the total with overlapping segments, it retries or stops with a hint first, and does not keep taking an obviously incomplete pacing board into split.
- After an Auto-Director task cancels, model calls still waiting stop more promptly. On cancel or replacement by a new task, high-memory background steps give resources back faster, so a cancelled old task keeps consuming model calls and memory less.
- Internal PostgreSQL + MinIO publish images use matching PostgreSQL runtime dependencies, so the service does not restart over and over at start because the production image carried a SQLite Prisma Client.

### 2026-04-25

- The character workbench adds a key-resource view. Protagonist, long-term characters, and temporary characters show props, clues, identity credentials, trump cards, costs, and consumption status by different focus, so writing a long book it is easier to know what each character still holds.
- State settle after chapter execution also recognizes character-resource changes. Low-risk changes can enter the ledger automatically. High-risk or uncertain changes stay pending confirm, so important resources are not quietly changed or dropped by AI.
- Chapter writing, review, and repair context bring this chapter’s related character-resource window, so AI generating later chapters more easily respects who owns, who knows, whether it can still be used, and when it should pay off.
- Character-resource changes have an independent plan-and-verify path. Later backpack, clue, foreshadowing, and character-action constraints can keep advancing along the same ledger, instead of scattering in chapter prose or character notes.
- The novel task drawer adds a resource-change pending-confirm entry. You can see pending resource changes, source chapter, risk level, and evidence, then confirm into the ledger or ignore, without hunting pending items across pages.
- The chapter-execution page adds manual resource recheck. Character prep adds recent-chapter resource backfill. When you hand-edit prose or take over an old project, the system can recheck character key-resource changes and use confirmed results in later writing.
- The volume-strategy page adds this-volume key-resource promises. Only resources that affect this volume’s action boundary, setup, or later payoff are picked, so planning the current volume you can see what can be used and what must not be used early.
- Release flow adds a `beta` pre-release branch rule. Feature work first enters pre-release verification, then merges to `main` when stable. Finished desktop branches also pass `beta` verification before public release and branch retirement.
- Local default still uses SQLite. Deploy can switch to PostgreSQL by config. Character-resource ledger, Auto-Director follow-up logs, and writing-formula extract data stay consistent across both databases, so missing fields from local to an internal environment happen less.
- Auto-Director adds Follow-up. You can centrally view tasks that need Continue, candidate confirm, replan, run failure, or quality repair, and directly Continue, Retry, jump to handle, or batch handle.
- WeCom and DingTalk can receive Auto-Director follow-up notices. Approval, Continue, and progress changes can push to collab tools by config. Low-risk actions can also handle through a safe callback entry.
- Image assets default to staying in local files. Only when config explicitly picks `s3` or `minio` do generated images write to MinIO/S3, and they still read through the same image-access entry.
- Auto-Director long-chain stability is stronger. Start, Continue, Recover, Retry, batch handle, and volume-generate entries skip duplicate high-memory tasks for the same book and same range. If after a service interrupt a task still sits in fake-running, it is classified as abnormal or need-check, so you can keep handling it.
- Auto-Director checks unify into one rule set. Opening-range run, existing-project takeover, Follow-up actions, batch actions, and message-end callbacks first check real assets and target range, so an entry looks clickable while the backend cannot connect less.
- Auto-Director Follow-up becomes a sectioned view. Pending, Auto-advance, Abnormal, Replaced, and Need check show separately. Batch low-risk continue, batch retry, and recheck also run by section boundary, so the next thing to handle is easier to judge.
- Need-check tasks support one-click safe repair. Only low-risk status reconcile, checkpoints, progress, recover target, replacement reason, and audit / notice records are repaired. Clearing prose, rewrite, replan, candidate confirm, model switch, or content generate stop for human handling.
- When AI advance auto-passes an approval point, an audit record now exists. Follow-up’s auto-advance section shows each book’s recent auto-pass records. WeCom and DingTalk also send AI auto-passed and continued, so you can look back at what the system passed for you.
- Opening auto-run range is clearer. New Auto-Director can pick whole book, first N chapters, or first 1 volume. First N chapters defaults to 10, but checks against the whole-book plan cap, and no longer describes every range as a fixed first 10 chapters.
- Book-page Auto-Director takeover is more complete. An existing project can take over by whole book, chapter range, or volume range, and startable director nodes are limited by the chosen range, so a chapter range less starts from project setup or character prep by mistake.
- Choosing Continue existing progress on the book page keeps existing planning and prose assets, and only brings later nodes back into advance. Old director tasks or chapter pipelines in the same target range that a new task took over mark Replaced by this task, instead of looking like an ordinary abnormal cancel.
- Settings adds auto-advance preference. Choosing AI advance first brings default approval points allowed to auto-pass. Opening and takeover can still adjust per book. Unchecked approval points still stop for human confirm.
- Auto-Director regenerate first creates a pre-rewrite backup. When book-page takeover chooses regenerate, a recoverable snapshot saves before cleaning the target node and later assets. If backup fails, this rewrite stops and does not keep clearing content. Task details and milestone history also show Pre-rewrite backup created, so you can find pre-rewrite content from version history.
- Chapter batches and quality repair decide the next step by structured risk level. Low-risk repair with authorized auto-advance continues chapter execution. Replan, large-range rework, or rewrite cleanup wait for human confirm, so a high-risk content change is not auto-released.
- Auto-Director and direct volume-plan generate share cross-process high-memory protection. High-memory tasks for the same book and same range are intercepted by a short lease and return a handleable hint. Direct volume generate supports a light response, so a large volume workspace repeats less in the interface response.

### 2026-04-24

- Structured output is steadier when the model wraps real content in an extra one-element array. A safe correction is preferred first, so a slight format drift fails the whole block less.
- Chapter planning more steadily recognizes the goal field the model returns. Even if the model writes the chapter goal as `goal`, `chapterGoal`, or a Chinese “chapter goal” label, it normalizes to an executable planning goal, so writing interrupts less because the goal field name drifted.
- When a model service or relay returns an HTML error page, the hint more accurately says this is a transport or service exception, instead of mistaking it for an ordinary JSON format problem, so diagnosis is more direct.
- If model JSON is truncated or the structure is incomplete, the failure hint more clearly tells you to retry first, and when needed suggests switching to a stronger model or enabling a backup model.
- Task Center now states an Auto-Director task’s next step more specifically. After you select a task, you can see why it stopped, current priority, and the action that best fits now, instead of only a vague Continue or Retry hint.
- When Auto-Director needs Continue auto-run, ordinary recover, or retry with the current task model / routing model, you can finish it in Task Center, without first going to another page to judge which recover path to take.
- If it is currently stuck on candidate confirm, replan, or another stage that must be handled first, Task Center also gives an entry and copy closer to the current state, so “the task stopped, but I don’t know where to click next” happens less.

### 2026-04-23

- Style-create entry folds into one dialog. You can choose among Template start / Blank-AI / Extract from materials, without guessing how to create a style from different page entries.
- Extract from materials supports three sources: pasted text, knowledge-library original text, and book-analysis results. Knowledge-library original text freezes the active version as a source snapshot. Book-analysis results keep using style-and-technique analysis to generate a style.
- Creating a style from a long knowledge-library original defaults to smart sampling. Full source preview is kept, but only representative samples go to the model to learn the style, which cuts timeout, context overflow, and instability from stuffing a whole book into the model at once.
- Style-extract timeout can be adjusted in Settings. Long text or a slow model can raise wait time then retry, without editing hidden config files or restarting the service.
- Style list and editor add knowledge-library original as a source type. Historical text extract, book-analysis generate, and new knowledge-library sources show by their own source, so later tracing is clearer.
- After uploading a long novel to the knowledge library, index status sits closer to real execution progress. Even with many historical retrieval tasks, the knowledge-library page prefers recently still-updating tasks, and less often keeps a document that has already started processing as Queued for a long time.
- Knowledge-library task polling is friendlier to currently active tasks. Uploading a new document, rebuilding an index, or waiting for vector generate, the page follows the latest run status faster, so “the background is already running, the page still looks not started” happens less.
- Auto-Director recover sits closer to current real progress. On service interrupt, page refresh, or Continue again, already-generated volume workspace, chapter refine, and chapter-execution assets are checked first, then it decides where to continue, so rolling back to volume strategy, rerunning volume skeleton, or overwriting already-refined chapters happens less.
- After confirming a book-level plan, Auto-Director no longer mistakes a placeholder volume workspace for ready to enter Pacing / Split. If there is still no real volume strategy, it returns to Volume strategy / Volume skeleton first, so confirming a plan does not immediately report Please generate volume-strategy suggestions first, then generate this volume’s pacing board.
- First 10 chapters, specified chapter range, and continue-by-volume unify into the same range rule. Continuing a volume advances by that volume’s current real chapter start–end. First 10 chapters also clearly treat chapters 1–10, so Continue less quietly falls back to a default range or runs the wrong chapter segment.
- Handoff between Pacing / Split and Chapter execution is smoother. After AI generates this volume’s chapter list, whole-volume split, or chapter refine, the latest structure syncs to the chapter-execution area automatically. You are no longer asked to understand an internal generate, then sync by hand, then execute.
- Applying a character-cast plan is more controllable. If a cast still clearly mismatches the current story setting, the UI first hints risk points that need confirm. You can still apply first then fine-tune, but a problem cast no longer lands on character assets with no reminder.

### 2026-04-22

- Style detect, rewrite, and chapter writing more stably follow the latest rule version. Related AI tasks run by the style-detect, rewrite, and writing config that is actually in effect, so a rule already upgraded while the real path still references an old version, or cannot get config and interrupts, happens less.
- Style assets start unifying into a more stable style contract. Writing, detect, and correction drafts coordinate around the same narrative, character, language, pacing, and Anti-AI constraints. After you bind a style, it is easier to land the style in prose, instead of each step stating a different rule set.
- Auto-Director continue-by-volume is more reliable. Choosing to continue a volume keeps running by that target volume’s real chapter range. If the previous volume still has unfinished chapters, it stops and hints to fill the earlier volume first, instead of quietly falling back to default first 10 chapters or continuing to the wrong range.
- Character prep more easily fills a usable cast when model output is unstable. Core cast members and relationships prefer completing step by step, so the character stage less pins the whole opening flow because one structured output was incomplete.
- Background-task recover and status sync are steadier. When database writes congest, wait-and-retry is preferred. After Continue, Cancel, or Retry Auto-Director, the novel page and Task Center also sync to the current real state faster, so the UI less stays on an old task.
- Windows desktop ships a `0.2.2` fix. After importing an old `dev.db`, if the database already carries a half-finished migration record, the desktop prefers taking over existing structure, instead of freezing start by creating tables again. If you pick the current desktop library itself by mistake, it clearly asks you to pick the old web/dev `dev.db`.
- Windows installer icon and desktop runtime also stabilize together. Start menu, desktop shortcut, and system entry keep using the official app icon. The desktop development shell and packaged environment also include the `better-sqlite3` runtime, so start less reports a missing module or still looks like the Electron default shell.

### 2026-04-21

- Style extract starts organizing results around a style asset you can keep using. Executable rules, evidenced traits, a short analysis draft, and Anti-AI constraints you can keep adjusting are preferred. A large amount of low-value display information is no longer stuffed into the same heavy call. After generating a style from text, a brief, or book analysis, later edit, reuse, and bind are smoother.
- The style workbench becomes a clearer sectioned entry. Home can first show each style’s reading-feel position, rule summary, Anti-AI constraints, current preset, and high-risk fingerprints, then you decide to edit settings, run an apply test, or enter Anti-AI. When you need to re-extract, the full analysis draft is preferred, instead of only a one-line short summary.
- Style-extract task status is filled in. Task Center and related details now show current model, call count, and input / output / total tokens, and after service restart or task interrupt clearly say whether you should Retry or Recover by hand, so Looks still queued but already stopped happens less.
- Style detect and correction drafts are more reliable. Even with no bound Anti-AI rules, as long as style rules or character-expression rules still exist, detect continues, instead of skipping the whole block because one constraint layer is missing.
- Auto-Director and existing-project takeover entries also straighten together. Whether you are taking over an existing project, continuing an existing task, or need to return to the correct confirm step is distinguished more clearly, so guessing where to continue among novel page, Task Center, and dialogs happens less.
- Auto-Director wrap-up entry is filled in. After run-by-volume, run-by-chapter-range, or Continue auto-run finishes, the novel workbench now clearly shows this round is complete, and gives Enter chapter execution and Complete and exit directly, instead of keeping a finished task hung as still in Auto-Director.
- The editor-top takeover hint and the right task panel complete state also align. After this batch’s chapter execution, review, and repair all finish, it tells you you can keep writing or exit director mode, so clicking Continue Auto-Director and pulling a finished task up again happens less.

### 2026-04-20

- Chapter execution and Auto-Director handoff start preferring a lighter review and tighter context assembly. Single-chapter generate, first-10-chapter auto-run, and later repair first judge whether a full review truly needs to upgrade. Long-chain advance spends fewer tokens, and is less likely to stick mid-way because review or repair is too heavy.
- Chapter-writing context starts clipping by stage: first draft / add-on / review / repair. Volume window, foreshadowing ledger, recent-chapter summaries, and some style constraints are no longer stuffed in as a whole pack every round. Writing a long book continuously, AI more easily puts attention back on the task this chapter truly needs to advance.
- AI takeover hints on the novel editor sit closer to real status. Waiting for confirmation and Needs replan are distinguished clearly. When a chapter needs repair, you are no longer blocked outside the workbench. The result area can one-click repair. After this director handoff finishes, you can also actively exit the current director hint.
- Project-settings page pulls title-assist back beside the title field as Title quick fill. The fold below no longer repeats a title workshop; it only keeps style confirm and this-book world-boundary tidy, so opening is less disturbed by duplicate entries.
- A public-license note was added at the time; the current license wording follows the 2026-04-26 AGPLv3 plus commercial-license note.
- Historical public-version license notes are also filled in. Versions published before 2026-04-19 keep the original MIT license. Historical MIT text and a NOTICE are added in the repo, so looking back at old versions or handling historical distribution confuses less.
- Contribution entry now states submit constraints. Submitting a Pull Request, you need to confirm you have the right to submit the content, and when it includes third-party code, materials, or data, state source and license, which lowers later merge-and-publish license uncertainty.
- README adds a standalone Windows desktop entry. On the repo home you can click Releases / Latest Release to download the desktop app, and immediately see how to pick installer vs portable, how to migrate old local data, and that auto-update is still a Beta capability at this time.
- First install for source development also straightens. Default `pnpm install` now installs Web / Server development dependencies first, and no longer force-downloads the Electron desktop runtime into everyone’s first install. Only when you truly start the desktop development shell does the matching runtime pull on demand.

### 2026-04-19

- Windows desktop enters a distributable Beta stage. It can produce `Setup.exe` and `portable` install artifacts. Ordinary users no longer need to prepare Node, pnpm, or Prisma themselves, and no longer depend on a source directory to start the local writing workbench.
- Desktop start is specially closed: after click, a Chinese start shell and branded first screen show first, instead of a long white screen. If the local service fails to start, log directory, log path, and Retry are given directly, so diagnosis is more direct than before.
- The installer starts supporting fuller Windows habits. The installer lets you pick the install directory by hand. Uninstall by default does not delete user data by mistake. App body, start screen, shortcuts, and installer resources also unify to the official icon, instead of mixing the Electron default icon.
- Desktop data starts storing separately from original Web development data, but a migrate entry is added. Settings can pick an old local `dev.db` to import by hand. The desktop first backs up the current database, then takes over old data and restarts automatically, so moving from original Web local use to desktop is easier.
- When the desktop lacks model config, it no longer only gives a blank result. After start it clearly guides you to existing Settings to finish model and key config. Desktop also defaults to turning off RAG / Qdrant first-launch blocking, so the main creation flow can enter first when possible.
- GitHub Releases Beta publish and installer auto-update also connect. The installer checks Beta updates in the background, prompts download, and installs after restart. Portable stays manual update, so it does not enter auto-replace by mistake.
- Model-provider config in Settings fills image-generation parameters. Providers that support image generate can fill image model, API address, and API key in Settings. After a desktop install you do not have to go back to a hidden config file just for image capability.
- Knowledge-library config starts compatible with older `.env` usage. Old config such as Embedding, Qdrant, and retrieval parameters more smoothly joins the current Settings system after upgrade. If an old knowledge library already uses the default collection, it is less quietly switched to a new collection name after upgrade.
- At the time this shipped, knowledge-library retrieval settings and related copy became Chinese. The older English Knowledge Retrieval Settings area also folded into a more unified Chinese settings experience, so beginners diagnosing knowledge-library and Embedding parameters confused less.
- Long model names and long options display more completely in dropdowns. Search selectors try to expand width, support wrap, and keep a hover full hint, so extra-long options such as model pick are less truncated until unreadable.
- Final send Prompt preview in the character-image dialog can be edited by hand, without AI optimize first. You can edit the prompt finally sent to the image model, or let AI optimize then keep hand-tuning, so control before generate is stronger.
- Adding a custom model provider, the dialog no longer forces picking from a model dropdown that still has no data. It clearly guides filling a default model name by hand first, then refresh the model list after create, which cuts stall on first connecting a custom provider.
- Image gallery on the character list now supports deleting images directly. In the card grid or after opening a large preview, you can delete a character image you do not like, without going back to the database or cleaning files by hand. If the deleted image is the current primary, a new primary is filled automatically, so gallery status does not break.

### 2026-04-18

- Recover points for Pacing / Split and Auto-Director are finer. Completion is judged by volume, pacing segment, and chapter-refine items. After mid-fail, retry with another model, or service restart, it no longer defaults to restarting from the whole structured-outline stage.
- Whole-volume split of the current volume can continue from the first unfinished pacing segment. Already-split earlier segments are kept, so a later-half failure does not clear and rerun the whole-volume chapter list together.
- Auto-Director recover in in-volume pacing board, chapter list, and chapter refine also continues by real progress. Finished volumes, pacing segments, and refine items skip. Recover hints and Continue entries also sit closer to the current real place.
- Batch chapter-refine retry now only fills missing chapter goal / execution boundary / task sheet. If a chapter already has the first two and only the task sheet is missing, it continues from the task sheet, instead of rerunning the whole refine from scratch.
- After generate fails on the Pacing / Split page, the latest automatically saved workspace snapshot on the server is checked first. Only after confirming the server truly saved updated progress is the latest result filled back onto the current page, so a local draft is less overwritten by accident, and you less think the last run went fully blank.

### 2026-04-17

- Auto-Director, Task Center, and the novel workbench more clearly tell you which real range AI is advancing. Fixed wording such as Continue auto-run first 10 chapters closes into the chapter segment or target volume the current batch truly covers, so takeover, recover, and Continue less misjudge what will actually change.
- Workflow recover and Continue sit closer to current real progress. Finished chapters, current-stage results, and recover-point status together judge the next step, so Looks like it can continue but cannot connect to current content, or Clearly filling the later half but still showing first 10 chapters, happens less.
- The chapter editor upgrades into a more complete AI-correction workbench. The left shows this chapter’s place in the volume, pacing advice, adjacent-chapter join, and pending issue cards. Middle prose can locate an issue fragment directly. The right can start AI correction around the current fragment or the whole chapter, instead of only waiting for you to select a small span by hand.
- Prose edit supports telling AI how to change in natural language. After selecting a fragment you can say Compress this or A bit more oppressive but don’t change facts. You can also switch to whole-chapter mode and let AI, with volume tasks, chapter duties, and existing constraints, give candidate rewrites, then decide which version to accept.
- Areas on the chapter editor that depend on AI analysis add a clear loading state. Just entering the page, macro location, issue cards, and recommended tasks first show a skeleton and AI is analyzing this chapter, instead of looking blank or like an error.
- The prose editor adds paragraph numbers linked to locate. Issue cards and recommended tasks can take you to the matching paragraph. Paragraph number and prose fragment highlight together. After locate you can also cancel, which fits checking and repairing back and forth in a long chapter.
- Paragraph-selection interaction is also steadier. The hover toolbar prefers appearing next to the selection. Paragraph highlight no longer stretches text height. Locate and selection-highlight feedback better fits continuous polish in long-form prose.

### 2026-04-16

- Auto-Director, Task Center, and the editor workbench more easily continue from a real breakpoint. Recovering, can continue takeover, and needs re-handling are distinguished more clearly. After page refresh, page switch, or service restart, you are less brought back to the wrong entry.
- Whole-book advance starts judging the next step around a unified status flow. Chapter execution, state settle, background recover, and replan more often reference already-written real content and stage results, so the front already advanced while the back still runs on old status happens less.
- Chapter titles and summaries in Pacing / Split generate by the current volume’s pacing segments one segment at a time, instead of asking the model to spit tens of chapters for the whole volume at once. When there are many chapters, later-half title drift, hollow summaries, or the whole volume distorting together happen less.
- This volume’s chapter list now explicitly hangs on the matching pacing segment, and supports regenerating only one segment’s chapter block. If only one segment’s titles are not ideal, you do not rerun the whole volume; local correct is enough.
- The pacing workspace directly shows each pacing segment as Pending generate / Generating / Generated / Need retry. Filling chapters or checking pacing coverage is more direct, and better fits beginners confirming segment by segment instead of facing a whole-volume result at once.
- Top-right error hints no longer disappear automatically. On failure, structure-check issues, or abnormal model return, the error stays until you close it by hand, so you do not worry a hint vanished right after it appeared.

### 2026-04-15

- Auto-Director takeover from current real progress is smoother. The editor tells you which step you are on, and supports handing the current step back to AI. If a chapter auto-run batch is already running, Recover existing batch vs Open a new batch for the current range is distinguished more clearly.
- Status feedback in the chapter-execution area is more complete. After writing, background sync, status flow, and the result panel more clearly show whether it is writing, wrapping up, syncing assets, or waiting. Advancing several chapters in a row, it is easier to judge whether to keep waiting, keep repairing, or enter the next step.
- Structured generate and state extract are steadier. For state snapshot, character dynamics, audit, and related planning, uneven model-output boundaries, slightly long fields, or slight structure drift fail the whole step less, so long-chain auto-advance is more stable.
- The novel workbench adds export. You can export whole-book prose, and also export `Markdown / JSON` by current step or whole book, covering project settings, story macro plan, character prep, volume strategy, pacing split, chapter execution, and quality repair, which fits archive, collab, or later processing.
- AI takeover entry on the novel editor misleads less. If Auto-Director is already recovering, queued, or waiting to take over, the workbench no longer extra-inserts a panel that looks immediately reopenable. While takeover status is still loading, a clear loading state shows first, instead of looking like the entry vanished or the system stuck.
- The character-image dialog now shows the full prompt the original path truly sends to the image model, instead of only a default character description. Before generate you can more clearly see how character materials, style preset, and negative constraints will be organized.
- Character-image generate adds AI prompt optimize. Current character description can one-click convert into a prompt fitter for image generate, and switch to Chinese or English output as needed. If you generate from the optimized result, that optimized prompt is sent to the image API directly, instead of stacking original-path content on top.
- Character-image dialog interaction also straightens. Language switch, optimize button, mode hints, and long-content scroll are rearranged. On a small screen or with long content, title, close, and primary actions are less pushed off screen.

### 2026-04-14

- Chapter-execution main chain returns to generating a whole chapter in one pass. Rewrite this chapter and ordinary Generate this chapter both write the whole chapter directly, no longer split by scene first, and no longer extra-refresh the execution contract before generate. The wait path is shorter, which fits writing a complete chapter first, then judging whether to polish.
- Default automatic-repair budget for single-chapter and batch chapter pipelines also tightens to at most one automatic repair after first review, then one re-review. If issues remain after one repair round, it stops at the current result for you to decide next, instead of looping several automatic repair rounds.
- Auto-run chapter batches, on recover, continue, and progress stats, start referencing both chapter handling status and generate status. Real statuses such as Pending review, Complete, and Needs repair are distinguished more finely. Recovering an old batch less skips a chapter by mistake, or counts a chapter that still needs handling as done.
- If Auto-Director in volume split only has overly concentrated chapter-title structure, the whole task is no longer judged failed. The already-generated chapter list is kept, the issue becomes a continuable reminder, and you stop back on the current volume waiting for repair.
- Novel editor, director progress panel, and Task Center can all start Quick-repair chapter titles directly. AI uses the model currently bound to this director task, rewrites the target volume’s titles, then keeps you on the current volume to confirm results, without hunting the entry by hand.
- If an old Auto-Director candidate task lacks a candidate ID in historical data, or the last locked target plan is already invalid, it first auto-fills and restores the task to Waiting to confirm book-level direction, so a task that can still continue is less pinned on a wrong recover point.
- When an existing project reconnects Auto-Director from the chapter-execution area, it first judges whether an active batch already exists, whether it can recover directly, or whether a new batch must open for the chapter range you selected now. Takeover entry, progress label, and Continue also more clearly say whether you are recovering an old batch or continuing a new auto-run round.
- Auto-run chapter batches add Auto-review after writing and Auto-repair when review fails. You can decide whether quality check and repair keep running after prose is written. This choice only affects this batch’s post-prose handling, and does not change other sync paths.
- Batch chapter-pipeline recover also stabilizes on service restart, task recover, or mid-way reattach: remaining unfinished chapters prefer continuing, instead of skipping earlier unfinished chapters because finished chapters were filtered out on recover.

### 2026-04-13

- Foreshadowing ledger is clearer: book-level key payoffs, in-volume unpaid items, chapter-payoff links, and state snapshots unify into one canonical foreshadowing ledger. The outline page centrally shows pending reclaim, urgent, and overdue hints, so missed items are easier to check.
- Volume-plan pacing is easier to land: a pacing-board plus chapter-list workbench is added. You can view chapters grouped by pacing segment, hint unmapped chapters, and be guided to generate or fill the chapter list and refine panel.
- Chapter execution is more controllable: scene breakdown and length-budget control are supported. The execution page offers recommended next action, task-sheet / scene-card generate, review and repair entries, and shows word-count control reclaim and scene-execution feedback.
- Background advance is more visible: novel list and workspace add running hints and a progress bar, so you always know which step AI is advancing.
- Auto-Director create entry is more focused: inspiration input, key opening parameters, book-level framing quick-fill, model pick, and run mode fold into one panel. Even if the create-page overview is not complete yet, one inspiration line can let AI fill framing suggestions first.
- Plan filtering is finer: Auto-Director keeps past candidate batches, supports revising only one plan, or redoing only that title group, so before confirm-into-project it is easier to iterate the direction until you are satisfied.
- Task Center points the way more: if a director task needs return-repair because chapter-title structure is too concentrated, Open current-volume split is given directly. After fail or cancel you can also retry with the task’s original model, or temporarily switch to your selected model and keep running.
- Volume pacing and split are steadier: pacing-board generate clearly carries this volume’s target chapter count, and strongly constrains in-volume chapter numbers. If a beat sheet’s chapter span is obviously distorted at split, budget chapter count is preferred, instead of being pulled off by an abnormal span.
- Chapter-title diversity check is no longer one-cut: it first tries to spread the whole title batch automatically. If semantics are already usable but title structure is still concentrated, results are kept first and the issue becomes a clear reminder, so you can keep advancing then return-repair the current volume.
- Structured generate compatibility is better: models such as DashScope / ModelScope Qwen fail a whole planning step less from thinking / JSON boundaries. Book analysis and opening guidance also truncate less early from a default cap when tokens are not explicitly limited.

### 2026-04-10

- The chapter editor can now enter a standalone prose page from the workbench. After selecting a paragraph you can start AI rewrite immediately, see candidate diffs first, then accept, reject, or retry, instead of overwriting the original directly.
- Chapter-edit experience is more focused: prose, candidate results, and confirm fold back into one edit path. The workbench keeps the original chapter-execution entry, and no longer mixes with polish editing.
- If Auto-Director stops at Waiting to confirm book-level direction, the novel editor no longer pops a fake Already advancing in the background success. You are taken back to the book-level direction confirm entry, pick or correct a plan first, then continue the later main chain.
- Related Continue buttons on Home, novel list, Task Center, and novel editor now align with this status. At this pre-approval point, the button clearly becomes Continue confirming book-level direction or Go confirm book-level direction, so you less think the background already kept running.
- If an old task leftover dirty state is Candidate direction not confirmed, but already hung on the editor recover entry, it also auto-corrects back to the create-page director confirm flow, which cuts task-entry misalignment and Looks like it can continue but will not actually advance.
- If a batch chapter pipeline already finished and only some chapters are below the quality threshold, generated results are kept, and this is marked Complete, some chapters need recheck, instead of judging the whole batch failed.
- Task Center now shows this kind of result reminder separately, so you can see whether this is complete-with-reminder or a true failure. Auto-Director can also reconnect later handling when a chapter batch is waiting for confirm, without guessing among complete, failed, and pending continue.
- If in Generate book-level plan the model also outputs title options, the prompt and check align four fixed style labels, and normalize common case, hyphen, or Chinese wording. Using Kimi 2.5 for book-level planning, structured-return tolerance is also steadier, so Auto-Director less interrupts at the first step from a model-output boundary.
- Auto-Director character prep now generates one core cast that can auto-save, instead of several candidates then internal guessing. If this cast still carries function-slot character names, lacks a protagonist anchor, or cannot support long-form advance, it stops at the character-review point first, so a bad cast is not taken into volume plan and split.
- When Auto-Director recovers mid-way, if the task has actually entered story macro planning, expired leftover candidate-stage status is cleared automatically, and old waiting-to-pick-direction traces no longer mislead back to the wrong entry.
- Structured generate is steadier when content length exceeds a schema limit. Results such as book-level plan or character cast that are semantically correct but slightly long prefer keeping valid content and continuing, so slightly long model output less loops repair or fails the whole step.
- Character-cast and relationship diagnosis on the character workbench is arranged as an independent component. Expand state is more stable, so later filling characters, checking gaps, and sorting relationships less collapse again because the panel refreshed.

### 2026-04-09

- World views can now delete directly on list cards and the workbench page header, without first going back to another page to find the entry. Delete has a clear confirm, then the list refreshes automatically, which is smoother when cleaning trial worlds or abandoned settings.
- At the time this shipped, Generate story engine / Build constraint engine / Save edits / Regenerate field / Status loading hints on the story-macro-plan path unified to Chinese, so an English success toast no longer suddenly popped in a Chinese UI.
- Task Center, Home, and novel list state Auto-Director display status / latest healthy stage / block reason / suggested continue action more plainly. After service-restart recover, Recovering shows clearly instead of looking already failed. Continue button copy also follows the current checkpoint.
- After Auto-Director recover is stronger, misaligned status such as actually already at a later stage but still hung as queued, or a still-running task having its entry stolen by an old visible record, happens less. The currently truly active director task is preferred, and common stale checkpoints auto-correct.
- The Pacing / Split workbench now distinguishes chapter refine as Pending refine, Refining, or Refined. If you re-sync volume plan while keeping existing content, original chapter execution status is kept when possible, so an already-advanced chapter resets less by mistake.
- If Auto-Director hits structured-output failure at Generate book-level plan, the task marks failed directly, instead of staying long at `10%` looking still running. The candidate stage also records currently bound model and recover context into task info. Task Center more accurately shows the model this director actually bound, and can keep connecting this step after service restart.
- Task Center no longer mixes internal trail tasks left by chapter live generate into the global task list. While the same book runs Auto-Director or a batch run, extra misleading Chapter X generate running cards no longer appear.
- When the novel list exports prose, the file name prefers novel name + export time. Even if a download response header is eaten by a proxy, the frontend falls back to the same rule, so exporting several copies in a row is easier to tell apart by version.
- Model-routing in Settings no longer only asks whether it can connect. Ordinary connectivity and structured calls are diagnosed separately. Which structured strategy is in use, whether thinking is force-off, and whether a structured backup model can take over all show directly, so diagnosing why this provider can chat but cannot produce stable JSON is much more visual.
- Structured tasks add a global backup-model config. If the current model has native-JSON incompatibility, thinking-content pollution, JSON truncation, or structure mismatch, a more conservative structured strategy is tried first, then it switches to the backup model by config. Paths that depend on structured output such as planning, titles, genre generate, and book analysis no longer pin so easily because one model is unstable.
- The model picker now only shows providers that are configured, enabled, and truly have available models. If there is still no runnable model, it clearly asks you to fill config in Settings first, instead of mixing a pile of actually unusable providers in the dropdown for trial-and-error.
- Book-analysis task status and failure hints sit closer to real execution: as long as the background still has a heartbeat, Task Center no longer long mis-shows a book analysis that is already running as queued. Structured-output errors also try to translate into easier-to-read failure reasons. Book-analysis itself also strengthens Chinese chapter recognition, reader-signal / weakness-signal extract, and overview-analysis structure, so a recap more easily shows where this book is strong and where it is weak.

### 2026-04-08

- Model settings now built-in support MiniMax. You can configure API key, model, and connection like other mainstream providers, without treating it as a generic compatible interface by hand.
- Each model-provider card adds an independent Thinking switch, on by default. If you only want final prose and do not want thinking content in the UI, you can turn it off per provider.
- For return formats such as MiniMax M2.* that mix thinking into prose, separate-and-clean happens automatically. After thinking display is off, the prose area no longer leaks content such as `<think>`.
- In the chapter-execution flow, after Generate execution plan first, this chapter immediately advances to writable-prose status, and UI hints refresh together. You do not guess where to click next. After the plan is out, Write this chapter can continue.
- After chapter prose live output ends, it clearly switches to Wrapping up instead of still showing Writing. Saving draft, audit, and state sync are marked as wrap-up separately. The chapter queue also more accurately switches to pending review or needs repair, so you less think prose is still unfinished.
- Auto-Director on new novels and taking over existing projects is no longer fixed to only first 10 chapters. Besides default first 10, you can specify a chapter range, or let AI keep auto-running by whole volume.
- After you pick an auto-run range, pacing board, split, chapter refine, and later writing prepare by the volume those chapters belong to. Task panel, director progress card, takeover hint, and Continue also directly show a real range such as Chapters 11–20 or Volume 2, instead of always writing first 10 chapters.
- Status badges in the chapter-execution queue add plainer copy. After entering confirm, First run review vs Confirm results directly is distinguished more clearly, so a round already reviewed is less clicked as full review again.
- Exporting a novel, the export file name automatically includes a timestamp. Exporting several copies of the same book in a row, old and new versions are easier to tell apart, and a later export less overwrites the previous one.

### 2026-04-07

Major update: the novel-creation page starts closing toward a long-stay workbench that beginners can also start using directly. The workspace more clearly tells you which step you are on, what to do next, and how to return to an earlier state if you click wrong.

- The novel editor adds a more stable step-guide bar that pins current step, flow progress, Previous / Next, and version-history entry. After a beginner enters the workspace, they do not first study the whole page of cards and side content; following the currently recommended step is enough.
- Each creation stage starts folding low-frequency information by default. Project overview, volume-count strategy review, batch config, quality reports, and chapter-context diagnosis expand on demand. The main area prefers keeping what you most need to operate now. The first screen is easier to understand, and better fits long-stay writing.
- The chapter-execution page further closes into Current most-recommended action + prose main area + chapter-details fold. Task sheets, scene breakdown, quality reports, repair records, and context diagnosis no longer default to filling the page. Advancing chapter by chapter, the button you should click is easier to find.
- On the right Current most-recommended action, primary and extra buttons now align to full row width. Entries such as Generate execution plan first no longer sit as a narrow button jammed in a whole column of actions. Which step to click now is more visual.
- Version history and chapter-recover entries also sit closer to the actual writing object: the version page no longer shows raw snapshot data first, and prefers a readable summary and recover actions, so going back to repair earlier chapters it is easier to find a fitting version.
- AI-involved operations such as title quick fill, book-level framing auto-fill, volume-strategy suggestions, character fill-in, chapter refine, and batch quality check now all carry an `AI` mark. When you want the system to do it for you, you do not guess which buttons call AI.
- Generate style from book analysis on the book-analysis page now clearly shows Generating. After it finishes, it jumps to Style Engine and selects the new style asset directly, so you no longer confirm back and forth whether the request started and which asset to find after the jump.
- After entering the novel-creation page, you can switch to dedicated creation-workbench navigation. The left pins this work’s creation steps, flow position, and task entry. Stage switch no longer depends on large cards at the top of the content area.
- The top becomes a lighter context bar that only keeps novel name, current step, and necessary flow hints. The prose first screen gives more height, so chapter planning, split, and execution more easily focus on current content.
- Creation navigation now distinguishes Where I am viewing and Where the AI flow has advanced, and adds clearer current-state highlight and contrast, so you less cannot see or cannot tell the current tab.
- When Auto-Director takes over first-10-chapter auto-run, if the background already has an active pipeline for the same range, it prefers reattaching the main task whose progress is further ahead, so duplicate batch tasks fighting each other, or an old reference topping new progress, happens less.
- When Auto-Director reattaches this kind of existing first-10-chapter pipeline, it also actively pulls that still-active task up again. If before only a queued / running record still hung in the database while actual execution had already stopped because of restart or an old process exiting, Looks reattached successfully but never advances again happens less.
- Task Center’s global list also tightens dedupe: a matching chapter pipeline hides only while the outer workflow still acts as proxy. If the outer workflow already failed or cancelled, the underlying pipeline shows directly again, so diagnose and retry paths are more visual.

### 2026-04-06

Update: Auto-Director Continue, viewing status, and wrapping up while writing are smoother. Token use also starts showing directly on the task panel and novel list, so diagnosing why spend is fast does not rely on guessing.

- After Auto-Director continues from First 10 chapters paused pending wrap-up, page status sits closer to real progress. Misaligned hints such as chapters actually kept running but the top still hangs Paused / Execution abnormal converge clearly, so judging whether to continue, wrap up, or wait is easier.
- During AI takeover, the novel-creation page no longer uses a whole-block overlay to lock chapter execution, quality repair, and similar areas. You can still see top director status and next-step hints, but the workspace below can be entered and operated, so The system told me to repair, but the UI cannot be clicked at all happens less.
- Task drawer, Auto-Director progress panel, and Task Center now all show accumulated input tokens, output tokens, total tokens, and call count. Diagnosing why one director run was especially expensive, whether it ran many rounds or one round’s context was huge, is more direct.
- Novel-list cards also show each novel’s accumulated token use. The count prefers novel-level task totals, and avoids counting a chapter pipeline already hung on an Auto-Director task twice. Wanting a quick look at which book spends the most tokens, you do not enter details one by one.

### 2026-04-02

Major update: Auto-Director no longer only advances a new project to ready-to-write. It also supports taking over an existing project, and can keep auto-running writing, review, and repair for the first 10 chapters.

- Auto-Director candidate stage becomes a more complete book-level plan generate flow: it first tidies project settings, aligns book-level framing, then produces two whole-book directions and matching title groups. If you already lean to one, you do not redo the whole batch. You can let AI fine-tune only that plan, or redo only that title group.
- An existing novel can now be handed to Auto-Director takeover explicitly. Readiness of story macro plan, character prep, volume strategy, and structured outline is judged first, then it takes over from a fitter stage, so already-half-done work is less wasted by only being able to start over.
- After Auto-Director advances volume 1 to ready-to-write, you can choose to let AI keep auto-running the first 10 chapters. The editor shows running, pause points, and recover entries together, and when needed takes you directly to chapter execution or quality repair.
- Auto-Director long-running stages now explicitly show substeps such as tidy context, generate pacing board, split chapter list, and calibrate adjacent-volume join. If one step waits long, task copy keeps refreshing waited duration, so Looks stuck but is still running costs less to judge.
- Novel pipeline tasks now keep refreshing in-chapter heartbeat and stage progress. Even if chapter 1 has not fully ended, Task Center no longer stays long at `0%`, so judging whether it is generating, reviewing, or repairing is easier.
- If the service restarts while a chapter pipeline is running, unfinished batch tasks try to recover automatically and continue from unfinished chapters, instead of silently leaving the whole task Running with no actual execution.
- Cancelling an Auto-Director-started chapter pipeline in Task Center also stops the outer Auto-Director task together. After cancel, the task immediately shows Cancelled, so Clicked cancel but the UI still keeps running happens less.
- Knowledge indexing now auto-tightens chunk budget by the current embedding model’s per-item input cap. Models such as `BAAI/bge-large-zh-v1.5` with a 512-token hard limit no longer report `413 input must have less than 512 tokens` just because one chunk is too long.
- Chapter execution and review strengthen participating-character recognition, layered context, in-volume title diversity, and recap hints. Continuous auto-advance of the first 10 chapters less often misses characters, uses overly similar titles, or lets review results spin empty.
- Auto-Director character prep prefers producing people who can enter prose directly, instead of function slots such as mystery catalyst or mentor post. If the cast is still abstract, lacks an identity anchor, or is not fit to save, it stops at the character-review point first, instead of polluting later volume plan and split.
- Character assets, character candidates, and extra characters now all carry a gender field. The character workbench can also view and edit it directly, so later character planning, relationship judgment, and display info are more complete.
- Local start is also steadier: the development environment defaults to LAN-accessible. Port-wait checks `127.0.0.1`, `localhost`, and `::1` together, so The service actually started, but the start script is still waiting happens less across systems.
- Model access adds a more general OpenAI-compatible entry: besides keeping existing built-in providers, you can add a custom provider in Settings, filling provider name, API URL, model name, and optional API key, to connect a local model gateway, self-built relay, or third-party compatible API. These custom providers appear together in model config, connectivity test, and model routing, without waiting for one-by-one built-in adapters.
- Knowledge-library document upload is no longer fixed at 2MB on the frontend. As long as it is still a `.txt` document, larger materials text can import directly, which better fits importing a whole setting, long book-analysis results, or a tidied world-view document.
- Knowledge-library Tasks and health now shows retrieval health inside the page. When the vector store is not configured, Qdrant is unavailable, or the health check returns `304/503`, error toasts no longer pop repeatedly. The latest status is kept with a clear explanation, so diagnosing config does not interrupt current work.

### 2026-04-01

Major update: model-provider cards in Settings can now view balance directly, and support instant refresh for connected providers, so switching models and filling a key it is easier to judge whether generate tasks can keep running.

- Provider cards on the model-settings page add a balance block. After the matching API key is configured, you can see current available balance, last refresh time, and some providers’ breakdown quotas, without leaving the system to each console to confirm back and forth.
- DeepSeek, SiliconFlow, and Kimi now support refreshing balance directly on the card, which fits quickly confirming whether quota is enough before a long director run, batch split, or chapter generate.
- The Qwen card now clearly hints that the system currently stores a DashScope API key and cannot read Alibaba Cloud account balance for now, so Cannot query is less mistaken for an API fault.

### 2026-03-31

Major update: Auto-Director opening upgrades to an opening flow that can keep recovering, review by stage, take over explicitly, and retry with another model, instead of a one-shot batch that loses status sense after it finishes.

- Auto-Director opening adds two advance modes: you can go straight to first 10 chapters ready-to-write, or stop to review at key stages such as character prep and volume strategy, which better fits beginners watching and confirming as they go.
- Re-entering the same book, it keeps recognizing whether this book is still in Auto-Director, and gives unified AI-takeover status, stage hints, review entry, and area lock on create and editor pages, so manual edits conflict with background results less.
- Character prep becomes a formal stage. Only after character assets and chapter resources truly land does it hint Can enter chapter execution, so an empty earlier step less false-reports already ready-to-write.
- After Auto-Director fails, Task Center both keeps abnormal status and supports Retry with current model directly. After switching the top-right model, the new model config can write back to the task and continue from the nearest checkpoint.
- Switching to Kimi K2 / K2.5 series models, structured-generate paths such as volume planning auto-converge parameters by model requirements, and no longer error directly from temperature incompatibility, so switching providers is smoother.
- The novel editor adds an in-page task panel. You no longer jump to full Task Center just to see Auto-Director progress and errors. You can stay on the current page to view status, nearest checkpoint, bound model, and finish Continue, Cancel, or retry with another model.
- Auto-Director task stage steps show in sync with current real progress. In-volume actions such as Pacing / Split refining no longer mis-show as a whole column pending in the task panel.
- Planning prompts strengthen structured-output examples, project context, and volume-skeleton constraints. Volume planning, layered plans, and structured results are more stable, and sit closer to selling points and commercial position in project settings.

### 2026-03-30

Major update: novel create, Auto-Director, volume split, chapter execution, and Task Center start joining one whole-book workflow. AI Auto-Director also upgrades toward an opening-director mode, instead of writing the later half of the whole book dead in one breath.

- Task Center adds a novel main-workflow view: from create, Auto-Director, story planning, volume split, to chapter execution, this book is folded into one main task when possible. After leaving the page you can also keep recovering from a checkpoint.
- AI Auto-Director upgrades to a flow closer to long-form opening: first two book-level directions, then auto-advance to Book Contract, story macro plan, volume strategy, volume-1 pacing board, and first-10-chapter refine. After confirm you can enter a truly writable state faster.
- Titles in director plans are no longer only a temporary name generated along the way; an extra title-workshop enhance runs. Each plan can also switch several title candidates directly, so Good story direction but the name is too plain happens less.
- Current-volume chapter refine supports generating by consecutive chapters, currently visible chapters, and whole-volume batch. The chapter-execution area also starts collecting Write this chapter as the primary action. When an execution plan is missing, it prefers auto-filling first.

### 2026-03-29

Major update: genre and advance-mode duty copy pull further apart. The title workshop starts actively lowering same-batch candidate repetition. Volume split and the chapter-execution area also add more generate-can-land, can-see, switch-steadily protection.

- Novel basic info, genre management, advance-mode management, and related entries uniformly strengthen naming and explanation copy. It is easier to tell that genre base owns world and shelf position, and advance mode owns payoff delivery and advance logic.
- The title workshop starts checking field contract, sentence skeleton, and candidate distribution together. A batch of titles that all look alike, with almost the same score labels, appears less easily. Candidate diversity is more stable.
- If the current-volume pacing board already schedules later chapters, regenerating this volume’s chapter list auto-fills the needed chapter count. Clicked generate but later-half chapters never truly expanded false-complete happens less.
- The chapter-execution area now isolates streaming prose by the currently selected chapter. Switching chapters no longer mis-shows another chapter’s still-generating content on this one. The main writing area’s information hierarchy also better fits continuous writing.
- Join hints between chapter list and pacing board are plainer. Related garbled-text issues are also cleaned. Generate-path structured-output compatibility is steadier at pacing board, adjacent-volume rebalance, and split.

### 2026-03-28

Major update: the volume workbench further tightens into a stable path of volume strategy first, then pacing board, then split, then refine. Chapter writing also starts uniformly taking book-level constraints, volume mission, and this-chapter tasks, so long-chain creation is steadier.

- Earlier steps now lock clearly. Once volume skeleton, volume summary, or chapter list changes, expired pacing board and rebalance suggestions also clean automatically, so old results less keep polluting later generate.
- The structured chapter workspace adds Current-volume chapter list. You can first see which chapters are refined, then fill goal, boundary, and task sheet chapter by chapter. When conditions are not met, the stuck point is hinted directly.
- Chapter-prose generate starts sharing layered writing context, more steadily keeping selling points, first-30-chapter promises, volume mission, adjacent-volume window, and this-chapter tasks, which cuts character drift, pacing unfocus, and opening repetition.
- The chapter-execution page further closes into a three-column main path. Streaming output and already-saved prose also merge into the same result area, so advancing chapter by chapter is smoother.

### 2026-03-27

Major update: the volume workbench upgrades to a Volume strategy / Volume skeleton / Pacing / Split workflow closer to serialized web novels. It first helps you judge how to split volumes, which volumes should hard-plan, and which should keep elasticity.

- Volume-strategy suggestions and Volume-strategy review are added. They first recommend volume count and planning strength, then generate a volume skeleton fitter for long serialized work, so the later half of the book is less written dead at the start.
- Before split, a pacing board first clarifies opening hook, upgrade nodes, and volume-end hook, then expands the chapter list. Chapter planning more resembles real keep-reading rhythm.
- Single-volume regenerate and structured planning start keeping volume strategy, pacing board, review results, and adjacent-volume rebalance suggestions. Old projects can also keep using them directly, without rebuilding by hand.
- Sidebar navigation, long-request waiting, model search, and large JSON-repair paths also optimize together, so long creation and structured generate are both smoother.

### 2026-03-26

Major update: novel basic info adds a genre-mode control axis. The character area adds Extra characters. Product-level prompts also close into one prompt registry, so AI from planning to review starts collaborating on the same standard.

- A standalone Genre mode assets page is added. You can pick or customize modes such as payoff-advance, construction-and-management, and relationship-emotion. A novel can also bind main genre + sub genre, so later planning, prose, and audit unfold around the same control axis.
- Audit adds a mode-fit view that checks whether a chapter drifted from that genre’s core drive, reader reward, and conflict boundary, so writing less and less like the same book happens less.
- The character-asset workbench adds Extra characters. AI can judge current-cast gaps, give relationship fill-in or relatively independent new-character candidates, and save suggested relationships together.
- From titles, world view, and characters to continuation, polish, review, and book analysis, AI generate starts sharing one prompt / workflow registry, and connects steadier JSON repair and semantic retry, so cross-workbench standards stay more consistent.

### 2026-03-25

Major update: novel planning formally upgrades to a volume workbench. Character prep also upgrades to a dynamic character system. Long-form main line, volume outline, chapter outline, and character advance start entering one linked structure.

- Story main line upgrades to a volume workbench. You can maintain main promise, conflict upgrade, protagonist change, volume-end climax, and carry-over hook by volume. Long-form planning no longer squeezes into one block of text.
- Outline upgrades to a volume-outline / chapter-outline linked workbench: volume skeleton first, then chapter list, then fill chapter goal, execution boundary, and task sheet. Planning is more stepwise, and better fits beginners.
- Volume planning supports draft, effective version, freeze, diff compare, and impact analysis. Before changing structure you can first judge which volumes and chapters will be affected. Old projects also auto-fill into this new structure.
- The dynamic character system keeps settling volume-level duties, relationship stages, absence risk, and new-character candidates, and sends this information into later planning, generate, and replan, so long-form character advance is more continuous.

### 2026-03-24

- Novel-create and novel-editor basic-info areas add book-level framing. You can first state target readers, core selling points, familiar reading feel, and first-30-chapter promises, then enter later planning and generate.
- Basic info supports AI one-click fill of whole-book framing suggestions. Later world clip, style recommend, and main-line planning start referencing this information. Opening position is steadier, and better fits beginners starting directly.
- The novel-editor character area rebuilds as a character-asset workbench. Add character and import character become on-demand entries. The daily main area more focuses on the current character’s state, motive, growth arc, and timeline upkeep.
- AI character-cast plans are added. Several core-character and key-relationship candidates can generate at once, then batch-sync to novel character assets after confirm, which lowers the beginner threshold for building a character system early.
- Model settings add more optional providers and default models. Settings also supports expanding the full model list on demand, which cuts crowding during config and historical-parameter compatibility issues.

### 2026-03-23

- The chapter-runtime panel starts showing chapter duties, stage labels, and must-advance / must-keep items directly, and supports starting replan after finding a structure issue, so direction drift is less only discovered halfway through writing.
- Chapter-generate context further closes onto the main chain of plan + latest state + active conflict + creation decisions. Continuous long-form generate more easily keeps character, relationship, and foreshadowing consistency.
- Text-extract style assets now also save original samples, which fits looking back, comparing, and keeping fine-tuning.
- Extracted style traits settle into an editable trait pool. You can enable or disable them item by item in style edit.
- When one extract produces no usable traits, the editor clearly hints the reason and supports re-extracting directly.

### 2026-03-22

- The novel-create page adds an AI Auto-Director create entry. Several whole-book direction candidates can generate first, then you can keep asking and correcting.
- Whole-book batch generate and single-chapter runtime main chains close further, so the two paths’ generate results split less.
- The novel editor adds a style-confirm step before prose writing starts, which lowers the beginner threshold for picking a style.

### 2026-03-21

- The Style Engine workspace rebuilds into a more focused modular UI. The main flow more concentrates on pick asset, edit, bind, and trial write.
- Style constraints start connecting more deeply into chapter generate, detect, and automatic-correct paths.
- Title quick-pick and model-connectivity error hints further improve.

### 2026-03-20

- A Style Engine module is added. Style assets start truly participating in trial write, generate constraints, Anti-AI detect, and one-click correct.
- The book-analysis page can one-click turn Style and technique into a style asset.
- The novel page starts more clearly distinguishing the world slice this book will actually use from full world materials.
