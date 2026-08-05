import { build_connections_codeblock } from '../../utils/build_connections_codeblock.js';

/**
 * Insert a Smart Connections codeblock at the current editor selection.
 *
 * @this {import('obsidian-smart-env').SmartEnv|object}
 * @param {{editor?: import('obsidian').Editor}} [params={}]
 * @returns {boolean}
 */
export function env_insert_connections_codeblock(params = {}) {
  const { editor } = params;
  if (!editor) return false;

  editor.replaceSelection(build_connections_codeblock());
  return true;
}

/** @type {import('jsbrains/smart-types/index.js').ConnectionsCommandsConfig} */
export const commands = {
  'insert-connections-codeblock': {
    name: 'Insert: Connections codeblock',
    context: 'editor',

    register_when({ plugin }) {
      return plugin.manifest.id === 'smart-connections';
    },

    /** @param {{editor?: import('obsidian').Editor}} context */
    params({ editor }) {
      return { editor };
    },

    when({ params }) {
      return Boolean(params.editor);
    },
  },
};
