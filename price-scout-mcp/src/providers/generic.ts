import * as cheerio from 'cheerio';
import type { PriceProvider, ProductListing, ProviderSearchOptions } from '../types.js';
import {
  buildListingId,
  extractJsonLdProducts,
  fetchHtml,
  filterByPrice,
  matchesFeatures,
  parsePrice,
  textOrNull,
} from '../utils/parse.js';

const SHOPPING_SITES = [
  'fnac.com',
  'cdiscount.com',
  'darty.com',
  'boulanger.com',
  'ldlc.com',
  'rueducommerce.fr',
  'backmarket.fr',
  'rakuten.com',
];

export class GenericProvider implements PriceProvider {
  readonly id = 'generic' as const;
  readonly name = 'Generic web shops';

  async search(options: ProviderSearchOptions): Promise<ProductListing[]> {
    const limit = options.limit ?? 8;
    const ddgResults = await this.searchDuckDuckGo(options.query, limit);
    const listings: ProductListing[] = [...ddgResults];

    for (const site of SHOPPING_SITES) {
      if (listings.length >= limit) break;

      try {
        const siteResults = await this.searchSite(site, options, Math.min(3, limit - listings.length));
        listings.push(...siteResults);
      } catch {
        // individual shop failures should not break the aggregate search
      }
    }

    const filtered = listings.filter((listing) =>
      matchesFeatures(`${listing.title} ${listing.rawSnippet ?? ''}`, options.features),
    );

    return filterByPrice(filtered, options.minPrice, options.maxPrice).slice(0, limit);
  }

  private async searchDuckDuckGo(query: string, limit: number): Promise<ProductListing[]> {
    const searchQuery = encodeURIComponent(`${query} prix site:.fr`);
    const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

    const html = await fetchHtml(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const $ = cheerio.load(html);
    const listings: ProductListing[] = [];

    $('.result, .web-result').each((index, element) => {
      if (listings.length >= limit) return false;

      const card = $(element);
      const title = textOrNull($, 'a.result__a, a.result-link', card);
      const snippet = textOrNull($, '.result__snippet, .result-snippet', card);
      const link = card.find('a.result__a, a.result-link').attr('href');

      if (!title || !link) return;

      const href = this.normalizeDuckDuckGoUrl(link);
      const hostname = safeHostname(href);
      if (!hostname) return;

      listings.push({
        id: buildListingId(this.id, href, index),
        title,
        price: parsePrice(`${title} ${snippet ?? ''}`),
        currency: 'EUR',
        url: href,
        source: this.id,
        condition: 'unknown',
        seller: hostname,
        attributes: { hostname },
        rawSnippet: snippet ?? undefined,
      });
    });

    return listings;
  }

  private async searchSite(
    hostname: string,
    options: ProviderSearchOptions,
    limit: number,
  ): Promise<ProductListing[]> {
    const query = encodeURIComponent(options.query);
    const searchUrl = `https://www.${hostname}/search?text=${query}`;
    const html = await fetchHtml(searchUrl).catch(async () => {
      const fallback = `https://www.${hostname}/s?q=${query}`;
      return fetchHtml(fallback);
    });

    const jsonLdProducts = extractJsonLdProducts(html);
    const listings: ProductListing[] = [];

    for (const [index, product] of jsonLdProducts.entries()) {
      if (listings.length >= limit) break;

      const title = String(product.name ?? '');
      if (!title || !matchesFeatures(title, options.features)) continue;

      const offers = product.offers;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      const priceValue =
        typeof offer === 'object' && offer && 'price' in offer
          ? parsePrice(String(offer.price))
          : null;

      const url =
        typeof offer === 'object' && offer && 'url' in offer && typeof offer.url === 'string'
          ? offer.url
          : typeof product.url === 'string'
            ? product.url
            : `https://www.${hostname}`;

      listings.push({
        id: buildListingId(this.id, url, index),
        title,
        price: priceValue,
        currency: 'EUR',
        url,
        source: this.id,
        condition: 'unknown',
        seller: hostname,
        attributes: { hostname },
      });
    }

    if (listings.length) return listings;

    const $ = cheerio.load(html);
    $('a[href], article, .product, .prd-link').each((index, element) => {
      if (listings.length >= limit) return false;

      const card = $(element);
      const title =
        textOrNull($, 'h2', card) ??
        textOrNull($, 'h3', card) ??
        card.attr('title') ??
        card.text().slice(0, 120).trim();

      if (!title || title.length < 8 || !matchesFeatures(title, options.features)) return;

      const link = card.attr('href') ?? card.find('a').first().attr('href');
      if (!link) return;

      const href = link.startsWith('http') ? link : `https://www.${hostname}${link}`;

      listings.push({
        id: buildListingId(this.id, href, index),
        title,
        price: parsePrice(card.text()),
        currency: 'EUR',
        url: href,
        source: this.id,
        condition: 'unknown',
        seller: hostname,
        attributes: { hostname },
      });
    });

    return listings;
  }

  private normalizeDuckDuckGoUrl(link: string): string {
    if (link.startsWith('http')) return link;

    const match = link.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }

    return link;
  }
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
