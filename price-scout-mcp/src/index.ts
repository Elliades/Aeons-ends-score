#!/usr/bin/env node
import { startServer } from './server.js';

startServer().catch((error) => {
  console.error('Failed to start price-scout-mcp:', error);
  process.exit(1);
});
