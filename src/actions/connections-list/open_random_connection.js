import { Notice } from 'obsidian';
import { open_note } from 'obsidian-smart-env/utils/open_note.js';
import { get_random_connection } from '../../utils/get_random_connection.js';

/** @typedef {import('jsbrains/smart-types').SmartEnv<import('jsbrains/smart-types').ConnectionsEnvExtensions>} SmartEnv */

const open_connection_note = /** @type {(
  plugin: import('jsbrains/smart-types').ConnectionsPlugin,
  target_path: string,
  event?: Event|null
) => Promise<void>} */ (
  /** @type {unknown} */ (open_note)
);

const NATIVE_RANDOM_NOTE_COMMAND_IDS = [
  'random-note:open',
  'random-note',
];

/**
 * Open a weighted random connection for the current Connections target or active note.
 * Falls back to Obsidian's native random note command when no note is active.
 *
 * @this {import('jsbrains/smart-types').ConnectionsListScope|import('jsbrains/smart-types').ConnectionsListsCollection}
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params={}]
 * @returns {Promise<boolean>}
 */
export async function connections_list_open_random_connection(params = {}) {
  const env = this?.env || params.plugin?.env || params.env;
  const app = get_app(env, params);
  const scope_item = /** @type {{item?: import('jsbrains/smart-types').ConnectionItem}} */ (
    /** @type {unknown} */ (this)
  ).item;
  const file_path = resolve_file_path(scope_item, params, app);

  if (!file_path) {
    if (run_native_random_note_command(app)) return true;
    new Notice('Open a note to get a random connection to the current note.');
    env?.events?.emit?.('connections:open_random_unavailable', {
      level: 'warning',
      message: 'Open a note to get a random connection to the current note.',
      event_source: params.event_source || 'connections_list_open_random_connection',
    });
    return false;
  }

  const rand_entity = await get_random_connection(env, file_path);
  const target_path = rand_entity?.item?.path || rand_entity?.item?.key;
  if (!target_path) {
    new Notice('No random connection found for the current note.');
    env?.events?.emit?.('connections:open_random_unavailable', {
      level: 'warning',
      message: `No random connection found for ${file_path}.`,
      event_source: params.event_source || 'connections_list_open_random_connection',
    });
    return false;
  }

  await open_random_connection_target(env, target_path, params);
  env?.events?.emit?.('connections:open_random', {
    source_key: file_path,
    target_key: target_path,
    event_source: params.event_source || 'connections_list_open_random_connection',
  });
  return true;
}

/**
 * @param {SmartEnv|undefined} env
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params]
 * @returns {import('jsbrains/smart-types').ConnectionsApp|null}
 */
function get_app(env, params = {}) {
  const host_window = /** @type {{app?: import('jsbrains/smart-types').ConnectionsApp}} */ (
    /** @type {unknown} */ (activeWindow)
  );
  const active_app = host_window.app;
  return params.app
    || params.plugin?.app
    || env?.obsidian_app
    || env?.plugin?.app
    || active_app
    || null
  ;
}

/**
 * @param {import('jsbrains/smart-types').ConnectionItem|undefined} scope_item
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params]
 * @param {import('jsbrains/smart-types').ConnectionsApp|null} [app]
 * @returns {string}
 */
function resolve_file_path(scope_item, params = {}, app = null) {
  const key = params.file_path
    || params.target_item?.key
    || params.source_item?.key
    || scope_item?.key
    || ''
  ;
  if (key) return String(key).split('#')[0];
  return app?.workspace?.getActiveFile?.()?.path || '';
}

/**
 * @param {SmartEnv} env
 * @param {string} target_path
 * @param {import('jsbrains/smart-types').ConnectionsActionParams} [params]
 * @returns {Promise<void>}
 */
async function open_random_connection_target(env, target_path, params = {}) {
  const plugin = params.plugin
    || env?.smart_connections_plugin
    || env?.plugin
    || env?.main
    || null
  ;
  const event = params.click_event || params.event || null;

  if (typeof plugin?.open_note === 'function') {
    await plugin.open_note(target_path, event);
    return;
  }

  if (plugin) {
    await open_connection_note(plugin, target_path, event);
  }
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsApp|null} app
 * @returns {boolean}
 */
function run_native_random_note_command(app) {
  const command_id = get_native_random_note_command_id(app);
  if (!command_id) return false;
  app.commands.executeCommandById(command_id);
  return true;
}

/**
 * @param {import('jsbrains/smart-types').ConnectionsApp|null} app
 * @returns {string}
 */
function get_native_random_note_command_id(app) {
  const commands = app?.commands?.commands || {};
  for (const command_id of NATIVE_RANDOM_NOTE_COMMAND_IDS) {
    if (commands[command_id]) return command_id;
  }

  const match = Object.entries(commands).find(([command_id, command]) => {
    return command_id.startsWith('random-note')
      && /random note/i.test(command?.name || '')
    ;
  });
  return match?.[0] || '';
}

/** @type {import('jsbrains/smart-types').ConnectionsCommandsConfig} */
export const commands = {
  'smart-connections-random': {
    name: 'Open: Random note from connections',

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

/** @type {import('jsbrains/smart-types').ConnectionsRibbonConfigMap} */
export const ribbon_icons = {
  random_note: {
    icon_name: 'smart-dice',
    description: 'Smart Connections: Open random connection',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    get_scope({ env }) {
      return env.connections_lists;
    },
  },
};

/** @type {import('jsbrains/smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:list_menu': {
    title: 'Open random connection',
    icon: 'smart-dice',
    order: 40,
    /**
     * @param {import('jsbrains/smart-types').ConnectionsMenuContext} _menu_ctx
     * @param {Event} [event]
     */
    params(_menu_ctx, event) {
      return { event };
    },
  },
};

