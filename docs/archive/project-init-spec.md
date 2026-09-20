# AI Novel Writing Workbench / AI Novel Production Engine - Project Initialization

## Project Overview
Build an AI novel-writing workbench for private deployment, using a separated frontend/backend architecture.
This pass only initializes the project skeleton and core infrastructure. It does not implement concrete business features.

## Tech Stack Requirements

### Frontend (client/)
- Vite 5 + React 18 + TypeScript 5
- React Router v6 (file-style route configuration)
- TailwindCSS v3 + Shadcn/UI (component library)
- Zustand v4 (client state)
- @tanstack/react-query v5 (server state + request cache)
- Axios (HTTP client, unified baseURL and error handling)
- Sonner (Toast notifications)
- Lucide React (icons)
- React Markdown + rehype-highlight (Markdown rendering)
- Framer Motion (animation, on demand)
- React Hook Form + Zod (form validation)

### Backend (server/)
- Node.js 20 + Express 4 + TypeScript 5
- LangChain.js (@langchain/core @langchain/openai @langchain/community)
- LangGraph.js (@langchain/langgraph)
- Prisma 5 + SQLite (development) / PostgreSQL (production reserved)
- Zod (request-body validation)
- cors + helmet + morgan (base middleware)
- dotenv (environment variables)
- Streaming responses: native SSE (text/event-stream)

### Shared (shared/)
- Pure TypeScript type-definition files
- Request/response interfaces shared by frontend and backend
- Enums (LLM provider, character types, world dimensions, and similar)

## Directory Structure

