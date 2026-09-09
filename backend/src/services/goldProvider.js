import { nanoid } from 'nanoid';
import { config } from '../config.js';

// ── DİJİTAL ALTIN PLATFORMU ADAPTÖRÜ (Model B) ──────────────────────────
// KRİTİK: Altın alımı, saklaması ve FİZİKİ TESLİMATI lisanslı bir dijital
// altın platformu (Minted / ARDGold / Nadir Metal ...) tarafında yapılır.
// Biz sadece "sıradaki üyeye X gram altın gönder" emrini iletiriz.
//
// Akış:
//   1) Havuz (tur) tamamlanınca buyGold() ile alım tetiklenir.
//   2) Fiyat, ödeme anındaki kurdan kilitlenir (fiyat oynaklığı riski partnerde).
//   3) requestPhysicalDelivery() ile sigortalı kargo teslimatı başlatılır.
//   4) Kargo takip no ile teslimat izlenir.

class GoldProviderBase {
  async getSpotPrice(unit) { throw new Error('not implemented'); }
  async buyGold({ grams, lockedPrice, idempotencyKey }) { throw new Error('not implemented'); }
  async requestPhysicalDelivery({ orderRef, recipient, address }) { throw new Error('not implemented'); }
  async getDeliveryStatus(trackingNo) { throw new Error('not implemented'); }
}

// --- MOCK (yerel geliştirme / demo) ---
class MockGoldProvider extends GoldProviderBase {
  async getSpotPrice(unit = 'gram') {
    // Demo fiyat. Gerçekte partnerin canlı kurundan gelir.
    const prices = { gram: 4850, ceyrek: 7920 }; // TRY (örnek)
    return { unit, buy: prices[unit] ?? prices.gram, ts: new Date().toISOString() };
  }

  async buyGold({ grams, lockedPrice, idempotencyKey }) {
    return {
      status: 'purchased',
      orderRef: 'gold_' + nanoid(12),
      grams,
      lockedPrice,
      idempotencyKey,
      purchasedAt: new Date().toISOString(),
    };
  }

  async requestPhysicalDelivery({ orderRef, recipient, address }) {
    return {
      status: 'shipping',
      orderRef,
      trackingNo: 'TR' + nanoid(10).toUpperCase(),
      carrier: 'Sigortalı Kargo',
      recipient,
      address,
      estimatedDays: 3,
    };
  }

  async getDeliveryStatus(trackingNo) {
    return { trackingNo, status: 'in_transit', updatedAt: new Date().toISOString() };
  }
}

// --- ARDGold / Minted iskeleti (gerçek entegrasyon) ---
class MintedGoldProvider extends GoldProviderBase {
  // async buyGold({...}) { const res = await fetch('https://api.partner...', {...}); }
}

export function getGoldProvider() {
  switch (config.gold.provider) {
    case 'minted': return new MintedGoldProvider();
    case 'mock':
    default: return new MockGoldProvider();
  }
}
