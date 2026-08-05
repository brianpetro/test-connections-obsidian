/**
 * Toggle Connections auto-refresh for this item view.
 * When resuming, refresh the view target to the current active note.
 *
 * @this {import('jsbrains/smart-types').ConnectionsItemViewScope}
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params={}]
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
    title() {
      const scope = /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope} */ (this.scope);
      return scope.paused ? 'Resume auto-refresh' : 'Pause auto-refresh';
    },
    icon() {
      const scope = /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope} */ (this.scope);
      return scope.paused ? 'play-circle' : 'pause-circle';
    },
    order: 0,
  },
};
