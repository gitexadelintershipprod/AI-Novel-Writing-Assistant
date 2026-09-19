export interface CharacterProfileKeyRelation {
  targetName: string;
  relationType: string;
  description?: string;
}

export interface CharacterProfileHighlightScene {
  sceneLabel: string;
  performance: string;
}

export interface CharacterProfile {
  name: string;
  aliases?: string[];
  age?: string;
  gender?: string;
  role: string;
  appearance?: string;
  physique?: string;
  attireStyle?: string;
  signatureDetail?: string;
  personality?: string;
  values?: string;
  speakingStyle?: string;
  outerGoal?: string;
  innerNeed?: string;
  fear?: string;
  wound?: string;
  misbelief?: string;
  arcStages?: string[];
  growthTrajectory?: string;
  keyRelations?: CharacterProfileKeyRelation[];
  highlightScenes?: CharacterProfileHighlightScene[];
}

export const CHARACTER_PROFILE_FIELD_LABELS: Readonly<Record<keyof CharacterProfile, string>> = {
  name: "Name",
  aliases: "Aliases",
  age: "Age",
  gender: "Gender",
  role: "Role",
  appearance: "Appearance",
  physique: "Physique",
  attireStyle: "Attire style",
  signatureDetail: "Signature detail",
  personality: "Personality",
  values: "Values",
  speakingStyle: "Speaking style",
  outerGoal: "Outer goal",
  innerNeed: "Inner need",
  fear: "Fear",
  wound: "Wound",
  misbelief: "Misbelief",
  arcStages: "Arc stages",
  growthTrajectory: "Growth path",
  keyRelations: "Key relations",
  highlightScenes: "Highlight scenes",
};

export const CHARACTER_PROFILE_TEXT_LIMITS: Readonly<Partial<Record<keyof CharacterProfile, number>>> = {
  name: 40,
  role: 80,
  appearance: 320,
  personality: 320,
  speakingStyle: 240,
  outerGoal: 240,
  innerNeed: 240,
  growthTrajectory: 360,
};
