export const GRAPH_SECTION_CONCURRENCY = 30;
export const GRAPH_WRITE_BATCH_SIZE = 40;

export function graphWriteBatches<T>(items: T[], batchSize = GRAPH_WRITE_BATCH_SIZE): T[][] {
  const size = Math.max(1, Math.floor(batchSize));
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
