import type { MouseEvent } from 'react';

// Protected links share one AuthRoot and keep unresolved-write notices in memory.
export function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    event.currentTarget.target || event.currentTarget.hasAttribute('download')) return;
  const target = new URL(event.currentTarget.href, window.location.href);
  if (target.origin !== window.location.origin || target.hash) return;
  event.preventDefault();
  if (target.href !== window.location.href) window.history.pushState(null, '', target.href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
