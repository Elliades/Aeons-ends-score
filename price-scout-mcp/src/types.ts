export type SourceId = 'leboncoin' | 'amazon' | 'dealabs' | 'generic';

export type Condition = 'new' | 'used' | 'refurbished' | 'unknown';

export type Currency = 'EUR';

export interface ProductListing {
  id: string;
  title: string;
  price: number | null;
  currency: Currency;
  url: string;
  source: SourceId;
  condition: Condition;
  location?: string;
  imageUrl?: string;
  promoCode?: string;
  originalPrice?: number;
  discountPercent?: number;
  shipping?: number;
  seller?: string;
  postedAt?: string;
  attributes: Record<string, string>;
  rawSnippet?: string;
}

export interface SearchCriteria {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: Condition;
  location?: string;
  features?: string[];
  sources?: SourceId[];
  limit?: number;
}

export interface PriceSummary {
  query: string;
  listings: ProductListing[];
  priceRange: {
    min: number | null;
    max: number | null;
    median: number | null;
    average: number | null;
  };
  sourcesQueried: SourceId[];
  errors: ProviderError[];
  fetchedAt: string;
}

export interface DealResult extends PriceSummary {
  deals: ProductListing[];
  promoCodes: string[];
}

export interface ResaleEstimate {
  query: string;
  estimatedMin: number | null;
  estimatedMax: number | null;
  estimatedMedian: number | null;
  sampleSize: number;
  comparableListings: ProductListing[];
  advice: string;
  fetchedAt: string;
}

export interface ProviderError {
  source: SourceId;
  message: string;
}

export interface ProviderSearchOptions {
  query: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: Condition;
  location?: string;
  features?: string[];
}

export interface PriceProvider {
  readonly id: SourceId;
  readonly name: string;
  search(options: ProviderSearchOptions): Promise<ProductListing[]>;
}
