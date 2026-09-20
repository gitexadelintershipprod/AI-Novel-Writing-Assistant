/**
 * Comic art-style keyword resolver (single source).
 *
 * All comic-related image generation (character turnaround, expression sheet, character assets,
 * scene setting art, panel images) should inject project art style through this function
 * so the whole book stays visually consistent.
 *
 * Art style comes from ComicProject.stylePreset(JSON).style (webtoon_color / ink_traditional, etc.).
 * Note: stylePreset.promptKeywords are "comic format" keywords (vertical webtoon / 4-koma), not art style.
 */

interface StyleEntry {
  en: string;
}

// Matches the value of ComicProjectPage STYLE_OPTIONS on the frontend.
const STYLE_KEYWORDS: Record<string, StyleEntry> = {
  webtoon_color: { en: "Korean webtoon style, clean line art, vibrant colors" },
  bl_manga: { en: "shoujo manga style, soft palette, delicate features" },
  shounen_bw: { en: "black-and-white shounen manga, bold ink line art, dynamic composition" },
  ink_traditional: { en: "traditional Chinese ink-wash painting style, brush strokes, muted washed colors" },
  chibi: { en: "chibi / SD cute manga style, round soft proportions" },
  realistic: { en: "semi-realistic illustration style, detailed shading and lighting" },
};

const DEFAULT_STYLE: StyleEntry = STYLE_KEYWORDS.webtoon_color;

function resolveStyleEntry(stylePresetRaw: string | null | undefined): StyleEntry {
  if (!stylePresetRaw) return DEFAULT_STYLE;
  try {
    const parsed = JSON.parse(stylePresetRaw) as { style?: string };
    if (parsed.style && STYLE_KEYWORDS[parsed.style]) return STYLE_KEYWORDS[parsed.style];
  } catch { /* ignore */ }
  return DEFAULT_STYLE;
}

/** Return an English art-style keyword string to append directly to the image prompt. */
export function resolveComicStyleKeywords(stylePresetRaw: string | null | undefined): string {
  return resolveStyleEntry(stylePresetRaw).en;
}

/** English-only art-style fragment (for prompts that are primarily English). */
export function resolveComicStyleKeywordsEn(stylePresetRaw: string | null | undefined): string {
  return resolveStyleEntry(stylePresetRaw).en;
}

// ─── Strong gender constraint ─────────────────────────────────────────────────
// In historical / Korean-webtoon settings, descriptors such as "oval face, peach-blossom eyes,
// alluring, tsundere" are used for both genders, and models default toward a pretty-boy look.
// Every image-generation path (turnaround / expression sheet / asset / panel) must declare gender explicitly.

/** Convert ComicCharacter.gender into a strong constraint prompt fragment; empty when unknown/missing (not injected). */
export function buildGenderLockPrompt(
  gender: string | null | undefined,
  characterName?: string,
): string {
  switch (gender) {
    case "male":
      return [
        `*** GENDER LOCK ***: ${characterName ?? "this character"} is MALE`,
        "render with masculine anatomy: male facial bone structure, male shoulder/torso proportions, Adam's apple, masculine hairline; NOT feminine",
        "this character is male; preserve the specified gender and do not render a female character",
      ].join(", ");
    case "female":
      return [
        `*** GENDER LOCK ***: ${characterName ?? "this character"} is FEMALE`,
        "render with feminine anatomy: female facial bone structure, female body proportions, feminine hairline; NOT masculine",
        "this character is female; preserve the specified gender and do not render a male or androgynous character",
      ].join(", ");
    case "other":
      // Neutral / non-binary: do not lock one gender, but warn against a random default bias.
      return `*** GENDER NOTE ***: ${characterName ?? "this character"} has androgynous / non-binary presentation, respect the appearance description above; do not force masculine or feminine defaults`;
    case "unknown":
    case null:
    case undefined:
    default:
      return "";
  }
}
