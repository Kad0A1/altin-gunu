import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '../store/index.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Güvenlik: her API isteğinde ?key=RESET_KEY ───────────────────
function checkKey(req, res) {
  const provided = req.query.key || req.headers['x-admin-key'] || '';
  const expected = process.env.RESET_KEY || '';
  if (!expected) { res.status(403).json({ error: 'RESET_KEY tanımlı değil (Render Environment)' }); return false; }
  if (provided !== expected) { res.status(401).json({ error: 'Anahtar hatalı' }); return false; }
  return true;
}
async function getPool() { const { pool } = await import('../db/pool.js'); return pool; }
function ensurePg(res) {
  if (getStore().kind !== 'postgres') { res.status(400).json({ error: 'PostgreSQL modunda değil' }); return false; }
  return true;
}

// ── PANEL HTML (public/admin.html) ───────────────────────────────
// /api/admin/panel  → giriş + tablo arayüzü
router.get('/panel', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin.html'));
});

// ── Özet istatistik ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  try {
    const pool = await getPool();
    const [u, g, p, gold] = await Promise.all([
      pool.query('SELECT COUNT(*)::int c FROM users'),
      pool.query('SELECT COUNT(*)::int c FROM groups'),
      pool.query("SELECT COALESCE(SUM(amount),0)::numeric s FROM payments WHERE status='success'"),
      pool.query('SELECT COALESCE(SUM(gram),0)::numeric s FROM gold_orders'),
    ]);
    res.json({ users: u.rows[0].c, groups: g.rows[0].c, totalPaid: Number(p.rows[0].s), totalGoldGram: Number(gold.rows[0].s) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kullanıcıları listele ────────────────────────────────────────
router.get('/users', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  try {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT id, name, username, phone, created_at,
              (SELECT COUNT(*) FROM memberships m WHERE m.user_id=u.id)::int AS group_count
       FROM users u ORDER BY created_at DESC`);
    res.json({ count: rows.length, users: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Grupları listele ─────────────────────────────────────────────
router.get('/groups', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  try {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.invite_code, g.status, g.member_count, g.unit, g.amount,
              u.name AS owner_name,
              (SELECT COUNT(*) FROM memberships m WHERE m.group_id=g.id)::int AS current_members
       FROM groups g LEFT JOIN users u ON u.id=g.owner_id
       ORDER BY g.created_at DESC`);
    res.json({ count: rows.length, groups: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kullanıcı güncelle (POST: name / username) ───────────────────
router.post('/users/update', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  const { phone, username, name } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone gerekli' });
  try {
    const pool = await getPool();
    const u = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (!u.rows.length) return res.status(404).json({ error: 'Kullanıcı yok' });
    if (username) {
      const dup = await pool.query('SELECT id FROM users WHERE LOWER(username)=LOWER($1) AND phone<>$2', [username, phone]);
      if (dup.rows.length) return res.status(409).json({ error: 'Kullanıcı adı başkasında kayıtlı' });
      await pool.query('UPDATE users SET username=$1 WHERE phone=$2', [username, phone]);
    }
    if (name) await pool.query('UPDATE users SET name=$1 WHERE phone=$2', [name, phone]);
    const { rows } = await pool.query('SELECT id, name, username, phone FROM users WHERE phone=$1', [phone]);
    res.json({ ok: true, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kullanıcı sil (POST) ─────────────────────────────────────────
router.post('/users/delete', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone gerekli' });
  try {
    const pool = await getPool();
    const u = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (!u.rows.length) return res.status(404).json({ error: 'Kullanıcı yok' });
    const uid = u.rows[0].id;
    await pool.query('DELETE FROM memberships WHERE user_id=$1', [uid]);
    await pool.query('DELETE FROM payments WHERE payer_id=$1', [uid]);
    await pool.query('DELETE FROM users WHERE id=$1', [uid]);
    res.json({ ok: true, deleted: phone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tüm veriyi sıfırla (POST) ────────────────────────────────────
router.post('/reset', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  try {
    const pool = await getPool();
    await pool.query(`TRUNCATE TABLE gold_orders, payments, rounds, memberships, groups, otps, users RESTART IDENTITY CASCADE;`);
    res.json({ ok: true, message: 'Tüm veriler sıfırlandı' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
