import type { Element } from 'domhandler';
import type { Cheerio, CheerioAPI } from 'cheerio';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchHtmlOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export async function fetchHtml(
  url: string,
  options: FetchHtmlOptions = {},
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        ...options.headers,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parsePrice(text: string | undefined | null): number | null {
  if (!text) return null;

  const normalized = text
    .replace(/\u00a0/g, ' ')
    .replace(/[^\d,.\s-]/g, '')
    .trim();

  if (!normalized) return null;

  const match = normalized.match(/-?\d[\d\s.,]*/);
  if (!match) return null;

  let value = match[0].replace(/\s/g, '');

  if (value.includes(',') && value.includes('.')) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (value.includes(',')) {
    value = value.replace(',', '.');
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function buildListingId(source: string, url: string, index: number): string {
  return `${source}-${slugify(url)}-${index}`;
}

export function extractJsonLdProducts(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      collectJsonLdNodes(parsed, results);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  return results;
}

function collectJsonLdNodes(
  node: unknown,
  results: Array<Record<string, unknown>>,
): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectJsonLdNodes(item, results);
    }
    return;
  }

  if (typeof node !== 'object') return;

  const record = node as Record<string, unknown>;
  const type = record['@type'];

  if (
    type === 'Product' ||
    type === 'Offer' ||
    (Array.isArray(type) && type.includes('Product'))
  ) {
    results.push(record);
  }

  if (record['@graph']) {
    collectJsonLdNodes(record['@graph'], results);
  }
}

export function textOrNull($: CheerioAPI, selector: string, root?: Cheerio<Element>): string | null {
  const element = root ? root.find(selector).first() : $(selector).first();
  const text = element.text().replace(/\s+/g, ' ').trim();
  return text || null;
}

export function matchesFeatures(
  haystack: string,
  features: string[] | undefined,
): boolean {
  if (!features?.length) return true;
  const lower = haystack.toLowerCase();
  return features.every((feature) => lower.includes(feature.toLowerCase()));
}

export function filterByPrice(
  listings: import('../types.js').ProductListing[],
  minPrice?: number,
  maxPrice?: number,
): import('../types.js').ProductListing[] {
  return listings.filter((listing) => {
    if (listing.price == null) return true;
    if (minPrice != null && listing.price < minPrice) return false;
    if (maxPrice != null && listing.price > maxPrice) return false;
    return true;
  });
}

export function computePriceStats(prices: number[]): {
  min: number | null;
  max: number | null;
  median: number | null;
  average: number | null;
} {
  if (!prices.length) {
    return { min: null, max: null, median: null, average: null };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mid = Math.floor(sorted.length / 2);

  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
    average: sum / sorted.length,
  };
}
