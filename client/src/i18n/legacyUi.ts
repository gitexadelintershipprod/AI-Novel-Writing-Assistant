import legacyUi from "@/locales/en/legacy-ui.json";
import { translateDynamicUiText } from "./dynamicUiPatterns";

const HAN_PATTERN = /[\p{Script=Han}]/u;
const HAN_RUN_PATTERN = /[\p{Script=Han}][\p{Script=Han}\s，。！？、：；（）《》“”‘’·…—-]*/gu;
const translations = legacyUi as Record<string, string>;
const fragmentTranslations = new Map<string, Array<readonly [string, string]>>();

for (const [source, translated] of Object.entries(translations)) {
  if (source.length < 2 || !containsHan(source)) continue;
  const candidates = fragmentTranslations.get(source[0]) ?? [];
  candidates.push([source, translated]);
  fragmentTranslations.set(source[0], candidates);
}

for (const candidates of fragmentTranslations.values()) {
  candidates.sort(([left], [right]) => right.length - left.length);
}

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

export function containsHan(value: string): boolean {
  return HAN_PATTERN.test(value);
}

function normalizeTranslatedPunctuation(value: string): string {
  return value
    .replace(/：\s*/g, ": ")
    .replace(/；\s*/g, "; ")
    .replace(/，\s*/g, ", ")
    .replace(/、\s*/g, ", ")
    .replace(/。/g, ".")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/「|“/g, '"')
    .replace(/」|”/g, '"');
}

function translateKnownFragments(source: string): string {
  let translated = "";
  let changed = false;
  let index = 0;

  while (index < source.length) {
    const candidates = fragmentTranslations.get(source[index]);
    const match = candidates?.find(([candidate]) => source.startsWith(candidate, index));
    if (!match) {
      translated += source[index];
      index += 1;
      continue;
    }

    translated += match[1];
    index += match[0].length;
    changed = true;
  }

  return changed ? normalizeTranslatedPunctuation(translated) : source;
}

export function translateUiText(source: string): string {
  if (!containsHan(source)) return source;
  const dynamicTranslation = translateDynamicUiText(source);
  if (!containsHan(dynamicTranslation)) return dynamicTranslation;

  const trimmed = dynamicTranslation.trim();
  const exact = translations[trimmed];
  if (exact) return preserveOuterWhitespace(dynamicTranslation, exact);

  const fragmentTranslation = translateKnownFragments(dynamicTranslation);
  if (!containsHan(fragmentTranslation)) return fragmentTranslation;

  return fragmentTranslation.replace(HAN_RUN_PATTERN, (run) => {
    const normalized = run.trim();
    const translated = translations[normalized];
    return translated ? preserveOuterWhitespace(run, translated) : run;
  });
}

export function hasEnglishUiTranslation(source: string): boolean {
  return Boolean(translations[source.trim()]);
}
