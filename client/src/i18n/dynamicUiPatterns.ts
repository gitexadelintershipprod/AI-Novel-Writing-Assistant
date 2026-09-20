interface DynamicUiPattern {
  pattern: RegExp;
  replace: (...groups: string[]) => string;
}

const DYNAMIC_UI_PATTERNS: DynamicUiPattern[] = [];

export function translateDynamicUiText(source: string): string {
  return DYNAMIC_UI_PATTERNS.reduce((value, entry) => (
    value.replace(entry.pattern, (_match, ...args: string[]) => entry.replace(...args))
  ), source);
}
