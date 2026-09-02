function isEnabled(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (!rawValue) {
    return defaultValue;
  }
  const normalized = rawValue.trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

const clientEnv = import.meta.env;

export const featureFlags = {
  creationStudioEnabled: isEnabled(clientEnv?.VITE_CREATION_STUDIO_ENABLED, true),
  worldWizardEnabled: isEnabled(clientEnv?.VITE_WORLD_WIZARD_ENABLED, true),
  worldVisEnabled: isEnabled(clientEnv?.VITE_WORLD_VIS_ENABLED, true),
  marketRadarEnabled: isEnabled(clientEnv?.VITE_MARKET_RADAR_ENABLED, false),
};
