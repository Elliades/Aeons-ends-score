import type { PriceProvider } from '../types.js';
import { AmazonProvider } from './amazon.js';
import { DealabsProvider } from './dealabs.js';
import { GenericProvider } from './generic.js';
import { LeboncoinProvider } from './leboncoin.js';

const providers: PriceProvider[] = [
  new AmazonProvider(),
  new DealabsProvider(),
  new LeboncoinProvider(),
  new GenericProvider(),
];

export function getProviders(): PriceProvider[] {
  return providers;
}

export function getProvider(id: string): PriceProvider | undefined {
  return providers.find((provider) => provider.id === id);
}
