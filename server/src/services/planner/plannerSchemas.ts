import { z } from "zod";
import type { PlannerOutput } from "./plannerOutputNormalization";

// Planner output should stay lenient: models may differ on field types (string vs array, etc.).
// The top level must still be an object, and scenes must be an array (or repairable into one).

const plannerSceneSchema = z.object({
  title: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  conflict: z.string().trim().optional(),
  reveal: z.string().trim().optional(),
  emotionBeat: z.string().trim().optional(),
}).passthrough();

export const plannerOutputSchema = z.object({
  title: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  participants: z.array(z.string().trim()).optional(),
  reveals: z.array(z.string().trim()).optional(),
  riskNotes: z.array(z.string().trim()).optional(),
  hookTarget: z.string().trim().optional(),
  planRole: z.enum(["setup", "progress", "pressure", "turn", "payoff", "cooldown"]).nullable().optional(),
  phaseLabel: z.string().trim().optional(),
  mustAdvance: z.array(z.string().trim()).optional(),
  mustPreserve: z.array(z.string().trim()).optional(),
  scenes: z.array(plannerSceneSchema).optional(),
}).passthrough();

export type PlannerOutputSchema = z.infer<typeof plannerOutputSchema> & Partial<PlannerOutput>;
