// List-only component used by configurable Connections surfaces.
/**
 * @this {import('jsbrains/smart-types').SmartViewInstance<unknown>}
 * @param {import('jsbrains/smart-types').ConnectionsListScope} connections_list
 * @param {import('jsbrains/smart-types').ConnectionsComponentOptions} [opts]
 * @returns {Promise<string>} A promise that resolves to the .sc-list HTML string.
 */
export async function build_html(connections_list, opts = {}) {
  return `<div><div class="connections-list sc-list" data-key="${connections_list.item.key}"></div></div>`;
}

/**
 * @this {import('jsbrains/smart-types').SmartViewInstance<unknown>}
 * @param {import('jsbrains/smart-types').ConnectionsListScope} connections_list
 * @param {import('jsbrains/smart-types').ConnectionsComponentOptions} [opts={}] - Optional parameters, including `opts.results`.
 * @returns {Promise<Element>} A promise that resolves to the .sc-list fragment with appended children.
 */
export async function render(connections_list, opts = {}) {
  const html = /** @type {string} */ (await build_html.call(this, connections_list, opts));
  const frag = this.create_doc_fragment(html);
  const container = frag.querySelector('.connections-list');
  post_process.call(this, connections_list, container, opts);
  return container;
}

/**
 * @this {import('jsbrains/smart-types').SmartViewInstance<unknown>}
 * @param {import('jsbrains/smart-types').ConnectionsListScope} connections_list
 * @param {HTMLElement} container
 * @param {import('jsbrains/smart-types').ConnectionsComponentOptions} [opts]
 * @returns {Promise<HTMLElement>}
 */
export async function post_process(connections_list, container, opts = {}) {
  container.dataset.key = connections_list.item.key;
  const results = await connections_list.get_results(opts);
  if(!results || !Array.isArray(results) || results.length === 0) {
    const no_results = this.create_doc_fragment(`<p class="sc-no-results">No results found.<br><em>Try using the refresh button. If that doesn't work, try running "Clear sources data" and then "Reload sources" in the Smart Environment settings.</em></p>`);
    container.appendChild(no_results);
    return container;
  }
  const smart_components = connections_list.env.smart_components;
  const result_frags = await Promise.all(results.map(result => {
    return smart_components.render_component('connections_list_item_v3', result, {...opts});
  }));
  result_frags.forEach(result_frag => container.appendChild(result_frag));
  // Add any necessary post-processing here
  return container;
}

export const display_name = "List only";