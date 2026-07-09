/**
 * Utility functions for reading and manipulating URL parameters
 */

/**
 * Get a URL parameter by name
 */
export function getUrlParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Set a URL parameter without page reload
 */
export function setUrlParam(name: string, value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url.toString());
}

/**
 * Remove a URL parameter without page reload
 */
export function removeUrlParam(name: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.pushState({}, '', url.toString());
}

/**
 * Get session name from URL parameter
 */
export function getSessionNameFromUrl(): string | null {
  return getUrlParam('session');
}



