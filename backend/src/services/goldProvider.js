import { nanoid } from 'nanoid';

// ── CANLI ALTIN FİYATI (altingrafigi.com) ───────────────────────────────
// Doğrulanmış format (2026):
// { data: [ { symbol:'ALTIN', name:'Has Altın', category:'GRAM ALTIN',
//             bid:6771.74, ask:6800.24, timestamp:'...' }, ... ] }
//  bid = alış, ask = satış.

const ALL_URL = 'https://altingrafigi.com/api/v1/prices';
const CACHE_MS = 60 * 1000;
let cache = { at: 0, data: null };

async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(t); }
}

function norm(item, sourceLabel) {
  const buy = Number(item.ask ?? item.bid);
  const bid = Number(item.bid ?? item.ask);
  return { buy, bid, source: sourceLabel, name: item.name, category: item.category };
}

async function loadPrices() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const json = await fetchJson(ALL_URL);
    const arr = Array.isArray(json?.data) ? json.data : [];
    if (!arr.length) throw new Error('boş veri');

    const gramItem = arr.find((x) => x.symbol === 'ALTIN')
      || arr.find((x) => /GRAM ALTIN/i.test(x.category || ''))
      || arr.find((x) => /gram/i.test(x.name || ''));
    const ceyrekItem = arr.find((x) => /CEYREK[_ ]?YENI/i.test(x.symbol || ''))
      || arr.find((x) => /çeyrek|ceyrek/i.test((x.category || '') + (x.name || '')));

    if (!gramItem) throw new Error('gram bulunamadı');

    const data = {
      gram: norm(gramItem, 'altingrafigi'),
      ceyrek: ceyrekItem ? norm(ceyrekItem, 'altingrafigi') : null,
      updatedAt: json.updatedAt || new Date().toISOString(),
      stale: !!json.stale,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('[gold] canlı fiyat alınamadı:', e.message);
    if (cache.data) return cache.data;
    return null;
  }
}

class GoldProvider {
  async getSpotPrice(unit = 'gram') {
    const prices = await loadPrices();
    if (!prices) return { unit, buy: null, source: 'unavailable', ts: new Date().toISOString() };
    const p = unit === 'ceyrek' ? (prices.ceyrek || prices.gram) : prices.gram;
    return { unit, buy: p.buy, bid: p.bid, source: p.source, name: p.name,
      updatedAt: prices.updatedAt, ts: new Date().toISOString() };
  }
  async getAllPrices() { return await loadPrices(); }
  async buyGold({ grams, lockedPrice, idempotencyKey }) {
    return { status: 'purchased', orderRef: 'gold_' + nanoid(12), grams, lockedPrice, idempotencyKey };
  }
  async requestPhysicalDelivery({ orderRef, recipient, address }) {
    return { status: 'shipping', orderRef, trackingNo: 'TR' + nanoid(10).toUpperCase(), carrier: 'Sigortalı Kargo', recipient, address, estimatedDays: 3 };
  }
}

export function getGoldProvider() { return new GoldProvider(); }
