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

export class AmazonProvider implements PriceProvider {
  readonly id = 'amazon' as const;
  readonly name = 'Amazon France';

  async search(options: ProviderSearchOptions): Promise<ProductListing[]> {
    const limit = options.limit ?? 10;
    const query = encodeURIComponent(options.query);
    const url = `https://www.amazon.fr/s?k=${query}`;

    const html = await fetchHtml(url, {
      headers: {
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    const $ = cheerio.load(html);
    const listings: ProductListing[] = [];

    $('div[data-component-type="s-search-result"]').each((index, element) => {
      if (listings.length >= limit) return false;

      const card = $(element);
      const title =
        textOrNull($, 'h2 a span', card) ??
        textOrNull($, 'h2 span', card) ??
        card.attr('aria-label') ??
        null;

      if (!title || !matchesFeatures(title, options.features)) return;

      const link = card.find('h2 a').attr('href');
      const priceText =
        textOrNull($, '.a-price .a-offscreen', card) ??
        textOrNull($, '.a-color-price', card);

      const href = link?.startsWith('http')
        ? link
        : link
          ? `https://www.amazon.fr${link}`
          : url;

      listings.push({
        id: buildListingId(this.id, href, index),
        title,
        price: parsePrice(priceText),
        currency: 'EUR',
        url: href,
        source: this.id,
        condition: options.condition ?? 'new',
        seller: 'Amazon',
        attributes: {},
        rawSnippet: priceText ?? undefined,
      });
    });

    if (!listings.length) {
      $('div.s-result-item[data-asin]').each((index, element) => {
        if (listings.length >= limit) return false;

        const card = $(element);
        const asin = card.attr('data-asin');
        if (!asin) return;

        const title = textOrNull($, 'h2 span', card);
        if (!title || !matchesFeatures(title, options.features)) return;

        const link = card.find('a.a-link-normal.s-no-outline').attr('href');
        const href = link?.startsWith('http')
          ? link
          : `https://www.amazon.fr/dp/${asin}`;

        listings.push({
          id: buildListingId(this.id, href, index),
          title,
          price: parsePrice(textOrNull($, '.a-price .a-offscreen', card)),
          currency: 'EUR',
          url: href,
          source: this.id,
          condition: 'new',
          seller: 'Amazon',
          attributes: { asin },
        });
      });
    }

    return filterByPrice(listings, options.minPrice, options.maxPrice).slice(0, limit);
  }
}
