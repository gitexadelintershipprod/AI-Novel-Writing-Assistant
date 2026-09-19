import type { BaseMessageChunk } from "@langchain/core/messages";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { streamTextPrompt } from "../../prompting/core/promptRunner";
import {
  writingFormulaApplyGenerateStreamPrompt,
  writingFormulaApplyRewriteStreamPrompt,
  writingFormulaExtractStreamPrompt,
} from "../../prompting/prompts/writingFormula/writingFormulaStream.prompts";

interface ExtractFormulaInput {
  name: string;
  sourceText: string;
  extractLevel: "basic" | "standard" | "deep";
  focusAreas: string[];
  provider?: LLMProvider;
  model?: string;
}

interface ApplyFormulaInput {
  formulaId?: string;
  formulaContent?: string;
  mode: "rewrite" | "generate";
  sourceText?: string;
  topic?: string;
  targetLength?: number;
  provider?: LLMProvider;
  model?: string;
}

function pickSection(content: string, heading: string): string | undefined {
  const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
  const matched = content.match(regex)?.[0];
  if (!matched) {
    return undefined;
  }
  return matched.replace(new RegExp(`##\\s*${heading}`, "i"), "").trim();
}

export class WritingFormulaService {
  async listFormulas() {
    return prisma.writingFormula.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  async getFormulaById(id: string) {
    return prisma.writingFormula.findUnique({
      where: { id },
    });
  }

  async deleteFormula(id: string) {
    await prisma.writingFormula.delete({
      where: { id },
    });
  }

  async createExtractStream(input: ExtractFormulaInput) {
    const streamed = await streamTextPrompt({
      asset: writingFormulaExtractStreamPrompt,
      promptInput: {
        extractLevel: input.extractLevel,
        focusAreas: input.focusAreas,
        sourceText: input.sourceText,
      },
      options: {
        provider: input.provider ?? "deepseek",
        model: input.model,
        temperature: 0.6,
      },
    });

    return {
      stream: streamed.stream as AsyncIterable<BaseMessageChunk>,
      onDone: async (fullContent: string) => {
        await prisma.writingFormula.create({
          data: {
            name: input.name,
            sourceText: input.sourceText,
            content: fullContent,
            style: pickSection(fullContent, "Overall style positioning"),
            formulaDescription: pickSection(fullContent, "Core writing techniques (with source examples)"),
            formulaSteps: pickSection(fullContent, "Reusable writing formula"),
            applicationTips: pickSection(fullContent, "Usage guide (how to write new text with this formula)"),
          },
        });
      },
    };
  }

  async createApplyStream(input: ApplyFormulaInput) {
    const formulaContent =
      input.formulaContent ??
      (input.formulaId
        ? (await prisma.writingFormula.findUnique({ where: { id: input.formulaId } }))?.content
        : undefined);

    if (!formulaContent) {
      throw new Error("No usable writing formula content was found.");
    }

    const baseOptions = {
      provider: input.provider ?? "deepseek",
      model: input.model,
      temperature: input.mode === "rewrite" ? 0.7 : 0.7,
    };

    if (input.mode === "rewrite") {
      if (!input.sourceText) {
        throw new Error("Rewrite mode requires sourceText.");
      }
      const streamed = await streamTextPrompt({
        asset: writingFormulaApplyRewriteStreamPrompt,
        promptInput: {
          formulaContent,
          sourceText: input.sourceText,
        },
        options: baseOptions,
      });
      return {
        stream: streamed.stream as AsyncIterable<BaseMessageChunk>,
      };
    }

    if (!input.topic) {
      throw new Error("Generate mode requires topic.");
    }
    const targetLength = input.targetLength ?? 1200;
    const streamed = await streamTextPrompt({
      asset: writingFormulaApplyGenerateStreamPrompt,
      promptInput: {
        formulaContent,
        topic: input.topic,
        targetLength,
      },
      options: baseOptions,
    });
    return {
      stream: streamed.stream as AsyncIterable<BaseMessageChunk>,
    };
  }
}