Please generate the following complete directory structure:
├── client/
│ ├── src/
│ │ ├── api/ # Axios request wrappers (one file per business module)
│ │ │ ├── client.ts # Axios instance (baseURL, interceptors)
│ │ │ ├── novel.ts
│ │ │ ├── world.ts
│ │ │ ├── character.ts
│ │ │ ├── writingFormula.ts
│ │ │ ├── chat.ts
│ │ │ └── settings.ts
│ │ ├── components/
│ │ │ ├── ui/ # Shadcn/UI components (place directly, no subdirectories)
│ │ │ ├── layout/
│ │ │ │ ├── AppLayout.tsx # Main layout (Navbar + Sidebar + Content)
│ │ │ │ ├── Navbar.tsx
│ │ │ │ └── Sidebar.tsx
│ │ │ └── common/ # Shared business components
│ │ │ ├── LLMSelector.tsx # Model selector (global reuse)
│ │ │ ├── StreamOutput.tsx # SSE streaming content display component
│ │ │ └── MarkdownViewer.tsx
│ │ ├── pages/ # Page components (matching routes)
│ │ │ ├── Home.tsx
│ │ │ ├── novels/
│ │ │ │ ├── NovelList.tsx
│ │ │ │ ├── NovelCreate.tsx
│ │ │ │ └── NovelEdit.tsx
│ │ │ ├── worlds/
│ │ │ │ ├── WorldList.tsx
│ │ │ │ └── WorldGenerator.tsx
│ │ │ ├── chat/
│ │ │ │ └── ChatPage.tsx
│ │ │ ├── writingFormula/
│ │ │ │ └── WritingFormulaPage.tsx
│ │ │ ├── characters/
│ │ │ │ └── CharacterLibrary.tsx
│ │ │ ├── settings/
│ │ │ │ └── SettingsPage.tsx
│ │ │ └── astrology/
│ │ │ └── AstrologyPage.tsx
│ │ ├── store/ # Zustand stores
│ │ │ ├── llmStore.ts # Currently selected LLM provider/model
│ │ │ ├── chatStore.ts # Chat history (IndexedDB persistence)
│ │ │ └── uiStore.ts # UI state (sidebar collapse and similar)
│ │ ├── hooks/ # Custom React Hooks
│ │ │ ├── useSSE.ts # SSE streaming-request Hook
│ │ │ └── useLocalDB.ts # IndexedDB operation Hook
│ │ ├── lib/
│ │ │ ├── utils.ts # cn() helper (used by Shadcn)
│ │ │ └── constants.ts # Constants (API_BASE_URL and similar)
│ │ ├── router/
│ │ │ └── index.tsx # React Router route configuration
│ │ ├── types/ # Frontend-only types (inherit shared/)
│ │ └── main.tsx
│ ├── index.html
│ ├── vite.config.ts
│ ├── tailwind.config.ts
│ ├── tsconfig.json
│ └── package.json
│
├── server/
│ ├── src/
│ │ ├── routes/ # Express routes (by business module)
│ │ │ ├── novel.ts
│ │ │ ├── world.ts
│ │ │ ├── character.ts
│ │ │ ├── writingFormula.ts
│ │ │ ├── chat.ts
│ │ │ ├── settings.ts
│ │ │ └── astrology.ts
│ │ ├── services/ # Business-logic layer
│ │ │ ├── novel/
│ │ │ │ ├── NovelService.ts
│ │ │ │ └── ChapterService.ts
│ │ │ ├── world/
│ │ │ │ └── WorldService.ts
│ │ │ └── writingFormula/
│ │ │ └── WritingFormulaService.ts
│ │ ├── graphs/ # LangGraph workflow definitions
│ │ │ ├── novelOutlineGraph.ts # Novel-outline generation graph
│ │ │ ├── worldBuildingGraph.ts # Worldbuilding graph
│ │ │ ├── chapterWritingGraph.ts # Chapter-writing graph
│ │ │ └── characterDesignGraph.ts # Character-design graph
│ │ ├── chains/ # LangChain chains (non-graph flows)
│ │ │ ├── writingFormulaChain.ts # Writing-formula extract/apply
│ │ │ ├── titleGeneratorChain.ts # Title generation
│ │ │ └── chatChain.ts # Chat chain
│ │ ├── llm/
│ │ │ ├── factory.ts # LLM factory (return matching ChatModel by provider)
│ │ │ ├── providers.ts # Provider config (baseURL, default model)
│ │ │ └── streaming.ts # SSE streaming-response helpers
│ │ ├── db/
│ │ │ └── prisma.ts # Prisma Client singleton
│ │ ├── middleware/
│ │ │ ├── validate.ts # Zod request-validation middleware
│ │ │ ├── errorHandler.ts # Unified error handling
│ │ │ └── auth.ts # [Reserved] auth middleware (default passthrough)
│ │ ├── prisma/
│ │ │ └── schema.prisma # Database models (keep existing models, remove User auth fields)
│ │ └── app.ts # Express application entry
│ ├── tsconfig.json
│ ├── .env.example
│ └── package.json
│
├── shared/
│ ├── types/
│ │ ├── novel.ts # Novel / Chapter / Character types
│ │ ├── world.ts # World / WorldProperty types
│ │ ├── writingFormula.ts # WritingFormula types
│ │ ├── llm.ts # LLMProvider / ModelConfig enums and types
│ │ └── api.ts # Unified API response format ApiResponse<T>
│ ├── tsconfig.json
│ └── package.json
│
├── package.json # Workspace root (npm workspaces or pnpm)
└── README.md
## Core Architecture Rules

### 1. Unified API Response Format
All endpoints return:
// shared/types/api.ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Streaming endpoints use SSE, each frame format:
// data: {"type": "chunk", "content": "..."}\n\n
// data: {"type": "done"}\n\n
// data: {"type": "error", "error": "..."}\n\n

