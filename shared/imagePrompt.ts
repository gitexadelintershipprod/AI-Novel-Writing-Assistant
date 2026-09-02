export interface CharacterImagePromptCharacterContext {
  name: string;
  role: string;
  personality: string;
  appearance?: string | null;
  background: string;
}

export interface BuildCharacterImagePromptInput {
  prompt: string;
  stylePreset?: string | null;
  character: CharacterImagePromptCharacterContext;
}

export interface NovelCoverImagePromptNovelContext {
  title: string;
  description?: string | null;
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags?: string[] | null;
  genreLabel?: string | null;
  primaryStoryModeLabel?: string | null;
  secondaryStoryModeLabel?: string | null;
  worldName?: string | null;
  worldSummary?: string | null;
  styleTone?: string | null;
  narrativePovLabel?: string | null;
  pacePreferenceLabel?: string | null;
  emotionIntensityLabel?: string | null;
}

export interface BuildNovelCoverImagePromptInput {
  prompt: string;
  stylePreset?: string | null;
  novel: NovelCoverImagePromptNovelContext;
}

export const DEFAULT_NOVEL_COVER_STYLE_PRESET = "Cinematic illustration, strong atmosphere, distinctive composition, suitable for a vertical fiction cover";
export const DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT = "garbled text, incorrect title, repeated text, subtitle, author name, slogan, watermark, logo, low resolution, blur, deformation, extra limbs";

function joinLabelValues(label: string, values: Array<string | null | undefined>): string {
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return normalized.length > 0 ? `${label}: ${normalized.join(" / ")}` : "";
}

export function buildNovelCoverTitleInstruction(title: string): string {
  return `Render the single exact Georgian title “${title}” clearly and legibly. Do not alter, omit, add, duplicate, or garble any character. Generate no subtitle, author name, slogan, tag, watermark, or logo.`;
}

export function buildDefaultCharacterImageSourceDescription(character: {
  name: string;
  role?: string | null;
  appearance?: string | null;
  personality?: string | null;
}): string {
  const blocks = [
    `Character portrait of ${character.name}`,
    character.role ? `Character role: ${character.role}` : "",
    character.appearance ? `Appearance and physique: ${character.appearance}` : "",
    character.personality ? `Personality: ${character.personality}` : "",
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildCharacterImagePrompt(input: BuildCharacterImagePromptInput): string {
  const blocks = [
    input.prompt.trim(),
    input.stylePreset?.trim() ? `Style preset: ${input.stylePreset.trim()}` : "",
    `Character name: ${input.character.name}`,
    `Character role: ${input.character.role}`,
    `Personality: ${input.character.personality}`,
    `Appearance: ${input.character.appearance ?? "Not specified"}`,
    `Background: ${input.character.background}`,
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildDefaultNovelCoverSourceDescription(novel: NovelCoverImagePromptNovelContext): string {
  const blocks = [
    `Primary fiction-cover artwork for ${novel.title}`,
    novel.description?.trim() ? `One-sentence premise: ${novel.description.trim()}` : "",
    novel.targetAudience?.trim() ? `Target audience: ${novel.targetAudience.trim()}` : "",
    novel.bookSellingPoint?.trim() ? `Core appeal: ${novel.bookSellingPoint.trim()}` : "",
    novel.competingFeel?.trim() ? `Reading feel: ${novel.competingFeel.trim()}` : "",
    novel.first30ChapterPromise?.trim() ? `First-30-chapter payoff: ${novel.first30ChapterPromise.trim()}` : "",
    novel.commercialTags?.length ? `Story tags: ${novel.commercialTags.join(", ")}` : "",
    novel.genreLabel?.trim() ? `Genre foundation: ${novel.genreLabel.trim()}` : "",
    joinLabelValues("Story modes", [novel.primaryStoryModeLabel, novel.secondaryStoryModeLabel]),
    novel.worldSummary?.trim()
      ? `World atmosphere: ${novel.worldSummary.trim()}`
      : novel.worldName?.trim()
        ? `World atmosphere: ${novel.worldName.trim()}`
        : "",
    novel.styleTone?.trim() ? `Tone keywords: ${novel.styleTone.trim()}` : "",
    joinLabelValues("Narrative and pacing", [novel.narrativePovLabel, novel.pacePreferenceLabel, novel.emotionIntensityLabel]),
    `Cover goal: emphasize the story's strongest visual promise and generate a complete vertical fiction cover with the exact Georgian title “${novel.title}”.`,
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildNovelCoverImagePrompt(input: BuildNovelCoverImagePromptInput): string {
  const blocks = [
    input.prompt.trim(),
    input.stylePreset?.trim() ? `Style preset: ${input.stylePreset.trim()}` : "",
    "Cover goal: vertical fiction cover with readable Georgian title typography.",
    `Project title: ${input.novel.title}`,
    `Required title text: ${input.novel.title}`,
    buildNovelCoverTitleInstruction(input.novel.title),
    `Story premise: ${input.novel.description?.trim() || "Not specified"}`,
    `Target audience: ${input.novel.targetAudience?.trim() || "Not specified"}`,
    `Core selling point: ${input.novel.bookSellingPoint?.trim() || "Not specified"}`,
    `Reading feel: ${input.novel.competingFeel?.trim() || "Not specified"}`,
    `First 30 chapter payoff: ${input.novel.first30ChapterPromise?.trim() || "Not specified"}`,
    `Commercial tags: ${input.novel.commercialTags?.join(", ") || "Not specified"}`,
    `Genre: ${input.novel.genreLabel?.trim() || "Not specified"}`,
    `Primary story mode: ${input.novel.primaryStoryModeLabel?.trim() || "Not specified"}`,
    `Secondary story mode: ${input.novel.secondaryStoryModeLabel?.trim() || "Not specified"}`,
    `World frame: ${input.novel.worldSummary?.trim() || input.novel.worldName?.trim() || "Not specified"}`,
    `Tone keywords: ${input.novel.styleTone?.trim() || "Not specified"}`,
    `Narrative point of view: ${input.novel.narrativePovLabel?.trim() || "Not specified"}`,
    `Pacing preference: ${input.novel.pacePreferenceLabel?.trim() || "Not specified"}`,
    `Emotion intensity: ${input.novel.emotionIntensityLabel?.trim() || "Not specified"}`,
  ];
  return blocks.filter(Boolean).join("\n");
}
