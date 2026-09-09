import { nanoid } from 'nanoid';

// Dijital altın platformu adaptörü (Model B). Altın alımı + fiziki teslimat partnerde.
class MockGoldProvider {
  async getSpotPrice(unit = 'gram') {
    const prices = { gram: 4850, ceyrek: 7920 };
    return { unit, buy: prices[unit] ?? prices.gram, ts: new Date().toISOString() };
  }
  async buyGold({ grams, lockedPrice, idempotencyKey }) {
    return { status: 'purchased', orderRef: 'gold_' + nanoid(12), grams, lockedPrice, idempotencyKey };
  }
  async requestPhysicalDelivery({ orderRef, recipient, address }) {
    return { status: 'shipping', orderRef, trackingNo: 'TR' + nanoid(10).toUpperCase(),
      carrier: 'Sigortalı Kargo', recipient, address, estimatedDays: 3 };
  }
}

export function getGoldProvider() { return new MockGoldProvider(); }
