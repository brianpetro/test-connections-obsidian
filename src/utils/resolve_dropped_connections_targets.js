import {
  has_smart_drag_data,
  read_smart_drag_data,
} from 'obsidian-smart-env/src/utils/smart_drag_drop.js';
import {
  classify_dropped_obsidian_entry,
  get_dropped_obsidian_entry_path,
  parse_dropped_obsidian_entries,
} from 'obsidian-smart-env/src/utils/parse_dropped_obsidian_data.js';

const SMART_CONNECTIONS_COLLECTION_KEYS = new Set([
  'smart_sources',
  'smart_blocks',
]);

/** @typedef {{collection_key: string, item_key: string}} SmartDragItem */
/** @typedef {{items: SmartDragItem[]}} SmartDragData */
/** @typedef {{normalized_path: string}} DroppedObsidianEntry */
/** @typedef {{status: string, kind: string|null, path: string|null}} ClassifiedDroppedEntry */

const contains_smart_drag_data = /** @type {(
  data_transfer: DataTransfer|object
) => boolean} */ (
  /** @type {unknown} */ (has_smart_drag_data)
);

const read_connections_drag_data = /** @type {(
  data_transfer: DataTransfer|object
) => SmartDragData|null} */ (
  /** @type {unknown} */ (read_smart_drag_data)
);

const parse_connections_dropped_entries = /** @type {(
  data_transfer: DataTransfer|object
) => DroppedObsidianEntry[]} */ (
  /** @type {unknown} */ (parse_dropped_obsidian_entries)
);

const get_connections_dropped_entry_path = /** @type {(
  entry: DroppedObsidianEntry,
  vault_path?: string
) => string} */ (
  /** @type {unknown} */ (get_dropped_obsidian_entry_path)
);

const classify_connections_dropped_entry = /** @type {(
  entry: DroppedObsidianEntry,
  options: {
    file_paths: string[],
    folder_paths: string[],
    available_file_paths: string[],
    vault_path: string
  }
) => ClassifiedDroppedEntry} */ (
  /** @type {unknown} */ (classify_dropped_obsidian_entry)
);

/**
 * @param {import('jsbrains/smart-types').SmartEnv<import('jsbrains/smart-types').ConnectionsEnvExtensions>} env
 * @param {import('jsbrains/smart-types').ConnectionsCollectionKey} collection_key
 * @param {string} item_key
 * @returns {import('jsbrains/smart-types').ConnectionItem|null}
 */
function get_collection_item(env, collection_key, item_key) {
  const collection = collection_key === 'smart_blocks'
    ? env.smart_blocks
    : env.smart_sources
  ;
  return collection?.get?.(item_key)
    || collection?.items?.[item_key]
    || null
  ;
}

/**
 * @param {unknown} item
 * @returns {item is import('jsbrains/smart-types').ConnectionItem}
 */
function is_connections_target(item) {
  const candidate = /** @type {Partial<import('jsbrains/smart-types').ConnectionItem>|null|undefined} */ (item);
  return Boolean(candidate?.key && candidate?.vec);
}

/**
 * @param {import('jsbrains/smart-types').SmartEnv<import('jsbrains/smart-types').ConnectionsEnvExtensions>} env
 * @param {DataTransfer|object} data_transfer
 * @returns {import('jsbrains/smart-types').ConnectionItem[]}
 */
function get_smart_targets(env, data_transfer) {
  const smart_drag_data = /** @type {SmartDragData|null} */ (
    read_connections_drag_data(data_transfer)
  );
  if (!smart_drag_data) return [];

  const targets = /** @type {import('jsbrains/smart-types').ConnectionItem[]} */ ([]);

  for (const { collection_key, item_key } of smart_drag_data.items) {
    if (!SMART_CONNECTIONS_COLLECTION_KEYS.has(collection_key)) return [];

    const target = get_collection_item(
      env,
      /** @type {import('jsbrains/smart-types').ConnectionsCollectionKey} */ (collection_key),
      item_key,
    );
    if (!is_connections_target(target)) return [];

    targets.push(target);
  }

  return targets;
}

/**
 * @param {import('jsbrains/smart-types').SmartEnv<import('jsbrains/smart-types').ConnectionsEnvExtensions>} env
 * @param {DataTransfer|object} data_transfer
 * @returns {import('jsbrains/smart-types').ConnectionItem[]}
 */
function get_native_targets(env, data_transfer) {
  const entries = /** @type {DroppedObsidianEntry[]} */ (
    parse_connections_dropped_entries(data_transfer)
  );
  if (!entries.length) return [];

  const smart_sources = env?.smart_sources;
  const smart_fs = smart_sources?.fs || env?.fs;
  const source_items = /** @type {Array<Partial<import('jsbrains/smart-types').ConnectionItem>>} */ (
    Object.values(smart_sources?.items || {})
  );
  const file_paths = Array.from(new Set([
    ...(smart_fs?.file_paths || []),
    ...source_items
      .map((source) => source?.key)
      .filter((path) => typeof path === 'string'),
  ]));
  const available_file_paths = source_items
    .filter(is_connections_target)
    .map((source) => source.key)
  ;
  const folder_paths = smart_fs?.folder_paths || [];
  const vault_path = smart_fs?.base_path || '';
  const targets = /** @type {import('jsbrains/smart-types').ConnectionItem[]} */ ([]);

  for (const entry of entries) {
    const entry_path = get_connections_dropped_entry_path(entry, vault_path);
    const block = get_collection_item(env, 'smart_blocks', entry_path);
    if (block) {
      if (!is_connections_target(block)) return [];
      targets.push(block);
      continue;
    }

    const classified_entry = /** @type {ClassifiedDroppedEntry} */ (
      classify_connections_dropped_entry(entry, {
        file_paths,
        folder_paths,
        available_file_paths,
        vault_path,
      })
    );
    if (
      classified_entry.kind !== 'file'
      || (
        classified_entry.status !== 'exact'
        && classified_entry.status !== 'recovered'
      )
    ) {
      return [];
    }

    if (!classified_entry.path) return [];
    const target = get_collection_item(
      env,
      'smart_sources',
      classified_entry.path,
    );
    if (!is_connections_target(target)) return [];

    targets.push(target);
  }

  return targets;
}

/**
 * Resolve dropped data into valid Connections source or block targets.
 *
 * The caller intentionally decides whether zero, one, or several resolved
 * targets are acceptable for its surface.
 *
 * @param {import('jsbrains/smart-types').SmartEnv<import('jsbrains/smart-types').ConnectionsEnvExtensions>} env
 * @param {DataTransfer|object} data_transfer
 * @returns {import('jsbrains/smart-types').ConnectionItem[]}
 */
export function resolve_dropped_connections_targets(env, data_transfer) {
  const targets = contains_smart_drag_data(data_transfer)
    ? get_smart_targets(env, data_transfer)
    : get_native_targets(env, data_transfer)
  ;
  const unique_targets = /** @type {Map<string, import('jsbrains/smart-types').ConnectionItem>} */ (new Map());

  targets.forEach((target) => {
    const key = `${target.collection_key || ''}:${target.key}`;
    if (!unique_targets.has(key)) unique_targets.set(key, target);
  });

  return Array.from(unique_targets.values());
}
