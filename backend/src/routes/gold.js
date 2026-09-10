import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);
const gold = getGoldProvider();

router.get('/price', async (_req, res) => {
  const gram = await gold.getSpotPrice('gram');
  const ceyrek = await gold.getSpotPrice('ceyrek');
  const jitter = (v) => +(v * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2);
  res.json({
    updatedAt: new Date().toISOString(),
    prices: [
      { key: 'gram', label: 'Gram Altın', buy: jitter(gram.buy), unit: 'TL/gr' },
      { key: 'ceyrek', label: 'Çeyrek Altın', buy: jitter(ceyrek.buy), unit: 'TL/adet' },
    ],
  });
});

export default router;
