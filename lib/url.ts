import type { Engine } from './types';

/** Accept a pasted address, add https:// when missing, and reject non-http(s) schemes. */
export function normalizeUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Build the destination for a search query in the selected mode. */
export function searchUrl(engine: Engine, query: string): string {
  if (engine === 'url') return normalizeUrl(query) ?? '';
  const q = encodeURIComponent(query.trim());
  return engine === 'ddg'
    ? `https://duckduckgo.com/?q=${q}`
    : `https://www.google.com/search?q=${q}`;
}

/** Short, human-readable hostname for bookmark rows. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
