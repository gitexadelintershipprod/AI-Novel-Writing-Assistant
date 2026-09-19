/**
 * Server entry for stored protocol value dual-read.
 * Source of truth lives in shared so client validators can use the same map.
 */
export {
  BEAT_FALLBACK_LABEL,
  BEAT_ROLE_LABEL_MAP,
  DEFAULT_THREAD_TITLE,
  GROWTH_STAGE_LABELS,
  GROWTH_STAGE_MAP,
  GROWTH_STAGE_VALUES,
  LEGACY_THREAD_TITLES,
  PRODUCT_SNAPSHOT_LABEL_MAP,
  STORY_FUNCTION_LABELS,
  STORY_FUNCTION_MAP,
  STORY_FUNCTION_VALUES,
  WORLD_LAYER_MAP,
  WORLD_TYPE_MAP,
  canonicalizeBeatRoleLabel,
  canonicalizeGrowthStage,
  canonicalizeStoryFunction,
  canonicalizeWorldLayer,
  canonicalizeWorldType,
  isPlaceholderThreadTitle,
  rewriteExactProtocolString,
  rewriteProtocolJsonText,
  rewriteProtocolJsonValue,
} from "@ai-novel/shared/types/legacyProtocolValues";
