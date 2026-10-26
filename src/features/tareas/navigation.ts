import type { MouseEvent } from 'react';

// Preserve the single AuthRoot while moving between the small, finite task routes.
export function navigateTasks(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    event.currentTarget.target || event.currentTarget.hasAttribute('download')) return;
  event.preventDefault();
  window.history.pushState(null, '', event.currentTarget.href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
