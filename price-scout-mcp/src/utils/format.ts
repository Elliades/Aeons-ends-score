import type { SourceId } from '../types.js';

export const ALL_SOURCES: SourceId[] = ['amazon', 'dealabs', 'leboncoin', 'generic'];

export function resolveSources(requested?: SourceId[]): SourceId[] {
  if (!requested?.length) return ALL_SOURCES;
  return [...new Set(requested)];
}

export function formatCurrency(amount: number | null, currency = 'EUR'): string {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatListingSummary(listing: import('../types.js').ProductListing): string {
  const parts = [
    `[${listing.source}] ${listing.title}`,
    listing.price != null ? formatCurrency(listing.price, listing.currency) : 'Price unknown',
    listing.condition !== 'unknown' ? `(${listing.condition})` : null,
    listing.promoCode ? `promo: ${listing.promoCode}` : null,
    listing.location ? `@ ${listing.location}` : null,
    listing.url,
  ].filter(Boolean);

  return parts.join(' | ');
}

export function buildAdviceForResale(
  median: number | null,
  sampleSize: number,
): string {
  if (sampleSize === 0 || median == null) {
    return 'Not enough comparable second-hand listings to estimate resale value. Try a broader query or check Leboncoin manually.';
  }

  if (sampleSize < 3) {
    return `Only ${sampleSize} comparable listing(s) found. Treat the estimate as indicative; list near ${formatCurrency(median * 0.95)} and adjust based on condition.`;
  }

  return `Based on ${sampleSize} comparable listings, a competitive ask is around ${formatCurrency(median * 0.95)}–${formatCurrency(median * 1.05)} depending on condition, accessories, and urgency.`;
}

export function sortByPriceAsc<T extends { price: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });
}

export function sortByDealScore(listing: import('../types.js').ProductListing): number {
  let score = listing.price ?? Number.POSITIVE_INFINITY;

  if (listing.discountPercent != null) {
    score -= listing.discountPercent * 2;
  }

  if (listing.promoCode) {
    score -= 5;
  }

  if (listing.condition === 'used') {
    score *= 0.98;
  }

  return score;
}

export function sortByBestDeal<T extends import('../types.js').ProductListing>(items: T[]): T[] {
  return [...items].sort((a, b) => sortByDealScore(a) - sortByDealScore(b));
}

export function uniquePromoCodes(listings: import('../types.js').ProductListing[]): string[] {
  const codes = listings
    .map((listing) => listing.promoCode)
    .filter((code): code is string => Boolean(code));

  return [...new Set(codes)];
}
