import Obsidian from "obsidian";
const {
  requestUrl,
} = /** @type {{requestUrl: (params: object) => Promise<import('jsbrains/smart-types').SmartHttpRequestResponse<unknown>>}} */ (
  /** @type {unknown} */ (Obsidian)
);

import { SmartEnv } from 'obsidian-smart-env';
import { smart_env_config } from "../smart_env.config.js";
import { open_note } from "obsidian-smart-env/utils/open_note.js";

import { ScEarlySettingsTab } from "./views/settings_tab.js";

import { ReleaseNotesView } from "./views/release_notes_view.js";

// DEPRECATED 2026-05-14: Smart Lookup fallback disabled because Smart Lookup is available in plugin index.
// import { ConnectionsLookupItemView } from './views/lookup_item_view.js';

import { StoryModal } from 'obsidian-smart-env/src/modals/story.js';
import { add_smart_dice_icon } from "./utils/add_icons.js";
import { should_relocate_leaf } from "./utils/view_leaf_location.js";

import { SmartPlugin } from "obsidian-smart-env/smart_plugin.js";
import { ConnectionsItemView } from "./views/connections_item_view.js";
import { connections_footer_plugin } from './views/connections_footer_deco.js';
import { ConnectionsFooterView } from './views/connections_footer_view.js';
import { register_smart_connections_codeblock } from "./views/connections_codeblock.js";

/** @typedef {import('jsbrains/smart-types').ConnectionsApp} ConnectionsApp */
/** @typedef {import('jsbrains/smart-types').ConnectionsEditorView} ConnectionsEditorView */
/** @typedef {import('jsbrains/smart-types').ConnectionsEnvConfig} ConnectionsEnvConfig */
/** @typedef {import('jsbrains/smart-types').ConnectionsItemViewClass} ConnectionsItemViewClass */
/** @typedef {import('jsbrains/smart-types').ConnectionsPlugin} ConnectionsPlugin */
/** @typedef {import('jsbrains/smart-types').ConnectionsReleaseResponse} ConnectionsReleaseResponse */
/** @typedef {import('jsbrains/smart-types').SmartHttpRequestResponse<ConnectionsReleaseResponse>} ConnectionsReleaseRequestResponse */
/** @typedef {import('jsbrains/smart-types').ConnectionsSettingsTabScope} ConnectionsSettingsTabScope */
/** @typedef {import('jsbrains/smart-types').ConnectionsSmartEnvClass} ConnectionsSmartEnvClass */
/** @typedef {import('jsbrains/smart-types').ConnectionsWorkspace} ConnectionsWorkspace */

const ConnectionsPluginBase = /** @type {new (...args: unknown[]) => ConnectionsPlugin} */ (
  /** @type {unknown} */ (SmartPlugin)
);

const ConnectionsEnvironment = /** @type {ConnectionsSmartEnvClass} */ (
  /** @type {unknown} */ (SmartEnv)
);

const ConnectionsView = /** @type {ConnectionsItemViewClass} */ (
  /** @type {unknown} */ (ConnectionsItemView)
);

const ConnectionsSettingsTab = /** @type {new (
  app: ConnectionsApp,
  plugin: ConnectionsPlugin
) => ConnectionsSettingsTabScope} */ (
  /** @type {unknown} */ (ScEarlySettingsTab)
);

const ConnectionsReleaseNotesView = /** @type {{
  open: (workspace: ConnectionsWorkspace, version: string) => void
}} */ (
  /** @type {unknown} */ (ReleaseNotesView)
);

const GettingStartedStoryModal = /** @type {{
  open: (plugin: ConnectionsPlugin, params: {title: string, url: string}) => void
}} */ (
  /** @type {unknown} */ (StoryModal)
);

const open_connection_note = /** @type {(
  plugin: ConnectionsPlugin,
  target_path: string,
  event?: Event|null
) => Promise<void>} */ (
  /** @type {unknown} */ (open_note)
);

const connections_smart_env_config = /** @type {ConnectionsEnvConfig} */ (
  /** @type {unknown} */ (smart_env_config)
);

export default class SmartConnectionsPlugin extends ConnectionsPluginBase {
  /** @type {unknown} */
  _api;

  /** @type {ConnectionsEnvConfig|undefined} */
  _smart_env_config;

  SmartEnv = ConnectionsEnvironment;
  ReleaseNotesView = ConnectionsReleaseNotesView;

  /** @returns {ConnectionsEnvConfig} */
  get smart_env_config() {
    if (!this._smart_env_config) {
      this._smart_env_config = { ...connections_smart_env_config };
    }
    return this._smart_env_config;
  }

  ConnectionsSettingsTab = ConnectionsSettingsTab;

  get item_views() {
    return {
      ConnectionsItemView: ConnectionsView,
      ReleaseNotesView: this.ReleaseNotesView,
      // DEPRECATED 2026-05-14: Smart Lookup is a standalone plugin available in plugin index.
      // Keep the legacy Connections-hosted Lookup view disabled to avoid importing smart-lookup-obsidian here.
      // ...(!this.app.plugins.enabledPlugins.has('smart-lookup') ? { ConnectionsLookupItemView } : {}),
    };
  }

  get obsidian() { return Obsidian; }
  get api() { return this._api; }

  onload() {
    this.app.workspace.onLayoutReady(() => this.initialize());
    this.SmartEnv.create(this, this.smart_env_config);
    this.addSettingTab(new this.ConnectionsSettingsTab(this.app, this));
    add_smart_dice_icon();
    this.register_item_views({skip_command_registration: true});
  }

  onunload() {
    // console.log("Unloading Smart Connections plugin");
    this.connections_footer_view?.unload();
    this.notices?.unload();
    this.env?.unload_main?.(this);
  }

