import { z } from "zod";

// Common Zod building blocks so different LLM outputs stay tolerant during validation.

// Accept `["a","b"]` or `"a,b"`-style string/array input, normalize to a unique trimmed string array.
export function stringOrArraySchema(maxItems: number) {
  const nonEmptyString = z.string().trim().min(1);
  return z
    .union([z.array(nonEmptyString), nonEmptyString])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .transform((list) => {
      const unique = Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
      return unique.slice(0, maxItems);
    });
}

// Tolerant enum: case-insensitive matching.
export function tolerantEnum<T extends string>(values: readonly T[]) {
  const lowerMap = new Map(values.map((v) => [v.toLowerCase(), v]));
  return z
    .string()
    .trim()
    .transform((v) => v.toLowerCase())
    .refine((v) => lowerMap.has(v), {
      message: `Invalid enum value. Expected one of: ${values.join(", ")}`,
    })
    .transform((v) => lowerMap.get(v) as T) as z.ZodType<T>;
}

// Tolerant number: allow string input like `"24"` and coerce to number.
export const coerceInt = z.coerce.number().int();

