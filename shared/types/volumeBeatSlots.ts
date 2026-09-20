export const VOLUME_BEAT_REQUIRED_SLOT_KEYS = [
  "open_hook",
  "first_escalation",
  "midpoint_turn",
  "pressure_lock",
  "climax",
  "end_hook",
] as const;

export const VOLUME_BEAT_OPTIONAL_SLOT_KEYS = [
  "early_complication",
  "late_complication",
] as const;

export type VolumeBeatRequiredSlotKey = (typeof VOLUME_BEAT_REQUIRED_SLOT_KEYS)[number];
export type VolumeBeatOptionalSlotKey = (typeof VOLUME_BEAT_OPTIONAL_SLOT_KEYS)[number];
export type VolumeBeatSlotKey = VolumeBeatRequiredSlotKey | VolumeBeatOptionalSlotKey;

export interface VolumeBeatSlotDefinition {
  key: VolumeBeatSlotKey;
  roleLabel: string;
  required: boolean;
  order: number;
  aliases: string[];
}

export const VOLUME_BEAT_SLOT_DEFINITIONS: VolumeBeatSlotDefinition[] = [
  {
    key: "open_hook",
    roleLabel: "Opening hook",
    required: true,
    order: 1,
    aliases: ["opening", "open", "hook", "Opening hook"],
  },
  {
    key: "first_escalation",
    roleLabel: "First escalation",
    required: true,
    order: 2,
    aliases: ["first_upgrade", "First escalation"],
  },
  {
    key: "early_complication",
    roleLabel: "Early complication",
    required: false,
    order: 3,
    aliases: ["early_turn", "Early complication"],
  },
  {
    key: "midpoint_turn",
    roleLabel: "Midpoint turn",
    required: true,
    order: 4,
    aliases: ["midpoint", "mid_turn", "Midpoint turn"],
  },
  {
    key: "pressure_lock",
    roleLabel: "Pre-climax pressure",
    required: true,
    order: 5,
    aliases: ["pressure", "pre_climax", "Pre-climax pressure"],
  },
  {
    key: "late_complication",
    roleLabel: "Late complication",
    required: false,
    order: 6,
    aliases: ["late_turn", "Late complication"],
  },
  {
    key: "climax",
    roleLabel: "Volume climax",
    required: true,
    order: 7,
    aliases: ["climax_beat", "Volume climax"],
  },
  {
    key: "end_hook",
    roleLabel: "Ending hook",
    required: true,
    order: 8,
    aliases: ["end", "ending_hook", "Ending hook"],
  },
];

const SLOT_BY_KEY = new Map(VOLUME_BEAT_SLOT_DEFINITIONS.map((slot) => [slot.key, slot]));

function normalizeLookupToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-·・]+/g, "");
}

const SLOT_BY_ALIAS = new Map<string, VolumeBeatSlotDefinition>();
for (const slot of VOLUME_BEAT_SLOT_DEFINITIONS) {
  SLOT_BY_ALIAS.set(normalizeLookupToken(slot.key), slot);
  SLOT_BY_ALIAS.set(normalizeLookupToken(slot.roleLabel), slot);
  for (const alias of slot.aliases) {
    SLOT_BY_ALIAS.set(normalizeLookupToken(alias), slot);
  }
}

export function isVolumeBeatSlotKey(value: string): value is VolumeBeatSlotKey {
  return SLOT_BY_KEY.has(value as VolumeBeatSlotKey);
}

export function getVolumeBeatSlot(key: string | null | undefined): VolumeBeatSlotDefinition | null {
  if (!key) {
    return null;
  }
  return SLOT_BY_KEY.get(key as VolumeBeatSlotKey) ?? null;
}

export function resolveVolumeBeatSlotKey(raw: string | null | undefined): VolumeBeatSlotKey | null {
  if (!raw) {
    return null;
  }
  const direct = raw.trim();
  if (isVolumeBeatSlotKey(direct)) {
    return direct;
  }
  return SLOT_BY_ALIAS.get(normalizeLookupToken(direct))?.key ?? null;
}

export function getVolumeBeatRoleLabel(key: string | null | undefined, fallback = "Beat"): string {
  return getVolumeBeatSlot(key)?.roleLabel ?? fallback;
}

export function formatVolumeBeatDisplayLabel(input: {
  key?: string | null;
  label?: string | null;
  title?: string | null;
}): string {
  const roleLabel = getVolumeBeatRoleLabel(input.key, input.label?.trim() || "Beat");
  const title = input.title?.trim() || "";
  if (!title || title === roleLabel) {
    return roleLabel;
  }
  const composedPrefix = `${roleLabel} · `;
  if (title.startsWith(composedPrefix)) {
    return title;
  }
  return `${roleLabel} · ${title}`;
}

export function listMissingRequiredVolumeBeatKeys(keys: Array<string | null | undefined>): VolumeBeatRequiredSlotKey[] {
  const present = new Set(
    keys
      .map((key) => resolveVolumeBeatSlotKey(key) ?? (typeof key === "string" ? key.trim() : ""))
      .filter(Boolean),
  );
  return VOLUME_BEAT_REQUIRED_SLOT_KEYS.filter((key) => !present.has(key));
}
