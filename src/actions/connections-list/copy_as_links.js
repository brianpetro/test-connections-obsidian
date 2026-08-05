import { copy_to_clipboard } from 'obsidian-smart-env/src/utils/copy_to_clipboard.js';
import { format_connections_as_links } from '../../utils/format_connections_as_links.js';

/**
 * @param {import('../../smart-types/index.js').ConnectionsListScope} connections_list
 * @param {import('../../smart-types/index.js').ConnectionsActionParams} [params={}]
 * @returns {string}
 */
function get_links_payload(connections_list, params = {}) {
  const results = Array.isArray(params.visible_results)
    ? params.visible_results
    : connections_list?.results || []
  ;
  return format_connections_as_links(results);
}

/**
 * Copy visible Connections results as a list of links.
 *
 * @this {import('../../smart-types/index.js').ConnectionsListScope}
 * @param {import('../../smart-types/index.js').ConnectionsActionParams} [params={}]
 * @returns {Promise<boolean>}
 */
export async function connections_list_copy_as_links(params = {}) {
  const event_source = params.event_source || 'connections_list.copy_as_links';
  const links_payload = get_links_payload(this, params);
  if (!links_payload) {
    this.env.events.emit('connections:copy_list_empty', {
      level: 'warning',
      message: 'No connection results to copy.',
      event_source,
    });
    return false;
  }

  const copied = /** @type {boolean} */ (await copy_to_clipboard(links_payload, {
    env: this.env,
    event_source,
    success_event_key: 'connections:list_copied',
    error_event_key: 'connections:list_copy_failed',
    unavailable_event_key: 'connections:list_copy_unavailable',
  }));
  if (!copied) return false;

  this.emit_event('connections:copied_list', {
    level: 'info',
    message: 'Copied connection links to clipboard.',
  });
  return true;
}

/** @type {import('../../smart-types/index.js').ConnectionsMenusConfig} */
export const menus = {
  'connections:list_menu': {
    title: 'Copy as list of links',
    icon: 'copy',
    order: 20,
    disabled() {
      return !get_links_payload(
        /** @type {import('../../smart-types/index.js').ConnectionsListScope} */ (/** @type {unknown} */ (this.scope)),
        this.params,
      );
    },
  },
};
