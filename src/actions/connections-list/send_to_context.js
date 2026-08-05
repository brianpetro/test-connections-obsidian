export const SMART_CONTEXT_URL = 'https://smartconnections.app/smart-context/';

/**
 * Open Smart Context information when Smart Context is not installed.
 *
 * Smart Context replaces this placeholder with the working integration action.
 *
 * @this {import('smart-types').ConnectionsListScope}
 * @param {import('smart-types').ConnectionsActionParams} [params={}]
 * @returns {boolean}
 */
export function connections_list_send_to_context(params = {}) {
  const event_source = params.event_source
    || 'connections_list_send_to_context'
  ;

  if (this?.env?.event_logs?.settings?.native_notice_attention) {
    this?.env?.events?.emit?.(
      'connections:smart_context_link_unavailable',
      {
        level: 'attention',
        message: 'Smart Context plugin is required.',
        event_source,
        link: SMART_CONTEXT_URL,
        hide_mute_button: true,
      },
    );

    return true;
  }

  const open_url = /** @type {typeof window.open|undefined} */ (
    (/** @type {Window|undefined} */ (activeWindow))?.open
    || window?.open
    || open
  );
  if (typeof open_url !== 'function') return false;

  open_url(SMART_CONTEXT_URL, '_external');
  return true;
}

/** @type {import('smart-types').ConnectionsMenusConfig} */
export const menus = {
  'connections:list_menu': {
    title: 'Send to Smart Context',
    icon: 'smart-context-builder',
    order: 20,
  },
};

export const version = '0.0.1';
