import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);
const gold = getGoldProvider();

// Canlı altın kuru (gram + çeyrek) — gerçek piyasa verisi + günlük değişim
router.get('/price', async (_req, res) => {
  try {
    const gram = await gold.getSpotPrice('gram');
    const ceyrek = await gold.getSpotPrice('ceyrek');
    res.json({
      updatedAt: new Date().toISOString(),
      source: gram.source,
      live: gram.source !== 'mock',
      prices: [
        { key: 'gram',   label: 'Gram Altın',   buy: gram.buy,   unit: 'TL/gr',   changePercent: gram.changePercent },
        { key: 'ceyrek', label: 'Çeyrek Altın', buy: ceyrek.buy, unit: 'TL/adet', changePercent: ceyrek.changePercent },
      ],
    });
  } catch (e) {
    res.status(502).json({ error: 'Fiyat alınamadı', detail: e.message });
  }
});

export default router;
