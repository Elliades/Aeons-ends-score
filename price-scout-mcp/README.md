# Price Scout MCP

MCP server that gives Cursor tools to research prices, deals, promo codes, and second-hand listings across French marketplaces.

## Use cases

| MCP tool | Question it answers |
|---|---|
| `get_product_price` | How much does **X** cost? |
| `find_best_deals` | What are the best deals / promos / codes for **X**? |
| `find_second_hand_deals` | Where can I find a good second-hand deal for **X**? |
| `estimate_resale_value` | How much could I sell **X** for second-hand? |
| `search_products` | Find **X** with specific features/criteria **Y, Z** |

## Supported sources

- **Amazon France** — new product pricing
- **Dealabs** — community deals, discounts, promo codes
- **Leboncoin** — second-hand listings and resale comps
- **Generic shops** — DuckDuckGo + major FR retailers (Fnac, Cdiscount, Darty, etc.)

## Architecture

```
Cursor
  └─ MCP (stdio)
       └─ price-scout-mcp
            ├─ Tools (5 use-case oriented tools)
            ├─ Services (aggregation, ranking, stats)
            └─ Providers (amazon, dealabs, leboncoin, generic)
```

## Setup

```bash
cd price-scout-mcp
npm install
npm run build
npm test
```

### Wire into Cursor

Copy the example config and adjust the path if needed:

```bash
cp .cursor/mcp.json.example ../.cursor/mcp.json
```

Or add to your user/project MCP config:

```json
{
  "mcpServers": {
    "price-scout": {
      "command": "node",
      "args": ["C:/Users/Quatermaster/price-scout-mcp/dist/index.js"]
    }
  }
}
```

Restart Cursor, then ask things like:

- "How much does a PS5 Slim cost?"
- "Find the best deals for AirPods Pro 2"
- "Good second-hand MacBook Air M2 deals near Lyon"
- "How much could I sell my RTX 4070 for on Leboncoin?"
- "Find a 27\" 1440p IPS monitor under 250€ with USB-C"

## Tool parameters

All tools accept:

- `query` (required) — product keywords
- `minPrice` / `maxPrice` — EUR filters
- `condition` — `new`, `used`, `refurbished`, `unknown`
- `location` — city/region (Leboncoin)
- `features` — array of required criteria (all must match)
- `sources` — limit to `amazon`, `dealabs`, `leboncoin`, `generic`
- `limit` — max results per provider (1–30)

## Limitations

- Scraping depends on public HTML/JSON endpoints; sites may block automated requests.
- Amazon and Leboncoin may require retries or a headless browser for heavy use.
- Prices and promos are indicative — always verify on the source site before buying/selling.
- Respect each site's terms of service and robots.txt.

## Development

```bash
npm run dev      # run MCP server locally (stdio)
npm run test     # unit tests with HTML fixtures
npm run typecheck
```

## License

MIT
