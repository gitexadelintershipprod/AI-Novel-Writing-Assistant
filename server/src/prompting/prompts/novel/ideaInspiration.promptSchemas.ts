import { z } from "zod";
export const directorIdeaInspirationAngles = [
    "Cool, strong hook",
    "character growth line",
    "Set the wonder line",
    "relationship traction line",
    "suspense tracing line",
] as const;
export const directorIdeaInspirationSchema = z.object({
    ideas: z.array(z.object({
        angle: z.enum(directorIdeaInspirationAngles),
        text: z.string().trim().min(45).max(140),
        tags: z.array(z.string().trim().min(1).max(12)).min(2).max(4),
    })).length(5),
});
