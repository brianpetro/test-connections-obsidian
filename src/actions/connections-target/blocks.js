import { get_block_display_name } from 'obsidian-smart-env/src/utils/get_block_display_name.js';

/**
 * Return selectable blocks from the current Connections item-view target.
 *
 * This synchronous query keeps one target-provider module independently
 * includable while child selection delegates to the shared semantic action.
 *
 * @this {import('jsbrains/smart-types/index.js').ConnectionsItemViewScope}
 * @returns {import('jsbrains/smart-types/index.js').ConnectionItem[]}
 */
export function connections_target_blocks() {
  const current_key = this.current?.key || '';
  const source_key = current_key.split('#')[0];
  const source = this.env.smart_sources?.get?.(source_key)
    || this.env.smart_sources?.items?.[source_key]
  ;
  const blocks = Array.isArray(source?.blocks) ? [...source.blocks] : [];

  return blocks.sort((left, right) => {
    const left_line = get_block_first_line(left);
    const right_line = get_block_first_line(right);
    if (left_line !== right_line) return left_line - right_line;
    return String(left?.key || '').localeCompare(String(right?.key || ''));
  });
}

/** @type {import('jsbrains/smart-types/index.js').ConnectionsMenusConfig} */
export const menus = {
  'connections:target_menu': {
    title: 'Blocks',
    icon: 'blocks',
    order: 20,
    build() {
      const blocks = resolve_target_candidates(this);

      this.menu.addItem((item) => {
        item
          .setTitle('Blocks')
          .setIcon('blocks')
        ;

        const submenu = item.setSubmenu();
        item.setDisabled?.(!blocks.length);

        blocks.forEach((block) => {
          submenu.addItem((sub_item) => {
            sub_item
              .setTitle(get_block_title(block))
              .setDisabled(!block?.vec)
              .onClick(async () => {
                return await run_select_target(this, block);
              })
            ;
          });
        });
      });
    },
  },
};

/**
 * @param {import('jsbrains/smart-types/index.js').ConnectionsMenuContext} menu_ctx
 * @returns {import('jsbrains/smart-types/index.js').ConnectionItem[]}
 */
function resolve_target_candidates(menu_ctx) {
  const action = /** @type {((params: import('jsbrains/smart-types/index.js').ConnectionsActionParams) => import('jsbrains/smart-types/index.js').ConnectionItem[])|undefined} */ (
    menu_ctx.resolve_action?.()
  );
  if (typeof action !== 'function') return [];

  const candidates = action(menu_ctx.params);
  return Array.isArray(candidates) ? candidates : [];
}

/**
 * @param {import('jsbrains/smart-types/index.js').ConnectionItem} block
 * @returns {number}
 */
function get_block_first_line(block) {
  return Array.isArray(block?.lines) && Number.isFinite(block.lines[0])
    ? block.lines[0]
    : Number.POSITIVE_INFINITY
  ;
}

/**
 * @param {import('jsbrains/smart-types/index.js').ConnectionItem} block
 * @returns {string}
 */
function get_block_title(block) {
  const display_name = /** @type {string} */ (
    /** @type {unknown} */ (get_block_display_name(block, { show_full_path: false }))
  );
  return display_name || block?.key || 'Block';
}

/**
 * @param {import('jsbrains/smart-types/index.js').ConnectionsMenuContext} menu_ctx
 * @param {import('jsbrains/smart-types/index.js').ConnectionItem} target_item
 * @returns {Promise<boolean>}
 */
async function run_select_target(menu_ctx, target_item) {
  const action = /** @type {((params: import('jsbrains/smart-types/index.js').ConnectionsActionParams) => boolean|Promise<boolean>)|undefined} */ (
    menu_ctx.env.config?.actions?.connections_list_select_target?.action
  );
  if (typeof action !== 'function') return false;

  return /** @type {boolean} */ (
    /** @type {unknown} */ (await action.call(menu_ctx.scope, {
      target_item,
      event_source: menu_ctx.event_source,
    }))
  );
}
