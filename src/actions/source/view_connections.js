import { ConnectionsItemView } from '../../views/connections_item_view.js';

/**
 * Open the Connections view focused on this source or block item.
 *
 * @this {import('jsbrains/smart-types').ConnectionItem}
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params={}]
 * @returns {Promise<boolean>}
 */
export async function source_view_connections(params = {}) {
  const source_item = params.source_item || params.target_item || this;
  const env = source_item?.env || this?.env;
  const workspace = params.workspace
    || env?.obsidian_app?.workspace
    || env?.plugin?.app?.workspace
    || env?.smart_connections_plugin?.app?.workspace
    || /** @type {Window & {app?: import('jsbrains/smart-types').ConnectionsApp}} */ (activeWindow).app?.workspace
  ;

  if (!source_item?.key || !workspace) return false;

  const event_source = params.event_source || 'source_view_connections';
  const view = await get_or_open_connections_view(workspace);
  if (view) {
    await render_connections_view(view, source_item, { event_source });
    return true;
  }

  env?.events?.emit?.('connections:show', {
    collection_key: source_item.collection_key,
    item_key: source_item.key,
    event_source,
  });
  return true;
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsWorkspace} workspace
 * @returns {Promise<import('jsbrains/smart-types').ConnectionsItemViewScope|null|undefined>}
 */
async function get_or_open_connections_view(workspace) {
  const existing_view = /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope|null|undefined} */ (
    /** @type {unknown} */ (ConnectionsItemView.get_view?.(workspace))
  );
  if (existing_view) {
    await reveal_connections_leaf(workspace, existing_view.leaf);
    return existing_view;
  }

  const existing_leaf = /** @type {import('jsbrains/smart-types').ConnectionsWorkspaceLeaf|null|undefined} */ (
    ConnectionsItemView.get_leaf?.(workspace)
  );
  if (existing_leaf) {
    await reveal_connections_leaf(workspace, existing_leaf);
    return /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope|null} */ (
      /** @type {unknown} */ (ConnectionsItemView.get_view?.(workspace) || existing_leaf.view || null)
    );
  }

  const opened = /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope|null|undefined} */ (
    /** @type {unknown} */ (await ConnectionsItemView.open?.(workspace, { active: true }))
  );

  const opened_view = /** @type {import('jsbrains/smart-types').ConnectionsItemViewScope|null} */ (
    /** @type {unknown} */ (ConnectionsItemView.get_view?.(workspace) || opened || null)
  );
  const opened_leaf = /** @type {import('jsbrains/smart-types').ConnectionsWorkspaceLeaf|null|undefined} */ (
    ConnectionsItemView.get_leaf?.(workspace) || opened_view?.leaf
  );
  await reveal_connections_leaf(workspace, opened_leaf);
  return opened_view || opened_leaf?.view || null;
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsWorkspace} workspace
 * @param {import('jsbrains/smart-types').ConnectionsWorkspaceLeaf|null|undefined} leaf
 * @returns {Promise<boolean>}
 */
async function reveal_connections_leaf(workspace, leaf) {
  if (!workspace || !leaf) return false;

  expand_leaf_ancestors(leaf);

  if (typeof workspace.revealLeaf === 'function') {
    await workspace.revealLeaf(leaf);
    return true;
  }

  if (typeof workspace.setActiveLeaf === 'function') {
    workspace.setActiveLeaf(leaf, { focus: true });
    return true;
  }

  return false;
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsWorkspaceLeaf} leaf
 * @returns {void}
 */
function expand_leaf_ancestors(leaf) {
  let parent = leaf?.parent;
  while (parent) {
    parent.setCollapsed?.(false);
    parent.expand?.();
    parent = parent.parent;
  }
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsItemViewScope} view
 * @param {import('jsbrains/smart-types').ConnectionItem} source_item
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params]
 * @returns {Promise<void>}
 */
async function render_connections_view(view, source_item, params = {}) {
  await view.select_target(source_item, {
    event_source: params.event_source || 'source_view_connections',
  });
}

/** @type {import('jsbrains/smart-types').ConnectionsMenusConfig} */
export const menus = {
  'source:menu': {
    title: 'View connections',
    icon: 'smart-connections',
    order: 20,
    disabled() {
      const scope = /** @type {{key?: string}} */ (/** @type {unknown} */ (this.scope));
      return !scope.key || !this.env?.connections_lists;
    },
  },
};


