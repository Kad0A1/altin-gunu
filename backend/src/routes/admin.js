import { Router } from 'express';
import { getStore } from '../store/index.js';

const router = Router();

// ⚠️ TEK SEFERLİK VERİ SIFIRLAMA UCU
// Kullanım: https://altin-gunu-backend.onrender.com/api/admin/reset?key=SECRET
// Güvenlik: RESET_KEY ortam değişkeni ile eşleşmeli.
// İŞ BİTİNCE: Render'dan RESET_KEY'i silin (uç otomatik devre dışı kalır).
router.get('/reset', async (req, res) => {
  const provided = req.query.key || '';
  const expected = process.env.RESET_KEY || '';
  if (!expected) return res.status(403).json({ error: 'RESET_KEY tanımlı değil (sunucuda ayarlayın)' });
  if (provided !== expected) return res.status(401).json({ error: 'Anahtar hatalı' });

  const store = getStore();
  if (store.kind !== 'postgres') {
    return res.status(400).json({ error: 'PostgreSQL modunda değil (store: ' + store.kind + ')' });
  }

  try {
    const { pool } = await import('../db/pool.js');
    await pool.query(`TRUNCATE TABLE gold_orders, payments, rounds, memberships, groups, otps, users RESTART IDENTITY CASCADE;`);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
    res.json({ ok: true, message: 'Tüm kullanıcı ve grup verileri sıfırlandı.', usersRemaining: rows[0].c });
  } catch (e) {
    res.status(500).json({ error: 'Sıfırlama hatası', detail: e.message });
  }
});

export default router;
