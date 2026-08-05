/**
 * Merge pinned results ahead of scored results while avoiding duplicates.
 * @param {import('jsbrains/smart-types/index.js').ConnectionResult[]} base_results
 * @param {import('jsbrains/smart-types/index.js').ConnectionsQueryParams} params
 * @returns {import('jsbrains/smart-types/index.js').ConnectionResult[]}
 */
export function merge_pinned_results(base_results, params) {
  if (!params.pinned?.length) return base_results;
  const pinned_keys = new Set(params.pinned_keys || params.pinned.map(item => item.key));
  const pinned_results = params.pinned.map(item => ({
    item,
    ...(item.score?.(params) || {}),
  }));
  const filtered_results = base_results.filter(result => {
    const key = result?.item?.key;
    return key ? !pinned_keys.has(key) : true;
  });
  return [...pinned_results, ...filtered_results];
}
