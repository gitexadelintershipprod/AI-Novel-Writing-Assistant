import type { Character, CharacterVisibleProfileField } from "@ai-novel/shared/types/novel";
import type { CharacterResourceLedgerItem } from "@ai-novel/shared/types/characterResource";
import { isProtagonistCharacter } from "../characterAssetWorkspace.helpers";

export const VISIBLE_PROFILE_FIELDS: Array<{
  key: CharacterVisibleProfileField;
  label: string;
  placeholder: string;
}> = [
  { key: "appearance", label: "Appearance memory point", placeholder: "Eyebrows, hairstyle, facial expressions and other facial features that can be remembered by readers" },
  { key: "physique", label: "body base", placeholder: "Age, body shape, posture, physical condition base" },
  { key: "attireStyle", label: "common wear", placeholder: "Daily wear, status appearance, class or occupation traces" },
  { key: "signatureDetail", label: "Signature detail", placeholder: "Tokens, actions, mini-habits, smells, or recurring details" },
  { key: "voiceTexture", label: "tone of voice", placeholder: "Voice, speaking rhythm, sentence patterns, and tone" },
  { key: "presenceImpression", label: "First impression", placeholder: "The intuitive feeling given to readers when first or regularly appearing" },
];

export function getSecretStatus(selectedCharacter?: Character): string {
  if (!selectedCharacter) {
    return "None yet";
  }
  if (selectedCharacter.secret?.trim()) {
    return "There is a clear secret";
  }
  const runtimeSignal = `${selectedCharacter.currentState ?? ""} ${selectedCharacter.currentGoal ?? ""}`;
  return /secret|hidden|undercover|disguise/i.test(runtimeSignal) ? "Key information has been hidden" : "No explicit secret yet";
}

export function getEmotionSignal(selectedCharacter?: Character): string {
  const runtimeSignal = `${selectedCharacter?.currentState ?? ""} ${selectedCharacter?.currentGoal ?? ""}`;
  if (/anger|angry|anxious|despair|rage/i.test(runtimeSignal)) {
    return "high pressure";
  }
  if (/calm|steady|composed/i.test(runtimeSignal)) {
    return "Smooth";
  }
  return "To be seen";
}

export function getResourceDisplayMode(character?: Character): {
  label: string;
  helper: string;
  limit: number;
  shouldShowResource: (item: CharacterResourceLedgerItem) => boolean;
} {
  const roleText = `${character?.role ?? ""} ${character?.castRole ?? ""}`;
  if (isProtagonistCharacter(character)) {
    return {
      label: "Complete resources of the protagonist",
      helper: "The protagonist will fully display the props, clues, identity credentials, trump cards and consumption status. Subsequent chapters will give priority to referring to these action boundaries.",
      limit: 10,
      shouldShowResource: () => true,
    };
  }
  if (/temporary|cameo|one-off|extra/i.test(roleText)) {
    return {
      label: "Temporary role resources",
      helper: "Temporary characters only display resources that will be reused across chapters, affect conflicts, bind foreshadowing, or be taken away by the protagonist.",
      limit: 5,
      shouldShowResource: (item) => (
        item.narrativeFunction === "promise"
        || item.narrativeFunction === "hidden_card"
        || item.expectedUseEndChapterOrder != null
        || item.status === "transferred"
      ),
    };
  }
  return {
    label: "Key resources for long-term roles",
    helper: "Long-term characters prioritize resources that change action choices, relationship stakes, reader knowledge, or foreshadowing.",
    limit: 6,
    shouldShowResource: (item) => item.status !== "stale",
  };
}

export function getResourceStatusLabel(status: CharacterResourceLedgerItem["status"]): string {
  const labels: Record<CharacterResourceLedgerItem["status"], string> = {
    available: "Available",
    hidden: "hide",
    borrowed: "borrow",
    transferred: "transfer",
    lost: "lost",
    consumed: "Consumed",
    damaged: "damaged",
    destroyed: "destroy",
    stale: "fade out",
  };
  return labels[status] ?? status;
}

export function getResourceFunctionLabel(value: CharacterResourceLedgerItem["narrativeFunction"]): string {
  const labels: Record<CharacterResourceLedgerItem["narrativeFunction"], string> = {
    tool: "Tools",
    clue: "clues",
    weapon: "weapons",
    proof: "evidence",
    key: "key",
    cost: "cost",
    promise: "Foreshadowing",
    hidden_card: "trump card",
    constraint: "Limit",
  };
  return labels[value] ?? value;
}
