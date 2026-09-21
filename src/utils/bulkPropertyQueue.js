/** Controlled-concurrency task runner for bulk property posting. */

export const DEFAULT_BULK_CONCURRENCY = 3;

/**
 * Run tasks with limited concurrency and progress callbacks.
 * Yields to the browser between task starts to keep UI responsive.
 */
export async function runQueuedTasks(items, executeTask, options = {}) {
  const {
    concurrency = DEFAULT_BULK_CONCURRENCY,
    onProgress,
    yieldMs = 0,
  } = options;

  if (!items.length) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;

  const yieldToBrowser = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, yieldMs);
    }
  });

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) break;

      if (yieldMs > 0) await new Promise((r) => setTimeout(r, yieldMs));
      else await yieldToBrowser();

      try {
        const result = await executeTask(items[index], index);
        results[index] = { ok: true, index, item: items[index], result };
        succeeded += 1;
      } catch (error) {
        results[index] = {
          ok: false,
          index,
          item: items[index],
          error: error?.message || 'Posting failed',
        };
        failed += 1;
      }

      completed += 1;
      onProgress?.({
        completed,
        total: items.length,
        succeeded,
        failed,
        remaining: items.length - completed,
        results: results.slice(),
      });
    }
  }

  const poolSize = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}

export function summarizeBulkResults(results = []) {
  const succeeded = results.filter((r) => r?.ok).length;
  const failed = results.filter((r) => r && !r.ok).length;
  return { total: results.length, succeeded, failed };
}
