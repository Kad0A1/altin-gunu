import { nanoid } from 'nanoid';
import { config } from '../config.js';

// Ödeme Kuruluşu adaptörü (Model B). Uygulama fonu tutmaz.
class MockPaymentProvider {
  async createCardToken() { return { token: 'tok_' + nanoid(12), addedAt: new Date().toISOString() }; }
  async charge({ token, amount, currency = 'TRY', idempotencyKey, description }) {
    return { status: 'success', providerRef: 'pay_' + nanoid(14), amount, currency,
      idempotencyKey, description, capturedAt: new Date().toISOString() };
  }
  async refund(ref) { return { status: 'refunded', providerRef: ref }; }
  verifyWebhookSignature() { return true; }
}

export function getPaymentProvider() {
  // İleride: case 'iyzico' / 'paytr' ...
  return new MockPaymentProvider();
}
