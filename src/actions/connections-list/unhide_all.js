import {
  count_hidden_connections,
  remove_all_hidden_states,
} from '../../utils/connections_list_item_state.js';

/**
 * Remove all hidden flags from the current source item's Connections state.
 *
 * @this {import('smart-types').ConnectionsListScope}
 * @param {import('smart-types').ConnectionsActionParams} [params={}]
 * @returns {boolean}
 */
export function connections_list_unhide_all(params = {}) {
  const source_item = this.item;
  if (!source_item?.data?.connections) return false;

  try {
    const changed = remove_all_hidden_states(source_item.data.connections);
    if (!changed) return false;

    if (source_item.data.hidden_connections) delete source_item.data.hidden_connections;
    source_item.queue_save();
    params.render_connections?.({
      connections_item: source_item,
      force: true,
    });
    source_item.collection.save();
    return true;
  } catch (err) {
    this.env?.events?.emit?.('connections:unhide_failed', {
      level: 'error',
      message: 'Unhide failed - check console',
      details: (/** @type {Error|undefined} */ (err))?.message || '',
      event_source: 'connections_list.unhide_all',
    });
    console.error(err);
    return false;
  }
}

/** @type {import('smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:list_menu': {
    title() {
      const scope = /** @type {import('smart-types').ConnectionsListScope} */ (this.scope);
      const hidden_count = count_hidden_connections(scope.item?.data?.connections);
      return `Unhide All (${hidden_count})`;
    },
    icon: 'eye',
    order: 60,
    disabled() {
      const scope = /** @type {import('smart-types').ConnectionsListScope} */ (this.scope);
      return !count_hidden_connections(scope.item?.data?.connections);
    },
  },
};
