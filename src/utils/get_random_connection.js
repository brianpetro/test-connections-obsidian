const DEFAULT_RESULTS_LIMIT = 20;

/** @typedef {import('smart-types/smart-environment.js').SmartEnv<import('jsbrains/smart-types/index.js').ConnectionsEnvExtensions>} SmartEnv */

/**
 * Returns a random connection for a given file path.
 * @param {SmartEnv} env - Smart environment instance.
 * @param {string} file_path - Path of the current file.
 * @param {Object} [opts]
 * @param {() => number} [opts.rng=Math.random]
 * @returns {Promise<import('jsbrains/smart-types/index.js').ConnectionResult|null>}
 */
export async function get_random_connection(env, file_path, { rng = Math.random } = {}) {
  if (!env?.smart_sources || !file_path) return null;
  const source = env.smart_sources.get(file_path);
  if (!source?.should_embed) return null;

  const connections_list = source.connections || env.connections_lists?.new_item?.(source);
  if (typeof connections_list?.get_results !== 'function') return null;

  let connections = [];
  try {
    connections = /** @type {import('jsbrains/smart-types/index.js').ConnectionResult[]} */ (
      await connections_list.get_results({ limit: DEFAULT_RESULTS_LIMIT })
    );
  } catch (err) {
    console.error('get_random_connection: failed to get connections', err);
    return null;
  }

  if (!Array.isArray(connections) || connections.length === 0) return null;

  return pick_weighted_connection(connections, { rng });
}

/**
 * @param {import('jsbrains/smart-types/index.js').ConnectionResult[]} connections
 * @param {{rng: () => number}} options
 * @returns {import('jsbrains/smart-types/index.js').ConnectionResult|undefined}
 */
function pick_weighted_connection(connections, { rng }) {
  const scored_connections = connections.map(connection => ({
    connection,
    score: Math.max(0, typeof connection?.score === 'number' ? connection.score : 0),
  }));
  const total_score = scored_connections.reduce((sum, { score }) => sum + score, 0);
  if (total_score === 0) return connections[0];

  const threshold = rng() * total_score;
  let cumulative = 0;
  for (const { connection, score } of scored_connections) {
    cumulative += score;
    if (threshold < cumulative) return connection;
  }
  return connections.at(-1);
}
