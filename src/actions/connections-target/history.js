const HISTORY_LIMIT = 10;

/**
 * Return selectable recent Connections item-view targets.
 *
 * This synchronous query keeps one target-provider module independently
 * includable while child selection delegates to the shared semantic action.
 *
 * @this {import('jsbrains/smart-types').ConnectionsItemViewScope}
 * @returns {import('jsbrains/smart-types').ConnectionItem[]}
 */
export function connections_target_history() {
  const history = Array.isArray(this.connections_target_history)
    ? this.connections_target_history
    : []
  ;

  return history
    .slice(0, HISTORY_LIMIT)
    .map((key) => this.env.smart_sources?.get?.(key) || this.env.smart_sources?.items?.[key])
    .filter(Boolean)
  ;
}

/** @type {import('jsbrains/smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:target_menu': {
    title: 'History',
    icon: 'history',
    order: 10,
    build() {
      const sources = resolve_target_candidates(this);

      this.menu.addItem((item) => {
        item
          .setTitle('History')
          .setIcon('history')
        ;

        const submenu = item.setSubmenu();
        item.setDisabled?.(!sources.length);

        sources.forEach((source) => {
          submenu.addItem((sub_item) => {
            sub_item
              .setTitle(source.key)
              .setIcon('file-text')
              .onClick(async () => {
                return await run_select_target(this, source);
              })
            ;
          });
        });
      });
    },
  },
};

/**
 * @param {import('jsbrains/smart-types').ConnectionsMenuContext} menu_ctx
 * @returns {import('jsbrains/smart-types').ConnectionItem[]}
 */
function resolve_target_candidates(menu_ctx) {
  const action = /** @type {((
    params: import('jsbrains/smart-types').ConnectionsActionParams
  ) => import('jsbrains/smart-types').ConnectionItem[])|undefined} */ (
    /** @type {unknown} */ (menu_ctx.resolve_action?.())
  );
  if (typeof action !== 'function') return [];

  const candidates = action(menu_ctx.params);
  return Array.isArray(candidates) ? candidates : [];
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsMenuContext} menu_ctx
 * @param {import('jsbrains/smart-types').ConnectionItem} target_item
 * @returns {Promise<boolean>}
 */
async function run_select_target(menu_ctx, target_item) {
  const action = /** @type {((params: import('jsbrains/smart-types').ConnectionsActionParams) => Promise<boolean>|boolean)|undefined} */ (
    /** @type {unknown} */ (menu_ctx.env.config?.actions?.connections_list_select_target?.action)
  );
  if (typeof action !== 'function') return false;

  return await /** @type {boolean|Promise<boolean>} */ (
    /** @type {unknown} */ (action.call(menu_ctx.scope, {
      target_item,
      event_source: menu_ctx.event_source,
    }))
  );
}
