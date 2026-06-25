import * as cheerio from 'cheerio';
import type { PriceProvider, ProductListing, ProviderSearchOptions } from '../types.js';
import {
  buildListingId,
  fetchHtml,
  filterByPrice,
  matchesFeatures,
  parsePrice,
  textOrNull,
} from '../utils/parse.js';

export class LeboncoinProvider implements PriceProvider {
  readonly id = 'leboncoin' as const;
  readonly name = 'Leboncoin';

  async search(options: ProviderSearchOptions): Promise<ProductListing[]> {
    const limit = options.limit ?? 10;
    const params = new URLSearchParams({
      text: options.query,
      sort: 'time',
    });

    if (options.minPrice != null) {
      params.set('price_min', String(Math.floor(options.minPrice)));
    }
    if (options.maxPrice != null) {
      params.set('price_max', String(Math.ceil(options.maxPrice)));
    }

    const url = `https://www.leboncoin.fr/recherche?${params.toString()}`;
    const html = await fetchHtml(url);
    const listings = this.parseHtml(html, url, options, limit);

    if (listings.length) {
      return filterByPrice(listings, options.minPrice, options.maxPrice).slice(0, limit);
    }

    return this.parseNextData(html, url, options, limit);
  }

  private parseHtml(
    html: string,
    fallbackUrl: string,
    options: ProviderSearchOptions,
    limit: number,
  ): ProductListing[] {
    const $ = cheerio.load(html);
    const listings: ProductListing[] = [];

    $('article, a[data-qa-id="aditem_container"], .styles_adCard__').each((index, element) => {
      if (listings.length >= limit) return false;

      const card = $(element);
      const title =
        textOrNull($, '[data-qa-id="aditem_title"]', card) ??
        textOrNull($, 'p[title]', card) ??
        textOrNull($, 'h3', card);

      if (!title || !matchesFeatures(title, options.features)) return;

      const priceText =
        textOrNull($, '[data-qa-id="aditem_price"]', card) ??
        textOrNull($, 'span[data-test-id="price"]', card) ??
        textOrNull($, 'p[data-test-id="price"]', card);

      const location =
        textOrNull($, '[data-qa-id="aditem_location"]', card) ??
        textOrNull($, 'p[data-test-id="location"]', card) ??
        undefined;

      if (options.location && location && !location.toLowerCase().includes(options.location.toLowerCase())) {
        return;
      }

      const link = card.attr('href') ?? card.find('a').first().attr('href');
      const href = link?.startsWith('http')
        ? link
        : link
          ? `https://www.leboncoin.fr${link}`
          : fallbackUrl;

      listings.push({
        id: buildListingId(this.id, href, index),
        title,
        price: parsePrice(priceText),
        currency: 'EUR',
        url: href,
        source: this.id,
        condition: options.condition ?? 'used',
        location,
        attributes: {},
        rawSnippet: priceText ?? undefined,
      });
    });

    return listings;
  }

  private parseNextData(
    html: string,
    fallbackUrl: string,
    options: ProviderSearchOptions,
    limit: number,
  ): ProductListing[] {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return [];

    try {
      const data = JSON.parse(match[1]) as {
        props?: {
          pageProps?: {
            searchData?: {
              ads?: Array<{
                list_id?: number;
                subject?: string;
                url?: string;
                price?: number[];
                location?: { city_label?: string };
                attributes?: Array<{ key?: string; value?: string }>;
              }>;
            };
          };
        };
      };

      const ads = data.props?.pageProps?.searchData?.ads ?? [];
      const listings: ProductListing[] = [];

      for (const [index, ad] of ads.entries()) {
        if (listings.length >= limit) break;

        const title = ad.subject ?? '';
        if (!title || !matchesFeatures(title, options.features)) continue;

        const location = ad.location?.city_label;
        if (options.location && location && !location.toLowerCase().includes(options.location.toLowerCase())) {
          continue;
        }

        const href = ad.url?.startsWith('http')
          ? ad.url
          : ad.url
            ? `https://www.leboncoin.fr${ad.url}`
            : fallbackUrl;

        const attributes: Record<string, string> = {};
        for (const attr of ad.attributes ?? []) {
          if (attr.key && attr.value) {
            attributes[attr.key] = attr.value;
          }
        }

        listings.push({
          id: buildListingId(this.id, href, index),
          title,
          price: ad.price?.[0] ?? null,
          currency: 'EUR',
          url: href,
          source: this.id,
          condition: options.condition ?? 'used',
          location,
          attributes,
        });
      }

      return filterByPrice(listings, options.minPrice, options.maxPrice).slice(0, limit);
    } catch {
      return [];
    }
  }
}
