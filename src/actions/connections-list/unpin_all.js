import {
  count_pinned_connections,
  remove_all_pinned_states,
} from '../../utils/connections_list_item_state.js';

/**
 * Remove all pinned flags from the current source item's Connections state.
 *
 * @this {import('jsbrains/smart-types').ConnectionsListScope}
 * @param {object} [params={}]
 * @param {HTMLElement} [params.container]
 * @returns {boolean}
 */
export function connections_list_unpin_all(params = {}) {
  const source_item = this.item;
  if (!source_item?.data?.connections) return false;

  try {
    const changed = remove_all_pinned_states(source_item.data.connections);
    if (!changed) return false;

    params.container?.querySelectorAll?.('.sc-result[data-pinned]')
      .forEach((result_el) => {
        result_el.classList.remove('sc-result-pinned');
        result_el.removeAttribute('data-pinned');
      })
    ;
    source_item.queue_save();
    source_item.collection.save();
    return true;
  } catch (err) {
    this.env?.events?.emit?.('connections:unpin_failed', {
      level: 'error',
      message: 'Unpin failed - check console',
      details: (/** @type {Error|undefined} */ (err))?.message || '',
      event_source: 'connections_list.unpin_all',
    });
    console.error(err);
    return false;
  }
}

/** @type {import('jsbrains/smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:list_menu': {
    /** @this {Omit<import('jsbrains/smart-types').ConnectionsMenuContext, 'scope'> & {scope?: import('jsbrains/smart-types').ConnectionsListScope}} */
    title() {
      const pinned_count = count_pinned_connections(this.scope?.item?.data?.connections);
      return `Unpin All (${pinned_count})`;
    },
    icon: 'pin-off',
    order: 70,
    /** @this {Omit<import('jsbrains/smart-types').ConnectionsMenuContext, 'scope'> & {scope?: import('jsbrains/smart-types').ConnectionsListScope}} */
    disabled() {
      return !count_pinned_connections(this.scope?.item?.data?.connections);
    },
  },
};
