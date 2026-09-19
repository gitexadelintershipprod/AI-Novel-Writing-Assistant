import type {
  RuntimeAuditIssue,
  RuntimeAuditReport,
} from "@ai-novel/shared/types/chapterRuntime";

export type ProseQualityIssueCode =
  | "prose_negative_flip"
  | "prose_dash_or_ellipsis"
  | "prose_period_stutter"
  | "prose_long_paragraph"
  | "prose_verbatim_repeat"
  | "prose_truncation"
  | "prose_ai_self_reference"
  | "prose_placeholder_leak"
  | "prose_engineering_term_leak";

export interface ProseQualityFinding {
  code: ProseQualityIssueCode;
  severity: RuntimeAuditIssue["severity"];
  line: number;
  column: number;
  message: string;
  excerpt: string;
  fixSuggestion: string;
}

export interface ProseQualityReport {
  findings: ProseQualityFinding[];
  hasBlockingFindings: boolean;
}

export interface ProseQualityAuditReportInput {
  novelId: string;
  chapterId: string;
  report: ProseQualityReport;
  now?: Date;
}

interface TextSegment {
  text: string;
  line: number;
}

const MAX_FINDINGS_PER_CODE = 8;
const MAX_TOTAL_FINDINGS = 40;

const TERMINAL_PUNCTUATION = /[。！？!?”"」』）)】》…]$/u;
const NEGATIVE_FLIP_PATTERN = /(?:不是|并非|并不是|不算|不能说是|没有|不再是)[^。！？；;\n]{1,36}?[，,、]?\s*(?:而是|却是|反而是|更像是|只是)[^。！？；;\n]{1,36}/gu;
const DASH_OR_ELLIPSIS_PATTERN = /——|—|--|……|…{2,}|\.{3,}/u;
const AI_SELF_REFERENCE_PATTERN = /作为(?:一名|一个)?(?:AI|人工智能|语言模型)|我是(?:AI|人工智能|语言模型)|我无法(?:继续)?(?:创作|生成|提供|完成)|我不能(?:继续)?(?:创作|生成|提供|完成)|无法满足(?:该|这个)?请求|不能协助|as an AI|I (?:am|cannot|can't)[^。！？.!?\n]{0,40}AI/iu;
const PLACEHOLDER_PATTERN = /TODO|TBD|待补充|此处省略|省略若干|略写|占位|PLACEHOLDER|\{\{[^}]{0,80}\}\}|\[[^\]]{0,40}待补[^\]]{0,40}\]/iu;
const ENGINEERING_TERM_STRONG_PATTERN = /细纲|情节点|卷纲|功能标签|目标情绪|字数目标|章首钩子|章尾钩子|任务描述|任务单|scene\s*card|prompt|schema|runtime\s*package|上下文包|System prompt word|修复指令/iu;
const ENGINEERING_TERM_SOFT_PATTERN = /本章|下一章|读者|伏笔|前文|后文|plot advancement|人物弧光|爽点|节奏点|钩子/u;

export function detectProseQuality(content: string): ProseQualityReport {
  const segments = buildTextSegments(content);
  const findings: ProseQualityFinding[] = [];
  const counts = new Map<ProseQualityIssueCode, number>();

  const addFinding = (finding: ProseQualityFinding) => {
    if (findings.length >= MAX_TOTAL_FINDINGS) {
      return;
    }
    const currentCount = counts.get(finding.code) ?? 0;
    if (currentCount >= MAX_FINDINGS_PER_CODE) {
      return;
    }
    const duplicated = findings.some((existing) => (
      existing.code === finding.code
      && existing.line === finding.line
      && existing.excerpt === finding.excerpt
    ));
    if (duplicated) {
      return;
    }
    counts.set(finding.code, currentCount + 1);
    findings.push(finding);
  };

  for (const segment of segments) {
    scanNegativeFlip(segment, addFinding);
    scanDashOrEllipsis(segment, addFinding);
    scanAiSelfReference(segment, addFinding);
    scanPlaceholderLeak(segment, addFinding);
    scanEngineeringTermLeak(segment, addFinding);
    scanPeriodStutter(segment, addFinding);
    scanLongParagraph(segment, addFinding);
  }

  scanVerbatimRepeat(segments, addFinding);
  scanTruncation(content, segments, addFinding);

  return {
    findings,
    hasBlockingFindings: findings.some((finding) => (
      finding.severity === "high" || finding.severity === "critical"
    )),
  };
}