  async initialize() {
    this.register_ribbon_actions();
    this.smart_connections_view = null;
    this.is_new_user().then(async (is_new) => {
      if (!is_new) return;
      window.setTimeout(() => {
        GettingStartedStoryModal.open(this, {
          title: 'Getting Started With Smart Connections',
          url: 'https://smartconnections.app/story/smart-connections-getting-started/?utm_source=sc-op-new-user',
        });
      }, 1000);
      await this.SmartEnv.wait_for({ loaded: true });
      window.setTimeout(() => {
        this.apply_connections_view_location();
        this.open_connections_view();
      }, 1000);
      this.add_to_gitignore("\n\n# Ignore Smart Environment folder\n.smart-env");
    });
    await this.SmartEnv.wait_for({ loaded: true });
    this.register_command_actions();
    this.wrap_connections_view_open();
    this.apply_connections_view_location();
    this.register_connections_view_location_listener();
    register_smart_connections_codeblock(this);
    if (!this.connections_footer_view) {
      this.registerEditorExtension(connections_footer_plugin);
      this.connections_footer_view = new ConnectionsFooterView(this);
    }
    this.toggled_footer_connections();
    await this.check_for_updates();
  }

  get settings() { return this.env?.settings || {}; }

  /**
   * Sync connections view location with settings.
   * @returns {void}
   */
  apply_connections_view_location() {
    const connections_view_location = this.env?.connections_lists?.settings?.connections_view_location ?? 'right';
    ConnectionsView.default_open_location = connections_view_location === 'left' ? 'left' : 'right';
    this.ensure_connections_view_leaf_location();
  }

  wrap_connections_view_open() {
    if (this._open_connections_view_base || typeof this.open_connections_view !== 'function') {
      return;
    }
    this._open_connections_view_base = /** @type {(...args: unknown[]) => unknown} */ (
      this.open_connections_view.bind(this)
    ); // added on register by SmartItemView
    this.open_connections_view = /** @type {(...args: unknown[]) => unknown} */ ((...args) => {
      this.ensure_connections_view_leaf_location();
      const open_connections_view = /** @type {(...args: unknown[]) => unknown} */ (
        this._open_connections_view_base
      );
      return open_connections_view(...args);
    });
  }

  ensure_connections_view_leaf_location() {
    const workspace = this.app?.workspace;
    if (!workspace) {
      return;
    }
    const desired_location = ConnectionsView.default_open_location;
    const connections_leaf = ConnectionsView.get_leaf(workspace) || null;
    if (!should_relocate_leaf({ workspace, leaf: connections_leaf, desired_location })) {
      return;
    }
    connections_leaf.detach();
  }

  register_connections_view_location_listener() {
    if (this.connections_view_location_listener || !this.env?.events) return;
    this.connections_view_location_listener = this.env.events.on('settings:changed', (event) => {
      if (!event?.path?.includes?.('connections_view_location')) return;
      this.apply_connections_view_location();
    });
  }

  async check_for_updates() {
    if (await this.is_new_plugin_version(this.manifest.version)) {
      // console.log("opening release notes modal");
      try {
        this.ReleaseNotesView.open(this.app.workspace, this.manifest.version);
      } catch (error) {
        console.error('Failed to open ReleaseNotesView', error);
      }
      await this.set_last_known_version(this.manifest.version);
    }
    window.setTimeout(() => this.check_for_update(), 3000);
  }

  async check_for_update() {
    try {
      const { json: response } = /** @type {ConnectionsReleaseRequestResponse} */ (await requestUrl({
        url: "https://api.github.com/repos/brianpetro/obsidian-smart-connections/releases/latest",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        contentType: "application/json",
      }));
      const latest_release = response.tag_name;
      if (latest_release !== this.manifest.version) {
        if (!this.update_available || this.latest_release_version !== latest_release) {
          this.env?.events?.emit('plugin:new_version_available', {
            level: 'attention',
            message: `Smart Connections ${latest_release} is available.`,
            version: latest_release,
            event_source: 'check_for_update',
          });
        }
        this.latest_release_version = latest_release;
        this.update_available = true;
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Attempts to retrieve the CodeMirror 6 EditorView for the active markdown file.
   * @returns {ConnectionsEditorView|null}
   */
  get_editor_view() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      // console.log("Smart Connections: No active file found");
      return null;
    }
    const markdown_view = this.app.workspace.getActiveFileView();
    if (!markdown_view) {
      // console.log("Smart Connections: No active file view found");
      return null;
    }
    return markdown_view.editor?.cm || null;
  }

  toggled_footer_connections() {
    const view = this.get_editor_view();
    if (view && this.env?.connections_lists?.settings?.footer_connections) {
      this.connections_footer_view?.render_view();
    } else {
      this.connections_footer_view?.remove();
    }
  }

  /**
   * @param {string} target_path
   * @param {Event|null} [event]
   */
  async open_note(target_path, event = null) {
    await open_connection_note(this, target_path, event);
  }

  /**
   * @deprecated extract into utility
   * @param {string} ignore
   * @param {string|null} [message]
   */
  async add_to_gitignore(ignore, message = null) {
    if (!(await this.app.vault.adapter.exists(".gitignore"))) return;
    let gitignore_file = /** @type {string} */ (await this.app.vault.adapter.read(".gitignore"));
    if (gitignore_file.indexOf(ignore) < 0) {
      await this.app.vault.adapter.append(".gitignore", `\n\n${message ? "# " + message + "\n" : ""}${ignore}`);
      // console.log("Added to .gitignore: " + ignore);
    }
  }
}

