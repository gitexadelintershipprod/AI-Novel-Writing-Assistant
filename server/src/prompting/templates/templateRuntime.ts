import type { BaseMessage } from "@langchain/core/messages";
import type { PromptAsset, PromptRenderContext } from "../core/promptTypes";
import { compilePromptTemplate, hasBlockingPromptTemplateDiagnostics } from "./templateCompiler";
import { promptTemplateOverrideService } from "./PromptTemplateOverrideService";
import { getRequiredTemplateContextGroups, supportsAdvancedPromptTemplate } from "./templateTypes";

function getAllowedTemplateContextGroups(asset: PromptAsset<unknown, unknown, unknown>): string[] {
  return [
    ...new Set([
      ...(asset.contextRequirements ?? []).map((requirement) => requirement.group),
      ...(asset.contextPolicy.requiredGroups ?? []),
      ...(asset.contextPolicy.preferredGroups ?? []),
      ...(asset.contextPolicy.dropOrder ?? []),
    ]),
  ];
}

export async function resolveAdvancedPromptMessages<I, O, R = O>(input: {
  asset: PromptAsset<I, O, R>;
  promptInput: I;
  context: PromptRenderContext;
  officialMessages: BaseMessage[];
  novelId?: string;
}): Promise<BaseMessage[]> {
  if (!supportsAdvancedPromptTemplate(input.asset.id) || !input.novelId) {
    return input.officialMessages;
  }
  const activeTemplate = await promptTemplateOverrideService.getActiveCustomTemplate({
    promptId: input.asset.id,
    novelId: input.novelId,
  });
  if (!activeTemplate) {
    return input.officialMessages;
  }
  const compiled = compilePromptTemplate({
    template: activeTemplate.template,
    promptInput: input.promptInput,
    context: input.context,
    slotDefs: input.asset.slots ?? [],
    slots: input.context.slots,
    allowedContextGroups: getAllowedTemplateContextGroups(input.asset as PromptAsset<unknown, unknown, unknown>),
    requiredContextGroups: getRequiredTemplateContextGroups(input.asset.id),
  });
  if (hasBlockingPromptTemplateDiagnostics(compiled.diagnostics)) {
    const details = [
      compiled.diagnostics.invalidMessages.join("; "),
      compiled.diagnostics.unknownTokens.length > 0
        ? `Unknown tokens: ${compiled.diagnostics.unknownTokens.join(", ")}`
        : "",
      compiled.diagnostics.missingRequiredGroups.length > 0
        ? `Missing required context groups: ${compiled.diagnostics.missingRequiredGroups.join(", ")}`
        : "",
    ].filter(Boolean).join("; ");
    throw new Error(`Advanced prose template rendering failed: ${details}`);
  }
  return compiled.messages;
}
