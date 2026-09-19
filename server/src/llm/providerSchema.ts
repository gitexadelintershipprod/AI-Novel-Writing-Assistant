import { z } from "zod";

export const llmProviderSchema = z.string().trim().min(1, "Provider cannot be empty.");
