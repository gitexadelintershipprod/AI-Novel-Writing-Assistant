import {
  ArrowRight,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  Github,
  PenLine,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import appIcon from "./assets/app-icon.png";
import { formatStarCount, useGithubStars } from "./hooks/useGithubStars";
import { usePageMeta } from "./hooks/usePageMeta";
import DocsPage from "./DocsPage";
import { docsPath, isSitePath, parseRoute, sitePath } from "./routing";
import chapterExecutionImage from "./assets/chapter-execution.png";
import creativeHubImage from "./assets/creative-hub.png";
import directorChoiceImage from "./assets/director-choice.png";
import {
  HERO_PARAGRAPH,
  RELEASE_URL,
  REPO_NAME,
  REPO_OWNER,
  REPO_URL,
  SITE_NAME,
  SITE_TAGLINE,
} from "./siteMeta";

const docsIntroBannerImage = `${import.meta.env.BASE_URL}assets/docs-intro-banner.png`;

const proofItems = [
  "Auto-Director opening",
  "World and character assets",
  "RAG knowledge recall",
  "Chapter execution and repair",
];

const productionFlow = [
  {
    marker: "01",
    title: "Turn inspiration into a writable direction",
    text: "Start from a fuzzy idea. AI first sorts genre, selling points, reader feeling, and full-book direction options, so a beginner does not have to invent a world and outline from nothing.",
    image: directorChoiceImage,
  },
  {
    marker: "02",
    title: "Prepare world, cast, and long-term promises",
    text: "Stage rules, faction boundaries, relationships, and early promises become assets the next chapter can inherit, instead of depending on a one-shot prompt.",
    image: creativeHubImage,
  },
  {
    marker: "03",
    title: "Split into volumes, rhythm, and chapter tasks",
    text: "The novel becomes volume strategy, a rhythm board, chapter goals, and execution tasks. Each step can continue, look back, and adjust.",
    image: chapterExecutionImage,
  },
];

const consoleModules = [
  {
    title: "Creative Hub",
    text: "Conversation, follow-up questions, planning, tool calls, and task status live in one creative center.",
    icon: BrainCircuit,
  },
  {
    title: "Auto-Director",
    text: "From opening direction to chapter batches, it keeps offering the next step and recoverable checkpoints.",
    icon: Sparkles,
  },
  {
    title: "Knowledge and style",
    text: "Book analysis, the knowledge library, and writing assets enter retrieval so later chapters share the same creative ground.",
    icon: Boxes,
  },
  {
    title: "Chapter production",
    text: "Drafting, review, repair, and state write-back form one chapter execution chain.",
    icon: PenLine,
  },
];

const audience = [
  "Writers who want AI to finish a novel, not just generate a scene.",
  "Beginners who need clear default steps instead of a blank structure problem.",
  "Developers studying agent workflows, LangGraph, and AI-native product design.",
];

const routeChangeEvent = "ai-novel-site:navigation";

function subscribePath(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(routeChangeEvent, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(routeChangeEvent, callback);
  };
}

function getPathSnapshot() {
  return window.location.pathname;
}

function usePathRoute(initialPath = "/") {
  return useSyncExternalStore(subscribePath, getPathSnapshot, () => initialPath);
}

function useHistoryNavigation() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) {
        return;
      }
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || !isSitePath(url.pathname)) {
        return;
      }
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      if (nextPath === currentPath) {
        return;
      }
      if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      event.preventDefault();
      window.history.pushState(null, "", nextPath);
      window.dispatchEvent(new Event(routeChangeEvent));
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}

type AppProps = {
  initialPath?: string;
};

function App({ initialPath }: AppProps) {
  useHistoryNavigation();
  const pathname = usePathRoute(initialPath);
  const route = parseRoute(pathname);

  return (
    <main>
      <SiteNav page={route.page} />
      {route.page === "docs" ? (
        <DocsPage docId={route.docId} />
      ) : (
        <HomePage />
      )}
    </main>
  );
}

function SiteNav({ page }: { page: "home" | "docs" }) {
  const stars = useGithubStars(REPO_OWNER, REPO_NAME);
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand" href={sitePath("/")} aria-label={`${SITE_NAME} home`}>
        <span className="brand-mark">
          <img src={appIcon} alt="" aria-hidden="true" />
        </span>
        <span>{SITE_NAME}</span>
      </a>
      <div className="nav-links">
        <a href={docsPath()}>Docs</a>
        {page === "home" ? (
          <>
            <a href="#flow">Production chain</a>
            <a href="#console">Console</a>
            <a href="#audience">Who it is for</a>
          </>
        ) : (
          <a href={RELEASE_URL}>Windows desktop</a>
        )}
        <a className="nav-github" href={REPO_URL} aria-label={stars !== null ? `GitHub · ${stars} stars` : "GitHub"}>
          <Github size={15} />
          <span>GitHub</span>
          {stars !== null ? (
            <span className="nav-stars">
              <Star size={11} strokeWidth={2.4} />
              {formatStarCount(stars)}
            </span>
          ) : null}
        </a>
      </div>
    </nav>
  );
}

