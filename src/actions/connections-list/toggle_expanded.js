/**
 * Toggle all rendered Connections results between expanded and collapsed.
 *
 * @this {import('jsbrains/smart-types/index.js').ConnectionsListScope}
 * @param {import('jsbrains/smart-types/index.js').ConnectionsActionParams} [params={}]
 * @returns {boolean}
 */
export function connections_list_toggle_expanded(params = {}) {
  const connections_settings = params.connections_settings ?? this?.settings;
  const current_expanded = Boolean(connections_settings?.expanded_view);
  const expanded = typeof params.expanded === 'boolean'
    ? params.expanded
    : !current_expanded
  ;

  if (connections_settings) connections_settings.expanded_view = expanded;

  params.container?.querySelectorAll('.sc-result').forEach((element) => {
    expanded
      ? element.classList.remove('sc-collapsed')
      : element.classList.add('sc-collapsed')
    ;
  });

  return true;
}

/** @type {import('jsbrains/smart-types/index.js').ConnectionsMenusConfig} */
export const menus = /** @type {import('jsbrains/smart-types/index.js').ConnectionsMenusConfig & {'connections:list_menu': {title: (this: import('jsbrains/smart-types/index.js').ConnectionsMenuContext & {scope: import('jsbrains/smart-types/index.js').ConnectionsListScope}) => string, icon: (this: import('jsbrains/smart-types/index.js').ConnectionsMenuContext & {scope: import('jsbrains/smart-types/index.js').ConnectionsListScope}) => string}}} */ ({
  'connections:list_menu': {
    title() {
      const connections_settings = this.params.connections_settings ?? this.scope?.settings;
      return connections_settings?.expanded_view ? 'Collapse all results' : 'Expand all results';
    },
    icon() {
      const connections_settings = this.params.connections_settings ?? this.scope?.settings;
      return connections_settings?.expanded_view ? 'fold-vertical' : 'unfold-vertical';
    },
    order: 10,
  },
});
