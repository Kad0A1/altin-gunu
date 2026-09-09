import { nanoid } from 'nanoid';
import { config } from '../config.js';

// ── ÖDEME KURULUŞU ADAPTÖRÜ (Model B) ───────────────────────────────────
// KRİTİK: Uygulama fonu ASLA tutmaz. Tahsilat ve saklama lisanslı bir
// Ödeme Kuruluşu (iyzico / PayTR / Param / Sipay ...) tarafında olur.
// Biz sadece "orkestrasyon" yaparız: tahsilatı tetikler, sonucu dinleriz.
//
// Bu dosya bir ARABİRİM (interface) tanımlar. Gerçek entegrasyonda
// aşağıdaki metotlar ilgili partnerin REST API'sine bağlanır.
//
// PCI-DSS: Kart verisi bizde saklanmaz. Kart, partnerin hosted/iframe
// formunda tokenize edilir; biz sadece token ile işlem yaparız.

class PaymentProviderBase {
  async createCardToken(userId, cardHolderMasked) { throw new Error('not implemented'); }
  async charge({ token, amount, currency, idempotencyKey, description }) { throw new Error('not implemented'); }
  async refund(providerRef) { throw new Error('not implemented'); }
  verifyWebhookSignature(rawBody, signature) { throw new Error('not implemented'); }
}

// --- MOCK (yerel geliştirme / demo) ---
class MockPaymentProvider extends PaymentProviderBase {
  async createCardToken(userId) {
    return { token: 'tok_' + nanoid(12), addedAt: new Date().toISOString() };
  }

  async charge({ token, amount, currency = 'TRY', idempotencyKey, description }) {
    // Demo: her zaman başarılı. Idempotency key ile çift tahsilat önlenir.
    return {
      status: 'success',
      providerRef: 'pay_' + nanoid(14),
      amount,
      currency,
      idempotencyKey,
      description,
      capturedAt: new Date().toISOString(),
    };
  }

  async refund(providerRef) {
    return { status: 'refunded', providerRef, refundedAt: new Date().toISOString() };
  }

  verifyWebhookSignature() { return true; }
}

// --- iyzico iskeleti (gerçek entegrasyon için doldurulacak) ---
class IyzicoPaymentProvider extends PaymentProviderBase {
  // async charge({...}) {
  //   const res = await fetch('https://api.iyzipay.com/payment/auth', {...});
  //   ...
  // }
}

export function getPaymentProvider() {
  switch (config.payment.provider) {
    case 'iyzico': return new IyzicoPaymentProvider();
    case 'mock':
    default: return new MockPaymentProvider();
  }
}
