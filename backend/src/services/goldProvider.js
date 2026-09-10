import { nanoid } from 'nanoid';

// ── DİJİTAL ALTIN PLATFORMU ADAPTÖRÜ ────────────────────────────────────
// Fiyatlar CANLI kaynaklardan çekilir (yedekli). Altın alımı + fiziki
// teslimat kısmı Model B'de lisanslı platforma (ARDGold/Minted) gidecek;
// şimdilik mock. Fiyat gösterimi ise GERÇEK piyasadan gelir.
//
// Kaynak sırası (biri çökerse diğerine düşer, ikisi de çökerse mock):
//   1) turkpidya.com   (Harem Altın verisi, anahtarsız)
//   2) gramaltinkactl.com (anahtarsız, değişim %)
//   3) statik mock (son çare — uygulama asla kırılmaz)

const CACHE_MS = 60 * 1000; // 60 sn önbellek (rate-limit dostu)
let cache = { at: 0, data: null };

const MOCK = {
  gram:   { buy: 4850, changePercent: 0, source: 'mock' },
  ceyrek: { buy: 7920, changePercent: 0, source: 'mock' },
};

async function fetchJson(url, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(t); }
}

// --- Kaynak 1: turkpidya (gram + çeyrek) ---
async function fromTurkpidya() {
  const base = 'https://turkpidya.com/wp-json/turkpidya-data/v1/gold';
  const [gramJson, coinJson] = await Promise.all([
    fetchJson(base + '?category=gram'),
    fetchJson(base + '?category=coin').catch(() => null),
  ]);

  const gramArr = gramJson?.prices || [];
  const g = gramArr.find((p) => /24|gram/i.test(p.type || p.name_tr || '')) || gramArr[0];
  if (!g) throw new Error('turkpidya gram yok');

  let ceyrek = null;
  const coinArr = coinJson?.prices || [];
  const c = coinArr.find((p) => /ceyrek|çeyrek/i.test(p.type || p.name_tr || ''));
  if (c) ceyrek = { buy: Number(c.sell ?? c.buy), changePercent: Number(c.change_percent ?? 0), source: 'turkpidya' };

  return {
    gram:   { buy: Number(g.sell ?? g.buy), changePercent: Number(g.change_percent ?? 0), source: 'turkpidya' },
    ceyrek: ceyrek || { buy: Number(g.sell ?? g.buy) * 1.63, changePercent: Number(g.change_percent ?? 0), source: 'turkpidya~' },
  };
}

// --- Kaynak 2: gramaltinkactl ---
async function fromGramAltinKacTl() {
  const json = await fetchJson('https://gramaltinkactl.com/api/v1/prices?category=gold');
  const arr = json?.data?.gold || [];
  const g = arr.find((x) => /gram-altin|gram alt/i.test(x.slug || x.name || ''));
  const c = arr.find((x) => /ceyrek|çeyrek/i.test(x.slug || x.name || ''));
  if (!g) throw new Error('gramaltinkactl gram yok');
  return {
    gram:   { buy: Number(g.sellPrice ?? g.buyPrice), changePercent: Number(g.change ?? 0), source: 'gramaltinkactl' },
    ceyrek: c ? { buy: Number(c.sellPrice ?? c.buyPrice), changePercent: Number(c.change ?? 0), source: 'gramaltinkactl' }
              : { buy: Number(g.sellPrice ?? g.buyPrice) * 1.63, changePercent: Number(g.change ?? 0), source: 'gramaltinkactl~' },
  };
}

async function loadPrices() {
  // Önbellek taze mi?
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;

  // Sırayla dene
  for (const src of [fromTurkpidya, fromGramAltinKacTl]) {
    try {
      const data = await src();
      if (data?.gram?.buy > 0) { cache = { at: Date.now(), data }; return data; }
    } catch (e) {
      console.warn('[gold] kaynak başarısız:', src.name, e.message);
    }
  }
  // Son çare: mock (ama eski önbellek varsa onu tercih et)
  if (cache.data) return cache.data;
  return MOCK;
}

class GoldProvider {
  // Canlı spot fiyat (unit: 'gram' | 'ceyrek')
  async getSpotPrice(unit = 'gram') {
    const prices = await loadPrices();
    const p = prices[unit] || prices.gram;
    return { unit, buy: p.buy, changePercent: p.changePercent ?? 0, source: p.source || 'live', ts: new Date().toISOString() };
  }

  // Tüm fiyatları döndür (ekran için)
  async getAllPrices() { return await loadPrices(); }

  // --- Alım + fiziki teslimat (Model B'de lisanslı platform; şimdilik mock) ---
  async buyGold({ grams, lockedPrice, idempotencyKey }) {
    return { status: 'purchased', orderRef: 'gold_' + nanoid(12), grams, lockedPrice, idempotencyKey };
  }
  async requestPhysicalDelivery({ orderRef, recipient, address }) {
    return { status: 'shipping', orderRef, trackingNo: 'TR' + nanoid(10).toUpperCase(), carrier: 'Sigortalı Kargo', recipient, address, estimatedDays: 3 };
  }
}

export function getGoldProvider() { return new GoldProvider(); }
