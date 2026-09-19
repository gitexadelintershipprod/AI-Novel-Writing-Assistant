import {
  type BookFramingSuggestion,
  type BookFramingSuggestionInput,
} from "@ai-novel/shared/types/novelFraming";
import { runStructuredPrompt } from "../../prompting/core/promptRunner";
import { novelFramingSuggestionPrompt } from "../../prompting/prompts/novel/framing.prompts";

function buildInputSummary(input: BookFramingSuggestionInput): string {
  return [
    input.title?.trim() ? `书名：${input.title.trim()}` : "",
    input.description?.trim() ? `One sentence summary:${input.description.trim()}` : "",
    input.genreLabel?.trim() ? `作品类型：${input.genreLabel.trim()}` : "",
    input.styleTone?.trim() ? `当前Keywords for writing style:${input.styleTone.trim()}` : "",
  ].filter(Boolean).join("\n");
}

export class NovelFramingSuggestionService {
  async suggest(input: BookFramingSuggestionInput): Promise<BookFramingSuggestion> {
    if (!input.title?.trim() && !input.description?.trim()) {
      throw new Error("Enter at least a title or a one-sentence summary before asking AI to fill the rest.");
    }

    const inputSummary = buildInputSummary(input);
    const result = await runStructuredPrompt({
      asset: novelFramingSuggestionPrompt,
      promptInput: {
        inputSummary,
      },
      options: {
        provider: input.provider,
        model: input.model,
        temperature: Math.min(input.temperature ?? 0.5, 0.8),
      },
    });
    return result.output;
  }
}

export const novelFramingSuggestionService = new NovelFramingSuggestionService();
