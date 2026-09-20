/**
 * Adaptation content-source port (Anti-Corruption Layer).
 *
 * Drama and comic share this interface. Each content source implements an adapter
 * that produces a SourceBundle; upper adaptation engines only face this interface.
 *
 * loadChapterText: optional extension — fetch chapter source text by range,
 * used when comic panel-script generation extracts dialogue (implemented for novel_import;
 * other sources return a slice or an empty string).
 */
import type { AdaptationSourceType, SourceBundle, SourceRef } from "../contracts/sourceBundle";

export interface SourceContentPort {
  readonly sourceType: AdaptationSourceType;
  loadBundle(ref: SourceRef): Promise<SourceBundle>;
  /** Fetch chapter source text by range (source of comic panel dialogue). */
  loadChapterText?(ref: SourceRef, start: number, end: number): Promise<string>;
}

export class SourceContentRegistry {
  private readonly adapters = new Map<AdaptationSourceType, SourceContentPort>();

  register(adapter: SourceContentPort): void {
    this.adapters.set(adapter.sourceType, adapter);
  }

  resolve(type: AdaptationSourceType): SourceContentPort {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Unregistered adaptation source type: ${type}`);
    }
    return adapter;
  }

  has(type: AdaptationSourceType): boolean {
    return this.adapters.has(type);
  }
}

export const adaptationSourceRegistry = new SourceContentRegistry();
