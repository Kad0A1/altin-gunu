import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);
const gold = getGoldProvider();

// Canlı altın kuru (gram + çeyrek) — altingrafigi.com gerçek piyasa verisi
router.get('/price', async (_req, res) => {
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
