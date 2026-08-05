/**
 * Toggle footer Connections for the current environment.
 *
 * @this {import('../../smart-types/index.js').ConnectionsListsCollection}
 * @returns {boolean}
 */
export function connections_list_toggle_footer_connections() {
  const settings = this?.settings;
  if (!settings) return false;

  settings.footer_connections = !settings.footer_connections;
  return true;
}

/** @type {import('../../smart-types/index.js').ConnectionsCommandsConfig} */
export const commands = {
  'toggle-footer-connections': {
    name: 'Toggle: Footer connections',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    get_scope({ env }) {
      return env.connections_lists;
    },
  },
};

/** @type {import('../../smart-types/index.js').ConnectionsRibbonConfigMap} */
export const ribbon_icons = {
  footer_connections: {
    icon_name: 'smart-footer-connections',
    description: 'Toggle Footer Connections',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    get_scope({ env }) {
      return env.connections_lists;
    },
  },
};
