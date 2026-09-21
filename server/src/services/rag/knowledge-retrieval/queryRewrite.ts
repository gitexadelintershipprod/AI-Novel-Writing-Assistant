import { containsGeorgianScript } from "../chunking";
import { ragKnowledgeQueryRewritePrompt } from "../../../prompting/prompts/rag/knowledgeQueryRewrite.prompts";

export interface KnowledgeQueryRewriteResult {
  searchText: string;
  phrases: string[];
  rewritten: boolean;
}

type StructuredPromptRunner = typeof import("../../../prompting/core/promptRunner")["runStructuredPrompt"];

const runRewritePrompt: StructuredPromptRunner = async (input) => {
  const { runStructuredPrompt } = await import("../../../prompting/core/promptRunner");
  return runStructuredPrompt(input);
};

export class KnowledgeQueryRewriteService {
  constructor(private readonly promptRunner: StructuredPromptRunner = runRewritePrompt) {}

  async rewrite(query: string): Promise<KnowledgeQueryRewriteResult> {
    const trimmed = query.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return { searchText: query, phrases: [], rewritten: false };
    }
    if (!containsGeorgianScript(trimmed)) {
      return { searchText: trimmed, phrases: [trimmed], rewritten: false };
    }
    try {
      const result = await this.promptRunner({
        asset: ragKnowledgeQueryRewritePrompt,
        promptInput: { query: trimmed },
        options: {
          timeoutMs: 15000,
          maxTokens: 220,
          temperature: 0.1,
          entrypoint: "rag_knowledge_query_rewrite",
          triggerReason: "knowledge_document_retrieval",
        },
      });
      const phrases = (result.output.queries ?? [])
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (phrases.length === 0) {
        return { searchText: trimmed, phrases: [trimmed], rewritten: false };
      }
      return {
        searchText: phrases.join(" "),
        phrases,
        rewritten: true,
      };
    } catch {
      return { searchText: trimmed, phrases: [trimmed], rewritten: false };
    }
  }
}
