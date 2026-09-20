/**
 * Novel content-source adapter (novel_import) — shared-layer version.
 *
 * Drama and comic share this adapter. It is the only path that reads novel tables via prisma,
 * and it does not import any services/novel/* business logic (enforced by a CI guard).
 *
 * loadChapterText: fetch source text by chapter range so comic panel scripts can extract dialogue.
 */
import { prisma } from "../../../db/prisma";
import type { SourceContentPort } from "./SourceContentPort";
import type {
  SourceBundle,
  SourceBeat,
  SourceCharacter,
  SourceFact,
  SourceFactCategory,
  SourceRef,
} from "../contracts/sourceBundle";

function truncate(text: string, max = 200): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function normalizeFactCategory(raw: string): SourceFactCategory {
  if (raw === "revealed" || raw === "state_changed") return raw;
  return "completed";
}

export class NovelSourceAdapter implements SourceContentPort {
  readonly sourceType = "novel_import" as const;

  async loadBundle(ref: SourceRef): Promise<SourceBundle> {
    const novelId = ref.ref?.trim();
    if (!novelId) {
      throw new Error("The novel_import source is missing novelId (ref.ref).");
    }

    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, title: true, description: true },
    });
    if (!novel) {
      throw new Error(`Source novel not found: ${novelId}`);
    }

    const [chapters, characters, factRows] = await Promise.all([
      prisma.chapter.findMany({
        where: { novelId },
        orderBy: { order: "asc" },
        select: { order: true, title: true, expectation: true, content: true },
      }),
      prisma.character.findMany({
        where: { novelId },
        select: {
          id: true,
          name: true,
          gender: true,
          role: true,
          personality: true,
          background: true,
          appearance: true,
          physique: true,
          attireStyle: true,
          signatureDetail: true,
        },
      }),
      prisma.novelFactEntry.findMany({
        where: { novelId },
        orderBy: { chapterOrder: "asc" },
        select: { text: true, category: true },
      }),
    ]);

    const beats: SourceBeat[] = chapters.map((chapter) => {
      const summary =
        (chapter.expectation ?? "").trim() || truncate(chapter.content ?? "") || chapter.title;
      return {
        order: chapter.order,
        summary: `${chapter.title}: ${summary}`,
        sourceChapterStart: chapter.order,
        sourceChapterEnd: chapter.order,
      };
    });

    const bundleCharacters: SourceCharacter[] = characters.map((character) => ({
      name: character.name,
      gender: character.gender as "male" | "female" | "other" | "unknown" | undefined,
      persona: [character.role, character.personality].filter(Boolean).join(" | ") || undefined,
      relations: character.background ?? undefined,
      visualHint: [
        character.appearance,
        character.physique,
        character.attireStyle,
        character.signatureDetail,
      ].filter(Boolean).join(", ") || undefined,
      sourceCharacterRef: character.id,
    }));

    const hardFacts: SourceFact[] = factRows.map((row) => ({
      text: row.text,
      category: normalizeFactCategory(row.category),
    }));

    return {
      synopsis: (novel.description ?? "").trim() || novel.title,
      beats,
      characters: bundleCharacters,
      hardFacts,
    };
  }

  async loadChapterText(ref: SourceRef, start: number, end: number): Promise<string> {
    const novelId = ref.ref?.trim();
    if (!novelId) return "";

    const chapters = await prisma.chapter.findMany({
      where: { novelId, order: { gte: start, lte: end } },
      orderBy: { order: "asc" },
      select: { order: true, title: true, content: true },
    });

    return chapters
      .map((ch) => `[Chapter ${ch.order} ${ch.title}]\n${ch.content ?? ""}`)
      .join("\n\n");
  }
}

export const novelSourceAdapter = new NovelSourceAdapter();