2. LLM Factory Rules
// server/src/llm/factory.ts
// Supported providers: deepseek / siliconflow / openai / anthropic
// All providers uniformly return a BaseChatModel instance
// Provider config is read from the api_keys table, fallback to .env
// Interface:
getLLM(provider: LLMProvider, options?: { model?: string; temperature?: number }): BaseChatModel
// server/src/llm/factory.ts// Supported providers: deepseek / siliconflow / openai / anthropic// All providers uniformly return a BaseChatModel instance// Provider config is read from the api_keys table, fallback to .env// Interface: getLLM(provider: LLMProvider, options?: { model?: string; temperature?: number }): BaseChatModel
3. LangGraph Graph Rules
Each Graph file exports:
// State definition (Annotation)
// Node functions (pure functions, receive state and return Partial<state>)
// Graph construction (StateGraph + addNode + addEdge)
// Compiled graph (compiledGraph, called by services)
// Streaming call style: graph.streamEvents(input, { version: "v2" })
// State definition (Annotation)// Node functions (pure functions, receive state and return Partial<state>)// Graph construction (StateGraph + addNode + addEdge)// Compiled graph (compiledGraph, called by services)// Streaming call style: graph.streamEvents(input, { version: "v2" })
4. SSE Streaming Rules
// server/src/llm/streaming.ts
// streamToSSE(res: Response, generator: AsyncIterable<string>): Promise<void>
// Set Content-Type: text/event-stream
// Write format: data: JSON.stringify({type, content})\n\n
// Heartbeat: every 15s send data: {"type":"ping"}\n\n
// End: data: {"type":"done"}\n\n
// server/src/llm/streaming.ts// streamToSSE(res: Response, generator: AsyncIterable<string>): Promise<void>// Set Content-Type: text/event-stream// Write format: data: JSON.stringify({type, content})\n\n// Heartbeat: every 15s send data: {"type":"ping"}\n\n// End: data: {"type":"done"}\n\n
5. Auth Reservation Rules
// server/src/middleware/auth.ts
// Current: call next() directly, no verification
// Reserved interface: extend an optional user field on req
// Route layer: all routes go through router.use(authMiddleware), but the current middleware always passes through
// Later only auth.ts implementation needs replacement; the route layer does not change
// server/src/middleware/auth.ts// Current: call next() directly, no verification// Reserved interface: extend an optional user field on req// Route layer: all routes go through router.use(authMiddleware), but the current middleware always passes through// Later only auth.ts implementation needs replacement; the route layer does not change
6. Prisma Schema Adjustments
Remove the User table and all userId foreign-key constraints (private deployment does not need multi-user)
Keep the APIKey table but remove the userId field
Remove the userId field from WritingFormula / TitleLibrary / World tables
Keep remaining models unchanged
7. Frontend SSE Hook Rules
// client/src/hooks/useSSE.ts
// Wrap EventSource or fetch + ReadableStream
// Support: onChunk / onDone / onError callbacks
// Support: manual abort (auto-abort on component unmount)
// Interface: useSSE(url, body, options) => { start, abort, content, isStreaming }
// client/src/hooks/useSSE.ts// Wrap EventSource or fetch + ReadableStream// Support: onChunk / onDone / onError callbacks// Support: manual abort (auto-abort on component unmount)// Interface: useSSE(url, body, options) => { start, abort, content, isStreaming }
Initialization Tasks
Please complete the following initialization (do not implement business logic):
Create the monorepo structure using pnpm workspaces
client/ initialization:
Configure Vite + React + TypeScript
Install and configure TailwindCSS + Shadcn/UI (add button/input/card/dialog/tabs/select/badge/toast components)
Configure React Router v6 (including placeholder routes)
Create the Axios client (including baseURL and error interceptor)
Create AppLayout (Navbar + main content area)
Create the LLMSelector shared-component skeleton
Create the useSSE Hook
Configure TanStack Query Provider
server/ initialization:
Configure Express + TypeScript + ts-node-dev
Configure CORS (allow localhost:5173)
Create unified error-handling middleware
Create authMiddleware (direct passthrough)
Create the LLM factory (support deepseek/openai/siliconflow, uniformly use ChatOpenAI + baseURL)
Create SSE streaming helpers
Configure Prisma (including schema, SQLite)
Create a sample route /api/health to verify the service is healthy
shared/ initialization:
Create all type-definition files
Configure TypeScript paths (both client and server reference shared/types)
Create .env.example and README.md at the repo root (including local start commands)
