import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  estimateResaleValue,
  findBestDeals,
  findSecondHandDeals,
  getProductPrice,
  searchProducts,
} from './services/priceService.js';
import type { Condition, SourceId } from './types.js';
import { formatCurrency, formatListingSummary } from './utils/format.js';

const sourceSchema = z.enum(['leboncoin', 'amazon', 'dealabs', 'generic']);
const conditionSchema = z.enum(['new', 'used', 'refurbished', 'unknown']);

const searchInputSchema = {
  query: z.string().min(1).describe('Product name or search keywords'),
  minPrice: z.number().optional().describe('Minimum price in EUR'),
  maxPrice: z.number().optional().describe('Maximum price in EUR'),
  condition: conditionSchema.optional().describe('Item condition filter'),
  location: z.string().optional().describe('Geographic filter (useful for Leboncoin)'),
  features: z
    .array(z.string())
    .optional()
    .describe('Required product features or criteria (all must match)'),
  sources: z
    .array(sourceSchema)
    .optional()
    .describe('Limit search to specific providers'),
  limit: z.number().int().min(1).max(30).optional().describe('Max results per provider'),
};

function formatSummaryHeader(title: string, query: string): string {
  return `# ${title}\n\nQuery: **${query}**\n`;
}

function formatPriceSummary(result: Awaited<ReturnType<typeof getProductPrice>>): string {
  const lines = [
    formatSummaryHeader('Price Research Results', result.query),
    `Fetched: ${result.fetchedAt}`,
    `Sources queried: ${result.sourcesQueried.join(', ')}`,
    '',
    '## Price range',
    `- Min: ${formatCurrency(result.priceRange.min)}`,
    `- Median: ${formatCurrency(result.priceRange.median)}`,
    `- Average: ${formatCurrency(result.priceRange.average)}`,
    `- Max: ${formatCurrency(result.priceRange.max)}`,
    '',
    '## Listings',
  ];

  if (!result.listings.length) {
    lines.push('_No listings found._');
  } else {
    for (const listing of result.listings.slice(0, 15)) {
      lines.push(`- ${formatListingSummary(listing)}`);
    }
  }

  if (result.errors.length) {
    lines.push('', '## Provider warnings');
    for (const error of result.errors) {
      lines.push(`- ${error.source}: ${error.message}`);
    }
  }

  return lines.join('\n');
}

export function createPriceScoutServer(): McpServer {
  const server = new McpServer({
    name: 'price-scout-mcp',
    version: '1.0.0',
  });

  server.registerTool(
    'get_product_price',
    {
      title: 'Get product price',
      description:
        'Find how much a product costs across Amazon, Dealabs, and generic French retailers. Use for: "how much does X cost?"',
      inputSchema: searchInputSchema,
    },
    async (input) => {
      const result = await getProductPrice({
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        condition: input.condition as Condition | undefined,
        location: input.location,
        features: input.features,
        sources: input.sources as SourceId[] | undefined,
        limit: input.limit,
      });

      return {
        content: [{ type: 'text', text: formatPriceSummary(result) }],
      };
    },
  );

  server.registerTool(
    'find_best_deals',
    {
      title: 'Find best deals',
      description:
        'Search for the best deals, promotions, and promo codes for a product on Dealabs, Amazon, and other shops.',
      inputSchema: searchInputSchema,
    },
    async (input) => {
      const result = await findBestDeals({
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        condition: input.condition as Condition | undefined,
        location: input.location,
        features: input.features,
        sources: input.sources as SourceId[] | undefined,
        limit: input.limit,
      });

      const lines = [
        formatSummaryHeader('Best Deals', result.query),
        `Promo codes found: ${result.promoCodes.length ? result.promoCodes.join(', ') : 'none'}`,
        '',
        '## Top deals',
      ];

      for (const deal of result.deals.slice(0, 15)) {
        lines.push(`- ${formatListingSummary(deal)}`);
      }

      if (result.errors.length) {
        lines.push('', '## Provider warnings');
        for (const error of result.errors) {
          lines.push(`- ${error.source}: ${error.message}`);
        }
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.registerTool(
    'find_second_hand_deals',
    {
      title: 'Find second-hand deals',
      description:
        'Search Leboncoin for good second-hand deals on a product. Use for: "find a good deal for X second hand".',
      inputSchema: searchInputSchema,
    },
    async (input) => {
      const result = await findSecondHandDeals({
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        condition: input.condition as Condition | undefined,
        location: input.location,
        features: input.features,
        sources: input.sources as SourceId[] | undefined,
        limit: input.limit,
      });

      return {
        content: [{ type: 'text', text: formatPriceSummary(result) }],
      };
    },
  );

  server.registerTool(
    'estimate_resale_value',
    {
      title: 'Estimate resale value',
      description:
        'Estimate how much you could sell a product for second-hand based on comparable Leboncoin listings.',
      inputSchema: searchInputSchema,
    },
    async (input) => {
      const result = await estimateResaleValue({
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        condition: input.condition as Condition | undefined,
        location: input.location,
        features: input.features,
        limit: input.limit,
      });

      const lines = [
        formatSummaryHeader('Second-hand Resale Estimate', result.query),
        `Sample size: ${result.sampleSize}`,
        `- Estimated min: ${formatCurrency(result.estimatedMin)}`,
        `- Estimated median: ${formatCurrency(result.estimatedMedian)}`,
        `- Estimated max: ${formatCurrency(result.estimatedMax)}`,
        '',
        `## Advice\n${result.advice}`,
        '',
        '## Comparable listings',
      ];

      for (const listing of result.comparableListings) {
        lines.push(`- ${formatListingSummary(listing)}`);
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.registerTool(
    'search_products',
    {
      title: 'Search products with criteria',
      description:
        'Advanced product search with feature/criteria filters across all supported sources. Use when looking for product X with features Y and Z.',
      inputSchema: searchInputSchema,
    },
    async (input) => {
      const result = await searchProducts({
        query: input.query,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        condition: input.condition as Condition | undefined,
        location: input.location,
        features: input.features,
        sources: input.sources as SourceId[] | undefined,
        limit: input.limit,
      });

      const lines = [
        formatSummaryHeader('Product Search Results', result.query),
        `Matched listings: ${result.listings.length}`,
        `Features filter: ${input.features?.join(', ') ?? 'none'}`,
        '',
      ];

      for (const listing of result.listings.slice(0, 20)) {
        lines.push(`- ${formatListingSummary(listing)}`);
      }

      if (result.errors.length) {
        lines.push('', '## Provider warnings');
        for (const error of result.errors) {
          lines.push(`- ${error.source}: ${error.message}`);
        }
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createPriceScoutServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
