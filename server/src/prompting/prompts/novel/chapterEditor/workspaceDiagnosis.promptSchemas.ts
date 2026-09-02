import { z } from "zod";
function normalizeWorkspaceDiagnosticAction(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    const normalized = value.trim();
    switch (normalized) {
        case "Optimize expression":
            return "polish";
        case "Expand":
            return "expand";
        case "Streamline":
            return "compress";
        case "Strengthen mood":
            return "emotion";
        case "intensify conflict":
            return "conflict";
        default:
            return normalized;
    }
}
const workspaceDiagnosticActionSchema = z.preprocess(normalizeWorkspaceDiagnosticAction, z.enum(["polish", "expand", "compress", "emotion", "conflict"]));
const workspaceDiagnosticScopeSchema = z.enum(["selection", "chapter"]);
const workspaceDiagnosticSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const chapterEditorWorkspaceDiagnosticCardSchema = z.object({
    title: z.string().trim().min(1).max(60),
    problemSummary: z.string().trim().min(1).max(220),
    whyItMatters: z.string().trim().min(1).max(220),
    recommendedAction: workspaceDiagnosticActionSchema,
    recommendedScope: workspaceDiagnosticScopeSchema,
    paragraphStart: z.number().int().min(1).nullable().optional(),
    paragraphEnd: z.number().int().min(1).nullable().optional(),
    severity: workspaceDiagnosticSeveritySchema,
    sourceTags: z.array(z.string().trim().min(1).max(24)).max(4).default([]),
});
export const chapterEditorWorkspaceRecommendedTaskSchema = z.object({
    title: z.string().trim().min(1).max(60),
    summary: z.string().trim().min(1).max(220),
    recommendedAction: workspaceDiagnosticActionSchema,
    recommendedScope: workspaceDiagnosticScopeSchema,
    paragraphStart: z.number().int().min(1).nullable().optional(),
    paragraphEnd: z.number().int().min(1).nullable().optional(),
});
export const chapterEditorWorkspaceDiagnosisSchema = z.object({
    cards: z.array(chapterEditorWorkspaceDiagnosticCardSchema).min(1).max(4),
    recommendedTask: chapterEditorWorkspaceRecommendedTaskSchema.optional(),
});
export type ChapterEditorWorkspaceDiagnosisParsed = z.infer<typeof chapterEditorWorkspaceDiagnosisSchema>;
