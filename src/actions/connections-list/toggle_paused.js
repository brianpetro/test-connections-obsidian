/**
 * Toggle Connections auto-refresh for this item view.
 * When resuming, refresh the view target to the current active note.
 *
 * @this {import('jsbrains/smart-types').ConnectionsItemViewScope}
 * @param {object} [params={}]
 * @param {string} [params.event_source]
 * @returns {Promise<boolean>}
 */
export async function connections_list_toggle_paused(params = {}) {
  if (!this?.toggle_paused) return false;

  await this.toggle_paused({
    event_source: params.event_source || 'connections_list_toggle_paused',
  });
  return true;
}

/** @type {import('jsbrains/smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:item_view_list_menu': {
    /** @this {Omit<import('jsbrains/smart-types').ConnectionsMenuContext, 'scope'> & {scope?: import('jsbrains/smart-types').ConnectionsItemViewScope}} */
    title() {
      return this.scope?.paused ? 'Resume auto-refresh' : 'Pause auto-refresh';
    },
    /** @this {Omit<import('jsbrains/smart-types').ConnectionsMenuContext, 'scope'> & {scope?: import('jsbrains/smart-types').ConnectionsItemViewScope}} */
    icon() {
      return this.scope?.paused ? 'play-circle' : 'pause-circle';
    },
    order: 0,
  },
};
