/**
 * Short-drama content-source port (re-export + drama-specific alias).
 *
 * Drama internal code keeps importing from this path; callers outside drama do not see the move.
 * New modules (comic) should import services/adaptation/source/SourceContentPort directly.
 */
export type { SourceContentPort } from "../../adaptation/source/SourceContentPort";
export {
  SourceContentRegistry,
  adaptationSourceRegistry as sourceContentRegistry,
} from "../../adaptation/source/SourceContentPort";
