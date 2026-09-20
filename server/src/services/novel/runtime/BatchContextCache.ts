import { prisma } from "../../../db/prisma";
import { novelEventBus } from "../../../events";
import type { NovelEvent } from "../../../events/types";

/**
 * Batch-context stable-layer cache (Phase 2).
 *
 * Lifecycle: in-process singleton, bucketed by novelId.
 * Invalidation: subscribe to character:changed / world:updated / outline:revised / volume:updated
 * and drop the stable layer for that novelId immediately.
 *
 * Cached content: novel + world + characters + storyMacroPlan + volumePlans
 * (these fields barely change inside one full-book autopilot pipeline, so per-chapter refetch is wasteful).
 */

// ────────────────────────────── Types ──────────────────────────────

/** Full return type of the novel Prisma query. */
export type CachedNovelRow = NonNullable<Awaited<ReturnType<typeof fetchNovelRow>>>;

// ────────────────────────────── Internal cache shape ──────────────────────────────

interface StableLayerEntry {
  data: CachedNovelRow;
  cachedAt: number; // Date.now()
}

/** Max cached novelIds (guards against unbounded memory growth). */
const MAX_CACHED_NOVELS = 8;
/** Stable-layer TTL in milliseconds: 30 minutes. */
const STABLE_LAYER_TTL_MS = 30 * 60 * 1000;

class BatchContextCache {
  private readonly stableLayer = new Map<string, StableLayerEntry>();

  // ──────────────── Public API ────────────────

  /**
   * Return the stable-layer data for a novelId.
   * On cache miss or TTL expiry, refetch from the DB and cache the row.
   */
  async getNovelRow(novelId: string): Promise<CachedNovelRow> {
    const entry = this.stableLayer.get(novelId);
    if (entry && Date.now() - entry.cachedAt < STABLE_LAYER_TTL_MS) {
      return entry.data;
    }
    return this.fetchAndCache(novelId);
  }

  /**
   * Actively drop the stable layer for a novelId (call after Agent tools change world/characters).
   */
  invalidate(novelId: string): void {
    this.stableLayer.delete(novelId);
  }

  // ──────────────── Internal ────────────────

  private async fetchAndCache(novelId: string): Promise<CachedNovelRow> {
    const row = await fetchNovelRow(novelId);
    if (!row) {
      throw new Error(`Novel not found: ${novelId}`);
    }
    // Evict the oldest entry when the cache is at capacity.
    if (this.stableLayer.size >= MAX_CACHED_NOVELS) {
      const oldestKey = [...this.stableLayer.entries()]
        .sort(([, a], [, b]) => a.cachedAt - b.cachedAt)[0]?.[0];
      if (oldestKey) {
        this.stableLayer.delete(oldestKey);
      }
    }
    this.stableLayer.set(novelId, { data: row, cachedAt: Date.now() });
    return row;
  }
}

// ────────────────────────────── singleton ──────────────────────────────

export const batchContextCache = new BatchContextCache();

// ────────────────────────────── Event subscriptions (invalidation) ──────────────────────────────

// Character change → invalidate this novel's stable layer.
novelEventBus.on(
  "character:changed",
  (event: Extract<NovelEvent, { type: "character:changed" }>) => {
    batchContextCache.invalidate(event.payload.novelId);
  },
);

// Volume update (outline / volume plan change) → invalidate the stable layer.
novelEventBus.on(
  "volume:updated",
  (event: Extract<NovelEvent, { type: "volume:updated" }>) => {
    batchContextCache.invalidate(event.payload.novelId);
  },
);

// Outline revision → invalidate the stable layer.
novelEventBus.on(
  "outline:revised",
  (event: Extract<NovelEvent, { type: "outline:revised" }>) => {
    batchContextCache.invalidate(event.payload.novelId);
  },
);

novelEventBus.on(
  "book-contract:updated",
  (event: Extract<NovelEvent, { type: "book-contract:updated" }>) => {
    batchContextCache.invalidate(event.payload.novelId);
  },
);

// Pipeline completion → invalidate so the next batch sees the latest status.
novelEventBus.on(
  "pipeline:completed",
  (event: Extract<NovelEvent, { type: "pipeline:completed" }>) => {
    batchContextCache.invalidate(event.payload.novelId);
  },
);

// world:updated only carries worldId, so it cannot map here directly.
// World updates use WorldContextGateway's own cache; BatchContextCache needs no extra handling.

// ────────────────────────────── DB query ──────────────────────────────

async function fetchNovelRow(novelId: string) {
  return prisma.novel.findUnique({
    where: { id: novelId },
    include: {
      world: true,
      genre: {
        select: { name: true, description: true, template: true },
      },
      characters: true,
      bookContract: true,
      storyMacroPlan: true,
      volumePlans: {
        orderBy: { sortOrder: "asc" },
        include: {
          sourceVersion: {
            select: { contentJson: true },
          },
          chapters: {
            orderBy: { chapterOrder: "asc" },
            select: { chapterOrder: true },
          },
        },
      },
      primaryStoryMode: {
        select: {
          id: true,
          name: true,
          description: true,
          template: true,
          parentId: true,
          profileJson: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      secondaryStoryMode: {
        select: {
          id: true,
          name: true,
          description: true,
          template: true,
          parentId: true,
          profileJson: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}
