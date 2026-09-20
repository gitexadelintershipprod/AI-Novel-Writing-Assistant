import { z } from "zod";

export const genreTreeDraftNodeSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    // children are recursively normalized further during sanitize
    children: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type GenreTreeDraftNode = z.infer<typeof genreTreeDraftNodeSchema>;
