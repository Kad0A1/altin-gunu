import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
const gold = getGoldProvider();

// ── TEŞHİS UCU (token'sız) ───────────────────────────────────────────────
// Tarayıcıdan aç: https://altin-gunu-backend.onrender.com/api/gold/debug
// Render'ın altingrafigi'den GERÇEKTE ne çektiğini ham olarak gösterir.
router.get('/debug', async (_req, res) => {
  const out = { step: 'start', ts: new Date().toISOString() };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch('https://altingrafigi.com/api/v1/prices', {
      signal: ctrl.signal, headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    out.httpStatus = r.status;
    const text = await r.text();
    out.rawLength = text.length;
    // İlk 1500 karakteri göster (ham)
    out.rawPreview = text.slice(0, 1500);
    try {
      const json = JSON.parse(text);
      out.parsedCount = Array.isArray(json?.data) ? json.data.length : 'data dizi değil';
      out.symbols = Array.isArray(json?.data) ? json.data.map((x) => ({ symbol: x.symbol, category: x.category, name: x.name, bid: x.bid, ask: x.ask })) : null;
    } catch (pe) { out.parseError = pe.message; }
    // Provider ne üretiyor:
    out.providerResult = await gold.getAllPrices().catch((e) => ({ providerError: e.message }));
  } catch (e) {
    out.fetchError = e.message;
    out.diagnosis = 'Render altingrafigi.com adresine ULAŞAMIYOR (engelli/timeout).';
  }
  res.json(out);
});

// Canlı fiyat (uygulama bunu kullanır) — token gerekli
router.get('/price', requireAuth, async (_req, res) => {
  const all = await gold.getAllPrices();
  if (!all || !all.gram || !(all.gram.buy > 0)) {
    return res.status(502).json({ error: 'Canlı fiyata şu an ulaşılamıyor', live: false });
  }
  const prices = [
    { key: 'gram', label: 'Gram Altın (Has)', buy: all.gram.buy, bid: all.gram.bid, unit: 'TL/gr' },
  ];
  if (all.ceyrek && all.ceyrek.buy > 0) {
    prices.push({ key: 'ceyrek', label: 'Çeyrek Altın', buy: all.ceyrek.buy, bid: all.ceyrek.bid, unit: 'TL/adet' });
  }
  res.json({
    updatedAt: all.updatedAt || new Date().toISOString(),
    source: all.gram.source,
    live: all.gram.source === 'altingrafigi',
    stale: !!all.stale,
    prices,
  });
});

export default router;
