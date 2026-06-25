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

export class DealabsProvider implements PriceProvider {
  readonly id = 'dealabs' as const;
  readonly name = 'Dealabs';

  async search(options: ProviderSearchOptions): Promise<ProductListing[]> {
    const limit = options.limit ?? 10;
    const query = encodeURIComponent(options.query);
    const url = `https://www.dealabs.com/search?q=${query}`;

    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const listings: ProductListing[] = [];

    $('article.thread, div.thread').each((index, element) => {
      if (listings.length >= limit) return false;

      const card = $(element);
      const title =
        textOrNull($, 'a.thread-link, a.thread-title', card) ??
        textOrNull($, 'strong', card);

      if (!title || !matchesFeatures(title, options.features)) return;

      const link = card.find('a.thread-link, a.thread-title').attr('href');
      const href = link?.startsWith('http')
        ? link
        : link
          ? `https://www.dealabs.com${link}`
          : url;

      const priceText =
        textOrNull($, 'span.thread-price, .thread-price', card) ??
        textOrNull($, '.userHtml', card);

      const temperatureText = textOrNull($, 'span.thread-temperature, .thread-temperature', card);
      const promoText = textOrNull($, '.coupon-code, .thread-coupon, code', card);

      const originalPrice = parsePrice(priceText);
      let discountPercent: number | undefined;
      const discountMatch = card.text().match(/(-?\d+)\s*%/);
      if (discountMatch) {
        discountPercent = Math.abs(Number.parseInt(discountMatch[1], 10));
      }

      listings.push({
        id: buildListingId(this.id, href, index),
        title,
        price: originalPrice,
        currency: 'EUR',
        url: href,
        source: this.id,
        condition: 'new',
        promoCode: promoText ?? undefined,
        discountPercent,
        attributes: {
          temperature: temperatureText ?? '',
        },
        rawSnippet: card.text().slice(0, 240),
      });
    });

    return filterByPrice(listings, options.minPrice, options.maxPrice).slice(0, limit);
  }
}
