import { describe, expect, it } from 'vitest';
import { AmazonProvider } from '../src/providers/amazon.js';
import { DealabsProvider } from '../src/providers/dealabs.js';
import { LeboncoinProvider } from '../src/providers/leboncoin.js';

const amazonFixture = `
<div data-component-type="s-search-result">
  <h2><a href="/dp/B0TEST"><span>Sony WH-1000XM5</span></a></h2>
  <span class="a-price"><span class="a-offscreen">349,00 €</span></span>
</div>
`;

const dealabsFixture = `
<article class="thread">
  <a class="thread-link" href="/bons-plans/headphones-123">Sony WH-1000XM5 à 299€ (-15%)</a>
  <span class="thread-price">299€</span>
  <code>SONY15</code>
</article>
`;

const leboncoinNextDataFixture = `
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "searchData": {
        "ads": [
          {
            "list_id": 1,
            "subject": "Casque Sony WH-1000XM5",
            "url": "/ad/audio/123",
            "price": [220],
            "location": { "city_label": "Paris" }
          }
        ]
      }
    }
  }
}
</script>
`;

describe('AmazonProvider', () => {
  it('should parse search result cards from HTML fixture', async () => {
    const provider = new AmazonProvider();
    const originalFetch = global.fetch;

    global.fetch = (async () =>
      new Response(amazonFixture, { status: 200 })) as typeof fetch;

    try {
      const results = await provider.search({ query: 'sony wh1000xm5', limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Sony WH-1000XM5');
      expect(results[0].price).toBe(349);
      expect(results[0].source).toBe('amazon');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('DealabsProvider', () => {
  it('should parse deal threads and promo codes', async () => {
    const provider = new DealabsProvider();
    const originalFetch = global.fetch;

    global.fetch = (async () =>
      new Response(dealabsFixture, { status: 200 })) as typeof fetch;

    try {
      const results = await provider.search({ query: 'sony headphones', limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].promoCode).toBe('SONY15');
      expect(results[0].price).toBe(299);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('LeboncoinProvider', () => {
  it('should parse __NEXT_DATA__ listings when DOM cards are absent', async () => {
    const provider = new LeboncoinProvider();
    const originalFetch = global.fetch;

    global.fetch = (async () =>
      new Response(leboncoinNextDataFixture, { status: 200 })) as typeof fetch;

    try {
      const results = await provider.search({ query: 'sony wh1000xm5', limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].price).toBe(220);
      expect(results[0].location).toBe('Paris');
      expect(results[0].condition).toBe('used');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
