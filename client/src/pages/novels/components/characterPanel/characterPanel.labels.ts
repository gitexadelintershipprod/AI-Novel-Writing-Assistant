import type {
  CharacterCastRole,
  CharacterGender,
  SupplementalCharacterCandidate,
  SupplementalCharacterGenerationMode,
} from "@ai-novel/shared/types/novel";

export const CAST_ROLE_LABELS: Record<CharacterCastRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Main opponent",
  ally: "Ally",
  foil: "Foil",
  mentor: "Mentor",
  love_interest: "Romantic pull",
  pressure_source: "Pressure source",
  catalyst: "Catalyst",
};

export const CHARACTER_GENDER_LABELS: Record<CharacterGender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  unknown: "Unknown",
};

export const SUPPLEMENTAL_MODE_LABELS: Record<SupplementalCharacterGenerationMode, string> = {
  auto: "Let AI decide",
  linked: "Fill a relationship gap",
  independent: "Add an independent role",
};

export function getCastRoleLabel(castRole?: CharacterCastRole | "auto" | null): string {
  if (!castRole || castRole === "auto") {
    return "Let AI decide";
  }
  return CAST_ROLE_LABELS[castRole] ?? castRole;
}

export function getCharacterGenderLabel(gender?: CharacterGender | null): string {
  if (!gender) {
    return "Unknown";
  }
  return CHARACTER_GENDER_LABELS[gender] ?? gender;
}

export function getSupplementalRelationLabel(
  candidate: SupplementalCharacterCandidate,
  relation: SupplementalCharacterCandidate["relations"][number],
): string {
  if (relation.sourceName === candidate.name) {
    return relation.targetName;
  }
  if (relation.targetName === candidate.name) {
    return relation.sourceName;
  }
  return `${relation.sourceName} -> ${relation.targetName}`;
}
