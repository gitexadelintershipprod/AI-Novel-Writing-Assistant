import legacyUi from "@/locales/en/legacy-ui.json";

const HAN_PATTERN = /[\p{Script=Han}]/u;
const HAN_RUN_PATTERN = /[\p{Script=Han}][\p{Script=Han}\s，。！？、：；（）《》“”‘’·…—-]*/gu;
const translations = legacyUi as Record<string, string>;

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

export function containsHan(value: string): boolean {
  return HAN_PATTERN.test(value);
}

export function translateUiText(source: string): string {
  if (!containsHan(source)) return source;
  const trimmed = source.trim();
  const exact = translations[trimmed];
  if (exact) return preserveOuterWhitespace(source, exact);

  return source.replace(HAN_RUN_PATTERN, (run) => {
    const normalized = run.trim();
    const translated = translations[normalized];
    return translated ? preserveOuterWhitespace(run, translated) : run;
  });
}

export function hasEnglishUiTranslation(source: string): boolean {
  return Boolean(translations[source.trim()]);
}
