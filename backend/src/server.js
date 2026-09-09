import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initStore, getStore } from './store/index.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import paymentRoutes from './routes/payments.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', store: getStore().kind, ts: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/audit/verify', requireAuth, async (_req, res) => res.json(await getStore().verifyAuditChain()));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Sunucu hatası' }); });

// Önce veri deposunu başlat, sonra dinlemeye başla
initStore()
  .then(() => {
    app.listen(config.port, () =>
      console.log(`🟡 Altın Günü backend çalışıyor → http://localhost:${config.port}`));
  })
  .catch((e) => { console.error('Başlatma hatası:', e); process.exit(1); });
