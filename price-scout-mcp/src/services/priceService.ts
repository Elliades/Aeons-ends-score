import { getProviders } from '../providers/registry.js';
import type {
  DealResult,
  PriceSummary,
  ProductListing,
  ProviderError,
  ResaleEstimate,
  SearchCriteria,
  SourceId,
} from '../types.js';
import {
  buildAdviceForResale,
  resolveSources,
  sortByBestDeal,
  sortByPriceAsc,
  uniquePromoCodes,
} from '../utils/format.js';
import { computePriceStats } from '../utils/parse.js';

async function queryProviders(
  criteria: SearchCriteria,
  defaultSources?: SourceId[],
): Promise<{ listings: ProductListing[]; errors: ProviderError[]; sourcesQueried: SourceId[] }> {
  const sources = resolveSources(criteria.sources ?? defaultSources);
  const providers = getProviders().filter((provider) => sources.includes(provider.id));
  const listings: ProductListing[] = [];
  const errors: ProviderError[] = [];

  await Promise.all(
    providers.map(async (provider) => {
      try {
        const results = await provider.search({
          query: criteria.query,
          limit: criteria.limit ?? 10,
          minPrice: criteria.minPrice,
          maxPrice: criteria.maxPrice,
          condition: criteria.condition,
          location: criteria.location,
          features: criteria.features,
        });
        listings.push(...results);
      } catch (error) {
        errors.push({
          source: provider.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  return { listings, errors, sourcesQueried: sources };
}

function summarize(query: string, listings: ProductListing[], errors: ProviderError[], sourcesQueried: SourceId[]): PriceSummary {
  const prices = listings.map((listing) => listing.price).filter((price): price is number => price != null);

  return {
    query,
    listings,
    priceRange: computePriceStats(prices),
    sourcesQueried,
    errors,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getProductPrice(criteria: SearchCriteria): Promise<PriceSummary> {
  const { listings, errors, sourcesQueried } = await queryProviders(criteria, [
    'amazon',
    'generic',
    'dealabs',
  ]);

  const sorted = sortByPriceAsc(listings);
  return summarize(criteria.query, sorted, errors, sourcesQueried);
}

export async function findBestDeals(criteria: SearchCriteria): Promise<DealResult> {
  const { listings, errors, sourcesQueried } = await queryProviders(criteria, [
    'dealabs',
    'amazon',
    'generic',
  ]);

  const deals = sortByBestDeal(listings);
  const summary = summarize(criteria.query, deals, errors, sourcesQueried);

  return {
    ...summary,
    deals,
    promoCodes: uniquePromoCodes(deals),
  };
}

export async function findSecondHandDeals(criteria: SearchCriteria): Promise<PriceSummary> {
  const { listings, errors, sourcesQueried } = await queryProviders(
    {
      ...criteria,
      condition: criteria.condition ?? 'used',
      sources: criteria.sources ?? ['leboncoin'],
    },
    ['leboncoin'],
  );

  const sorted = sortByPriceAsc(listings);
  return summarize(criteria.query, sorted, errors, sourcesQueried);
}

export async function estimateResaleValue(criteria: SearchCriteria): Promise<ResaleEstimate> {
  const summary = await findSecondHandDeals({
    ...criteria,
    limit: criteria.limit ?? 20,
  });

  const prices = summary.listings
    .map((listing) => listing.price)
    .filter((price): price is number => price != null);

  const stats = computePriceStats(prices);

  return {
    query: criteria.query,
    estimatedMin: stats.min,
    estimatedMax: stats.max,
    estimatedMedian: stats.median,
    sampleSize: prices.length,
    comparableListings: summary.listings.slice(0, 10),
    advice: buildAdviceForResale(stats.median, prices.length),
    fetchedAt: summary.fetchedAt,
  };
}

export async function searchProducts(criteria: SearchCriteria): Promise<PriceSummary> {
  const { listings, errors, sourcesQueried } = await queryProviders({
    ...criteria,
    limit: criteria.limit ?? 15,
  });

  const filtered = listings.filter((listing) => {
    const blob = `${listing.title} ${JSON.stringify(listing.attributes)} ${listing.rawSnippet ?? ''}`.toLowerCase();

    if (criteria.features?.length && !criteria.features.every((feature) => blob.includes(feature.toLowerCase()))) {
      return false;
    }

    return true;
  });

  const sorted = sortByPriceAsc(filtered);
  return summarize(criteria.query, sorted, errors, sourcesQueried);
}