export function buildProseQualityAuditReport(
  input: ProseQualityAuditReportInput,
): RuntimeAuditReport | null {
  if (input.report.findings.length === 0) {
    return null;
  }
  const createdAt = (input.now ?? new Date()).toISOString();
  const reportId = `prose-quality:${input.novelId}:${input.chapterId}`;
  const issues = input.report.findings.map<RuntimeAuditIssue>((finding, index) => ({
    id: `${reportId}:${index + 1}:${finding.code}`,
    reportId,
    auditType: "mode_fit",
    severity: finding.severity,
    code: finding.code,
    description: finding.message,
    evidence: `Line ${finding.line}: ${finding.excerpt}`,
    fixSuggestion: finding.fixSuggestion,
    status: "open",
    createdAt,
    updatedAt: createdAt,
  }));

  return {
    id: reportId,
    novelId: input.novelId,
    chapterId: input.chapterId,
    auditType: "mode_fit",
    overallScore: scoreFindings(input.report.findings),
    summary: `Prose naturalness detection found ${issues.length} issues.`,
    legacyScoreJson: null,
    issues,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildTextSegments(content: string): TextSegment[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const segments: TextSegment[] = [];
  let inFence = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(```|~~~)/u.test(trimmed)) {
      inFence = !inFence;
      return;
    }
    if (inFence || trimmed.length === 0 || trimmed.startsWith(">")) {
      return;
    }
    segments.push({
      text: line,
      line: index + 1,
    });
  });
  return segments;
}

function scanNegativeFlip(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  for (const match of segment.text.matchAll(NEGATIVE_FLIP_PATTERN)) {
    const index = match.index ?? 0;
    if (isInsideQuote(segment.text, index) || /不是[^。！？；;\n]{1,16}就是/u.test(match[0])) {
      continue;
    }
    addFinding({
      code: "prose_negative_flip",
      severity: "high",
      line: segment.line,
      column: index + 1,
      message: "The draft uses frequent AI-style “not A, but B” flips, which reads conceptual and templated.",
      excerpt: formatExcerpt(match[0]),
      fixSuggestion: "Rewrite as concrete action, sensory detail, or a character judgment instead of explaining the theme with “not A, but B”.",
    });
  }
}

function scanDashOrEllipsis(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  const match = segment.text.match(DASH_OR_ELLIPSIS_PATTERN);
  if (!match || match.index == null) {
    return;
  }
  addFinding({
    code: "prose_dash_or_ellipsis",
    severity: "high",
    line: segment.line,
    column: match.index + 1,
    message: "The draft uses dashes, ellipses, or double hyphens in a way that creates mechanical pauses.",
    excerpt: formatExcerpt(segment.text),
    fixSuggestion: "Rewrite as a natural action pause, sentence break, or character reaction instead of manufacturing emotion with mechanical punctuation.",
  });
}

function scanAiSelfReference(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  const match = segment.text.match(AI_SELF_REFERENCE_PATTERN);
  if (!match || match.index == null || isInsideQuote(segment.text, match.index)) {
    return;
  }
  addFinding({
    code: "prose_ai_self_reference",
    severity: "critical",
    line: segment.line,
    column: match.index + 1,
    message: "The draft leaks AI identity, refusal phrasing, or model explanation.",
    excerpt: formatExcerpt(segment.text),
    fixSuggestion: "Remove AI self-talk and refusal phrasing, and rewrite it as narration that fits the character and scene.",
  });
}

function scanPlaceholderLeak(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  const match = segment.text.match(PLACEHOLDER_PATTERN);
  if (!match || match.index == null || isInsideQuote(segment.text, match.index)) {
    return;
  }
  addFinding({
    code: "prose_placeholder_leak",
    severity: "critical",
    line: segment.line,
    column: match.index + 1,
    message: "The draft contains placeholders, unfinished notes, or omission markers.",
    excerpt: formatExcerpt(segment.text),
    fixSuggestion: "Fill it out into complete readable plot. Do not leave placeholders for the reader.",
  });
}

function scanEngineeringTermLeak(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  const strongMatch = segment.text.match(ENGINEERING_TERM_STRONG_PATTERN);
  if (strongMatch?.index != null && !isInsideQuote(segment.text, strongMatch.index)) {
    addFinding({
      code: "prose_engineering_term_leak",
      severity: "high",
      line: segment.line,
      column: strongMatch.index + 1,
      message: "The draft leaks task-sheet, outline, prompt, or runtime engineering terms.",
      excerpt: formatExcerpt(segment.text),
      fixSuggestion: "Remove engineering terms and writing instructions, and rewrite the information as character action, environmental change, or a narrative result.",
    });
    return;
  }

  const softMatch = segment.text.match(ENGINEERING_TERM_SOFT_PATTERN);
  if (softMatch?.index != null && !isInsideQuote(segment.text, softMatch.index)) {
    addFinding({
      code: "prose_engineering_term_leak",
      severity: "medium",
      line: segment.line,
      column: softMatch.index + 1,
      message: "The draft uses meta-narrative craft terms that can break immersion.",
      excerpt: formatExcerpt(segment.text),
      fixSuggestion: "Turn author-facing or reader-facing explanation into action, consequence, or information gap that exists inside the story.",
    });
  }
}

function scanPeriodStutter(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  if (lineLooksLikeDialogue(segment.text)) {
    return;
  }
  const matches = Array.from(segment.text.matchAll(/[^。！？!?]{1,8}[。！？!?]/gu))
    .map((match) => match[0])
    .filter((sentence) => visibleLength(sentence) <= 8);
  if (matches.length < 6) {
    return;
  }
  addFinding({
    code: "prose_period_stutter",
    severity: "medium",
    line: segment.line,
    column: 1,
    message: "The draft uses too many consecutive short sentences, so the rhythm feels fragmented and mechanical.",
    excerpt: formatExcerpt(matches.slice(0, 6).join("")),
    fixSuggestion: "Merge some short sentences and use action chains, gaze shifts, or interior continuity for a more natural paragraph rhythm.",
  });
}

function scanLongParagraph(
  segment: TextSegment,
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  if (visibleLength(segment.text) <= 220) {
    return;
  }
  addFinding({
    code: "prose_long_paragraph",
    severity: "medium",
    line: segment.line,
    column: 1,
    message: "This paragraph is too long, which hurts reading rhythm and mobile readability.",
    excerpt: formatExcerpt(segment.text),
    fixSuggestion: "Split it at action turns, information reveals, or emotional shifts.",
  });
}

function scanVerbatimRepeat(
  segments: TextSegment[],
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  for (let index = 1; index < segments.length; index += 1) {
    const previous = normalizeRepeatText(segments[index - 1].text);
    const current = normalizeRepeatText(segments[index].text);
    if (previous.length >= 8 && previous === current) {
      addFinding({
        code: "prose_verbatim_repeat",
        severity: "critical",
        line: segments[index].line,
        column: 1,
        message: "Adjacent paragraphs repeat the same wording.",
        excerpt: formatExcerpt(segments[index].text),
        fixSuggestion: "Delete repeated paragraphs and keep the version that advances information more clearly.",
      });
    }
  }

  const sentenceMap = new Map<string, { sentence: string; line: number; count: number }>();
  for (const segment of segments) {
    for (const sentence of splitSentences(stripQuotedText(segment.text))) {
      const normalized = normalizeRepeatText(sentence);
      if (normalized.length < 12) {
        continue;
      }
      const item = sentenceMap.get(normalized) ?? {
        sentence,
        line: segment.line,
        count: 0,
      };
      item.count += 1;
      sentenceMap.set(normalized, item);
    }
  }
  for (const item of sentenceMap.values()) {
    if (item.count >= 3) {
      addFinding({
        code: "prose_verbatim_repeat",
        severity: "critical",
        line: item.line,
        column: 1,
        message: "The same sentence, or a near-identical sentence, repeats too many times.",
        excerpt: formatExcerpt(item.sentence),
        fixSuggestion: "Keep one effective phrasing and rewrite the rest as new action, reaction, or information.",
      });
    }
  }
}

function scanTruncation(
  content: string,
  segments: TextSegment[],
  addFinding: (finding: ProseQualityFinding) => void,
): void {
  const trimmed = content.trim();
  if (visibleLength(trimmed) < 80 || TERMINAL_PUNCTUATION.test(trimmed)) {
    return;
  }
  const lastSegment = segments[segments.length - 1];
  addFinding({
    code: "prose_truncation",
    severity: "critical",
    line: lastSegment?.line ?? 1,
    column: Math.max(1, (lastSegment?.text.length ?? trimmed.length) - 20),
    message: "The draft ending is missing a complete sentence stop, so generation may have been interrupted or cut off.",
    excerpt: formatExcerpt(lastSegment?.text ?? trimmed),
    fixSuggestion: "Complete the closing sentence, action result, and chapter wrap-up so the draft does not stop mid-sentence.",
  });
}

function splitSentences(text: string): string[] {
  return Array.from(text.matchAll(/[^。！？!?]+[。！？!?]/gu)).map((match) => match[0]);
}

function normalizeRepeatText(text: string): string {
  return text
    .replace(/[「」『』“”‘’"'（）()[\]【】《》<>]/gu, "")
    .replace(/\s+/gu, "")
    .trim();
}

function stripQuotedText(text: string): string {
  return text
    .replace(/「[^」]*」/gu, "")
    .replace(/『[^』]*』/gu, "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"]*"/gu, "");
}

function isInsideQuote(text: string, index: number): boolean {
  const pairs: Array<[string, string]> = [
    ["「", "」"],
    ["『", "』"],
    ["“", "”"],
    ["\"", "\""],
    ["'", "'"],
  ];
  return pairs.some(([open, close]) => {
    const before = text.slice(0, index);
    const openIndex = before.lastIndexOf(open);
    if (openIndex < 0) {
      return false;
    }
    const closeIndex = text.indexOf(close, openIndex + open.length);
    return closeIndex >= index;
  });
}

function lineLooksLikeDialogue(text: string): boolean {
  const trimmed = text.trim();
  return /^["“「『]/u.test(trimmed) || /[」』”"]$/u.test(trimmed);
}

function visibleLength(text: string): number {
  return text.replace(/\s+/gu, "").length;
}

function formatExcerpt(text: string): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function scoreFindings(findings: ProseQualityFinding[]): number {
  const penalty = findings.reduce((total, finding) => {
    switch (finding.severity) {
      case "critical":
        return total + 18;
      case "high":
        return total + 12;
      case "medium":
        return total + 6;
      case "low":
        return total + 3;
      default:
        return total;
    }
  }, 0);
  return Math.max(30, 100 - penalty);
}
