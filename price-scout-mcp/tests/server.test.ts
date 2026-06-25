import { describe, expect, it } from 'vitest';
import { createPriceScoutServer } from '../src/server.js';

describe('createPriceScoutServer', () => {
  it('should create an MCP server instance', () => {
    const server = createPriceScoutServer();
    expect(server).toBeDefined();
  });
});
