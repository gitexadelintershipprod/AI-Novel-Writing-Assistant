import type { BaseCharacter } from "@ai-novel/shared/types/novelCharacter";
import type { CharacterSubjectProjection } from "@ai-novel/shared/types/characterConversation";
import type { CharacterSubjectAdapter } from "./types";

export interface BaseCharacterSubjectAdapterInput {
  character: BaseCharacter;
}

const PROMPT_FIELD_LIMIT = 420;

function compact(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return text.length > PROMPT_FIELD_LIMIT ? `${text.slice(0, PROMPT_FIELD_LIMIT)}…` : text;
}

function present(label: string, value: string | null | undefined): string | null {
  const text = compact(value);
  return text ? `${label}：${text}` : null;
}

/**
 * Projects a library template as a read-only conversational subject. It has
 * no novel scope and intentionally does not manufacture a current plot state.
 */
export const baseCharacterSubjectAdapter: CharacterSubjectAdapter<BaseCharacterSubjectAdapterInput> = {
  project({ character }): CharacterSubjectProjection {
    const stableDetails = [
      present("Personality", character.personality),
      present("Background", character.background),
      present("Development direction", character.development),
      present("Weaknesses", character.weaknesses),
      present("Interests", character.interests),
      present("key experiences", character.keyEvents),
    ].filter((item): item is string => Boolean(item));

    return {
      subject: {
        kind: "base_character",
        id: character.id,
        scopeKind: "base_library",
        scopeId: null,
      },
      name: character.name,
      role: character.role,
      sourceLabel: "Basic character library",
      sourceDescription: "Reply from the stable character-library profile. The talk is only for understanding the person and will not rewrite library settings.",
      interactionPolicy: "read_only",
      identity: stableDetails.join("\n") || `Role positioning:${character.role}`,
      currentSituation: "This is a 可复用的角色原型，未绑定任何小说、章节或当前剧情处境。",
      hardBoundaries: [
        "Reply only from the stable base character-library profile. Do not invent events from a specific novel.",
        "This is a read-only interview. It will not change the character library, create versions, or affect any novel text.",
      ],
      subjectiveState: null,
      evidence: [
        {
          label: "Character-library setup",
          detail: `Current stable setup for character-library entry "${character.name}".`,
          sourceType: "base_character",
          sourceRef: character.id,
          chapterOrder: null,
        },
      ],
      chapterAnchor: null,
      chapterAnchorLabel: null,
    };
  },

  buildPromptContext({ character }): string {
    return [
      "角色来源：Basic character library（read-only interview）",
      `姓名：${compact(character.name)}`,
      `Role positioning:${compact(character.role)}`,
      present("Personality", character.personality),
      present("Background", character.background),
      present("Development direction", character.development),
      present("外形", character.appearance),
      present("Weaknesses", character.weaknesses),
      present("Interests", character.interests),
      present("key experiences", character.keyEvents),
      character.tags.trim() ? `标签：${compact(character.tags)}` : null,
      "Boundary: not bound to novel plot. Do not treat the conversation as established fact, and do not propose or write character-library changes.",
    ].filter((line): line is string => Boolean(line)).join("\n");
  },
};