function HomePage() {
  const stars = useGithubStars(REPO_OWNER, REPO_NAME);
  usePageMeta(null);
  return (
    <>
      <section
        id="top"
        className="hero"
        style={{ backgroundImage: `url(${docsIntroBannerImage})` }}
        aria-label="Project introduction"
      >
        <div className="hero-scrim" />
        <div className="hero-content">
          <p className="eyebrow">AI native novel production workspace</p>
          <h1>{SITE_TAGLINE}</h1>
          <p className="hero-copy">{HERO_PARAGRAPH}</p>
          <div className="hero-actions">
            <a className="button primary" href={docsPath()}>
              <FileText size={18} />
              Read the docs
            </a>
            <a className="button ghost" href={REPO_URL}>
              <Github size={18} />
              View GitHub
            </a>
            <a className="button ghost" href={RELEASE_URL}>
              <Download size={18} />
              Windows desktop
            </a>
            {stars !== null ? (
              <a
                className="button star"
                href={`${REPO_URL}/stargazers`}
                aria-label={`GitHub ${stars} stars`}
              >
                <Star size={18} strokeWidth={2.2} />
                <span>Star</span>
                <span className="star-count">{formatStarCount(stars)}</span>
              </a>
            ) : null}
          </div>
          <div className="route-strip" aria-label="Core production path">
            <span>Idea</span>
            <ArrowRight size={15} />
            <span>Direction</span>
            <ArrowRight size={15} />
            <span>World / cast</span>
            <ArrowRight size={15} />
            <span>Chapters</span>
            <ArrowRight size={15} />
            <span>Prose</span>
            <ArrowRight size={15} />
            <span>Repair</span>
          </div>
        </div>
      </section>

      <section className="proof-band" aria-label="Capability overview">
        {proofItems.map((item) => (
          <p key={item}>
            <CheckCircle2 size={17} />
            <span>{item}</span>
          </p>
        ))}
      </section>

      <section id="flow" className="section editorial-flow">
        <div className="section-kicker">
          <p className="eyebrow">Production flow</p>
          <h2>Let AI organize the book, then write chapters</h2>
          <p>
            The page is not a pile of feature buttons. It shows the path a writer actually walks: choose a direction, prepare assets, then run chapter production.
          </p>
        </div>
        <div className="flow-list">
          {productionFlow.map((step) => (
            <article className="flow-row" key={step.marker}>
              <div className="flow-copy">
                <span>{step.marker}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <figure className="flow-image">
                <img src={step.image} alt={`${step.title} screenshot`} loading="lazy" />
              </figure>
            </article>
          ))}
        </div>
      </section>

      <section id="console" className="console-section">
        <div className="console-heading">
          <p className="eyebrow">Product console</p>
          <h2>Editorial warmth, with a real production console</h2>
          <p>
            This is not an ordinary chat shell. Context, task state, model routing, and the chapter chain sit together, so AI can act as a system role across the whole book.
          </p>
        </div>
        <div className="console-layout">
          <div className="console-wall" aria-label="Product interface preview">
            <img className="console-main" src={creativeHubImage} alt="Creative Hub screenshot" />
            <img className="console-float one" src={directorChoiceImage} alt="Auto-Director direction choice screenshot" />
            <img className="console-float two" src={chapterExecutionImage} alt="Chapter execution screenshot" />
          </div>
          <div className="console-modules">
            {consoleModules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.title}>
                  <Icon size={21} />
                  <div>
                    <h3>{module.title}</h3>
                    <p>{module.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="audience" className="section audience-section">
        <div className="audience-copy">
          <p className="eyebrow">Who it helps</p>
          <h2>Built for finishing a novel, not a one-shot reply</h2>
          <div className="audience-list">
            {audience.map((item) => (
              <p key={item}>
                <CheckCircle2 size={19} />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>
        <aside className="download-panel">
          <p className="panel-label">Run it locally</p>
          <h3>Start with Docker or pnpm, then walk one full writing chain</h3>
          <p>
            SQLite is enough for the main path. Add Qdrant when you need the knowledge library. Developers can keep studying the frontend, backend, and agent workflow from source.
          </p>
          <div className="panel-actions">
            <a className="button primary dark" href={REPO_URL}>
              <Github size={18} />
              Open the repository
            </a>
            <a className="text-link" href={RELEASE_URL}>
              Windows desktop
              <ArrowRight size={17} />
            </a>
          </div>
        </aside>
      </section>

      <section className="docs-teaser section">
        <div>
          <p className="eyebrow">Documentation</p>
          <h2>Public docs and module guides</h2>
          <p>The docs site collects the introduction, how to start, sidebar modules, the public roadmap, and release notes.</p>
        </div>
        <a className="button primary" href={docsPath()}>
          <FileText size={18} />
          Open the docs
        </a>
      </section>

      <section className="cta-section">
        <p className="eyebrow">Open source</p>
        <h2>Make long-form fiction a system you can run, pause, and keep improving.</h2>
        <div className="cta-actions">
          <a className="button primary" href={REPO_URL}>
            <Github size={18} />
            View the source
          </a>
          <a className="button ghost" href={RELEASE_URL}>
            <Download size={18} />
            Windows desktop
          </a>
        </div>
      </section>
    </>
  );
}

export default App;
