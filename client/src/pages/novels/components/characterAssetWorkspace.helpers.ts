import type { Character, CharacterCastRole, CharacterGender } from "@ai-novel/shared/types/novel";

const CAST_ROLE_LABELS: Record<CharacterCastRole, string> = {
  protagonist: "Protagonist",
  antagonist: "Main opponent",
  ally: "Ally",
  foil: "Foil",
  mentor: "Mentor",
  love_interest: "Romantic pull",
  pressure_source: "Pressure source",
  catalyst: "Catalyst",
};

const CHARACTER_GENDER_LABELS: Record<CharacterGender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  unknown: "Unknown",
};

export function getCastRoleLabel(castRole?: CharacterCastRole | null): string {
  if (!castRole) {
    return "Undefined";
  }
  return CAST_ROLE_LABELS[castRole] ?? castRole;
}

export function getCharacterGenderLabel(gender?: CharacterGender | null): string {
  if (!gender) {
    return "Unknown";
  }
  return CHARACTER_GENDER_LABELS[gender] ?? gender;
}

export function isProtagonistCharacter(character?: Character | null): boolean {
  if (!character) {
    return false;
  }
  if (character.castRole) {
    return character.castRole === "protagonist";
  }
  const roleText = character.role ?? "";
  return /protagonist/i.test(roleText);
}
