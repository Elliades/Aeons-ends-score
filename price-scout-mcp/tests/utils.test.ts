import { describe, expect, it } from 'vitest';
import {
  buildListingId,
  computePriceStats,
  matchesFeatures,
  parsePrice,
  slugify,
} from '../src/utils/parse.js';
import {
  buildAdviceForResale,
  formatCurrency,
  resolveSources,
  sortByBestDeal,
  uniquePromoCodes,
} from '../src/utils/format.js';
import type { ProductListing } from '../src/types.js';

describe('parsePrice', () => {
  it('should parse French formatted prices', () => {
    expect(parsePrice('1 299,99 €')).toBe(1299.99);
    expect(parsePrice('€42.50')).toBe(42.5);
    expect(parsePrice('Gratuit')).toBeNull();
  });
});

describe('matchesFeatures', () => {
  it('should require all features when provided', () => {
    expect(matchesFeatures('iPhone 13 Pro 256Go', ['iphone', '256'])).toBe(true);
    expect(matchesFeatures('iPhone 13 Pro 256Go', ['iphone', '512'])).toBe(false);
  });

  it('should pass when no features are provided', () => {
    expect(matchesFeatures('anything', undefined)).toBe(true);
  });
});

describe('computePriceStats', () => {
  it('should compute min, max, median, and average', () => {
    expect(computePriceStats([10, 20, 30])).toEqual({
      min: 10,
      max: 30,
      median: 20,
      average: 20,
    });
  });

  it('should return null stats for empty input', () => {
    expect(computePriceStats([])).toEqual({
      min: null,
      max: null,
      median: null,
      average: null,
    });
  });
});

describe('format helpers', () => {
  it('should resolve default sources', () => {
    expect(resolveSources()).toEqual(['amazon', 'dealabs', 'leboncoin', 'generic']);
    expect(resolveSources(['amazon', 'amazon'])).toEqual(['amazon']);
  });

  it('should format currency in EUR', () => {
    expect(formatCurrency(1234.5)).toContain('1');
    expect(formatCurrency(null)).toBe('N/A');
  });

  it('should build resale advice based on sample size', () => {
    expect(buildAdviceForResale(null, 0)).toContain('Not enough');
    expect(buildAdviceForResale(100, 5)).toContain('5 comparable');
  });
});

describe('deal ranking', () => {
  const listings: ProductListing[] = [
    {
      id: '1',
      title: 'A',
      price: 100,
      currency: 'EUR',
      url: 'https://example.com/a',
      source: 'dealabs',
      condition: 'new',
      attributes: {},
      discountPercent: 20,
    },
    {
      id: '2',
      title: 'B',
      price: 80,
      currency: 'EUR',
      url: 'https://example.com/b',
      source: 'amazon',
      condition: 'new',
      attributes: {},
    },
  ];

  it('should prioritize stronger deals', () => {
    const sorted = sortByBestDeal(listings);
    expect(sorted[0].title).toBe('A');
  });

  it('should collect unique promo codes', () => {
    const withPromos: ProductListing[] = [
      { ...listings[0], promoCode: 'SAVE10' },
      { ...listings[1], promoCode: 'SAVE10' },
    ];
    expect(uniquePromoCodes(withPromos)).toEqual(['SAVE10']);
  });
});

describe('slugify and listing ids', () => {
  it('should slugify accents and punctuation', () => {
    expect(slugify('Téléphone Éléctrique!!!')).toBe('telephone-electrique');
  });

  it('should build stable listing ids', () => {
    expect(buildListingId('amazon', 'https://amazon.fr/dp/1', 0)).toContain('amazon-');
  });
});
