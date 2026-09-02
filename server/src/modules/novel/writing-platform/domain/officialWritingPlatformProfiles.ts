import type {
  WritingPlatform,
  WritingPlatformProfileDefinition,
} from "@ai-novel/shared/types/writingPlatform";

export const OFFICIAL_WRITING_PLATFORM_PROFILES: Record<WritingPlatform, WritingPlatformProfileDefinition> = {
  fanqie_free: {
    platform: "fanqie_free",
    label: "Georgian Serial",
    summary: "Accessible serial storytelling with an early hook, clear stakes, compact chapters, and visible payoffs.",
    supportedNarrativeForms: ["long_novel", "short_story"],
    officialVersion: 2,
    guidance: {
      long_novel: {
        positioning: "Write an approachable Georgian serial for a broad audience, driven by a clear desire, immediate pressure, and dependable chapter-level payoff.",
        planning: "Establish a disruption or conflict early. Every chapter must change the goal, obstacle, knowledge, relationship, or cost, with a visible payoff at each stage boundary.",
        drafting: "Use natural contemporary Georgian, concrete action, meaningful choices, distinct dialogue, and readable paragraph rhythm. Avoid slow explanatory openings and translation-like syntax.",
        auditing: "Check hook speed, protagonist agency, new information, conflict-to-payoff density, Georgian grammatical agreement, and comfortable screen reading.",
        repairing: "Compress repetition and exposition; strengthen action, consequence, and payoff without changing established facts or schema values.",
      },
      short_story: {
        positioning: "Deliver a complete Georgian story in one sitting: a fast opening, strong causality, sustained escalation, and a resolved ending.",
        planning: "Enter the central pressure in the opening section. Every scene must create a turn, gain, loss, discovery, or choice, and the ending must fulfill the core promise.",
        drafting: "Use natural Georgian dialogue and varied, readable paragraphs. Keep producing new information and consequences; never collapse scenes into a synopsis.",
        auditing: "Check that the work reads as a complete short story, especially the opening hook, causal density, emotional arc, and ending payoff.",
        repairing: "Strengthen events and causality locally, remove vague lyricism and long explanations, and preserve human-edited passages and the complete ending.",
      },
    },
  },
  qidian_male: {
    platform: "qidian_male",
    label: "Progression & Adventure",
    summary: "Long-form progression built on changing capability, resources, status, discovery, and earned payoff.",
    supportedNarrativeForms: ["long_novel"],
    officialVersion: 2,
    guidance: {
      long_novel: {
        positioning: "Build a durable Georgian-language story engine around growth, exploration, escalating objectives, and a widening horizon.",
        planning: "Track growth in capability, knowledge, resources, status, or influence. Escalate challenges by consequence and complexity, and manage setup, reminder, and payoff explicitly.",
        drafting: "Prioritize credible rules, tactical decisions, and the process of solving problems. Major victories must be earned through preparation, cost, and character choice.",
        auditing: "Check net progression, rule consistency, resource continuity, escalation, unresolved setups, and the question that carries the reader into the next chapter.",
        repairing: "Restore missing causal steps, costs, and strategy; repair power or rule contradictions without inventing an unearned core ability.",
      },
    },
  },
  jinjiang_female: {
    platform: "jinjiang_female",
    label: "Character & Relationship",
    summary: "Character-led long fiction with emotional causality, distinct voices, and relationships that change through action.",
    supportedNarrativeForms: ["long_novel"],
    officialVersion: 2,
    guidance: {
      long_novel: {
        positioning: "Drive a Georgian-language long story through vivid characters, relationship tension, emotional payoff, and an external plot that keeps moving.",
        planning: "Give each chapter a desire, misunderstanding, boundary, or difference in position. Relationship change must be caused by events and choices, not repetitive hesitation.",
        drafting: "Keep voices distinct and express emotion through action, subtext, rhythm, and concrete detail. Do not replace interaction with long internal summaries.",
        auditing: "Check motivation, emotional causality, net relationship change, voice distinction, personal boundaries, and external plot progress.",
        repairing: "Restore the event chain behind emotional change, reduce contrived misunderstandings and authorial judgment, and preserve character dignity and established facts.",
      },
    },
  },
  zhihu_story: {
    platform: "zhihu_story",
    label: "Georgian Short Story",
    summary: "A focused short form driven by a clear premise, controlled revelation, and a complete resonant ending.",
    supportedNarrativeForms: ["short_story"],
    officialVersion: 2,
    guidance: {
      short_story: {
        positioning: "Capture the reader with a precise premise and strong situation, then sustain a single-sitting experience through truth, choice, or relationship resolution.",
        planning: "Present the disturbance and central question early. Stage revelations deliberately, and make every late turn pay off earlier evidence.",
        drafting: "Use clear, restrained, idiomatic Georgian. A first-person or close viewpoint must sound lived-in; every paragraph should advance action, revelation, or emotion.",
        auditing: "Check premise clarity, layered information, fair reversals, emotional causality, grammatical naturalness, and whether the ending answers the central question.",
        repairing: "Improve information order and setup payoff, remove artificial mystery and vague commentary, and never use an abrupt stop as a substitute for resonance.",
      },
    },
  },
};

export const WRITING_PLATFORM_VALUES = Object.keys(OFFICIAL_WRITING_PLATFORM_PROFILES) as WritingPlatform[];

export function supportsWritingPlatformForm(platform: WritingPlatform, form: "short_story" | "long_novel"): boolean {
  return OFFICIAL_WRITING_PLATFORM_PROFILES[platform].supportedNarrativeForms.includes(form);
}
