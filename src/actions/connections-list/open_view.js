/**
 * Open the Smart Connections view.
 *
 * @this {import('jsbrains/smart-types').ConnectionsListScope|import('jsbrains/smart-types').ConnectionsListsCollection}
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params={}]
 * @returns {Promise<boolean>}
 */
export async function connections_list_open_view(params = {}) {
  const plugin = params.plugin || this?.env?.smart_connections_plugin;
  if (typeof plugin?.open_connections_view !== 'function') return false;

  await plugin.open_connections_view();
  return true;
}

/** @type {import('jsbrains/smart-types').ConnectionsRibbonConfigMap} */
export const ribbon_icons = {
  connections: {
    icon_name: 'smart-connections',
    description: 'Smart Connections: Open connections view',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    params({ plugin }) {
      return { plugin };
    },

    get_scope({ env }) {
      return env.connections_lists;
    },
  },
};

/** @type {import('jsbrains/smart-types').ConnectionsCommandsConfig} */
export const commands = {
  'smart-connections-view': {
    name: 'Open: Connections view',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    params({ plugin }) {
      return { plugin };
    },

    get_scope({ env }) {
      return env.connections_lists;
    },
  },
};