import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import paymentRoutes from './routes/payments.js';
import { verifyAuditChain } from './services/audit.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// Sağlık kontrolü
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Rotalar
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payments', paymentRoutes);

// Denetim defteri bütünlük kontrolü (şeffaflık)
app.get('/api/audit/verify', requireAuth, (_req, res) => res.json(verifyAuditChain()));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

app.listen(config.port, () =>
  console.log(`🟡 Altın Günü backend çalışıyor → http://localhost:${config.port}`));
