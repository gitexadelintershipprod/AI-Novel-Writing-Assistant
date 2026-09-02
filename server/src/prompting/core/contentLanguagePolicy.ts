import { SystemMessage, type BaseMessage } from "@langchain/core/messages";
import type { PromptAsset } from "./promptTypes";

export const CONTENT_LANGUAGE = "ka" as const;
export const CONTENT_LOCALE = "ka-GE" as const;
export const GEORGIAN_CONTENT_POLICY_VERSION = "ka-GE@1" as const;

const GEORGIAN_CONTENT_POLICY = [
  `[content-language:${GEORGIAN_CONTENT_POLICY_VERSION}]`,
  "Treat the following rules as a mandatory output contract for this task.",
  "Write every reader-facing creative passage, title, summary, plan, explanation, review, recommendation, and every free-text JSON field in natural Georgian using the Mkhedruli script, except a field explicitly identified as an English image-provider prompt.",
  "Use idiomatic Georgian syntax, correct case marking, agreement, postpositions, and verb forms. Avoid English or Russian calques, translation-like phrasing, bureaucratic prose, and unnatural repetition.",
  "Keep JSON property names, schema keys, IDs, enum values, protocol tokens, routes, provider/model names, and other machine-readable values exactly as specified.",
  "Preserve user-supplied proper nouns when appropriate, but do not switch the surrounding prose away from Georgian.",
  "Do not output Chinese prose or Chinese-language explanations. If source context is Chinese, understand it and express the result in Georgian.",
  "When a strict JSON or formatting contract is present, satisfy both that contract and this Georgian-language contract.",
].join("\n");

export function applyContentLanguagePolicy<I, O, R>(
  asset: PromptAsset<I, O, R>,
  messages: BaseMessage[],
): BaseMessage[] {
  if (asset.language !== CONTENT_LANGUAGE) {
    return messages;
  }
  return [new SystemMessage(GEORGIAN_CONTENT_POLICY), ...messages];
}
