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
// Telefon: sadece rakam, tam 11 hane
function validPhone(p) { return /^[0-9]{11}$/.test(String(p || '').replace(/[^0-9]/g, '')); }

// ── PANEL HTML ───────────────────────────────────────────────────
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
              (SELECT COUNT(*) FROM memberships m WHERE m.user_id=u.id)::int AS group_count,
              (SELECT COUNT(*) FROM groups g WHERE g.owner_id=u.id)::int AS owned_groups
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

// ── Kullanıcı güncelle (name / username / phone) ─────────────────
router.post('/users/update', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  const { phone, username, name, newPhone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone (mevcut) gerekli' });
  try {
    const pool = await getPool();
    const u = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (!u.rows.length) return res.status(404).json({ error: 'Kullanıcı yok' });

    // Kullanıcı adı değişikliği (benzersizlik kontrolü)
    if (username) {
      const dup = await pool.query('SELECT id FROM users WHERE LOWER(username)=LOWER($1) AND phone<>$2', [username, phone]);
      if (dup.rows.length) return res.status(409).json({ error: 'Kullanıcı adı başkasında kayıtlı' });
      await pool.query('UPDATE users SET username=$1 WHERE phone=$2', [username, phone]);
    }

    // Ad değişikliği
    if (name) await pool.query('UPDATE users SET name=$1 WHERE phone=$2', [name, phone]);

    // Telefon değişikliği (11 hane + benzersizlik)
    if (newPhone) {
      const np = String(newPhone).replace(/[^0-9]/g, '');
      if (!validPhone(np)) return res.status(400).json({ error: 'Yeni telefon 11 haneli olmalıdır' });
      const dupP = await pool.query('SELECT id FROM users WHERE phone=$1 AND phone<>$2', [np, phone]);
      if (dupP.rows.length) return res.status(409).json({ error: 'Bu telefon başkasında kayıtlı' });
      await pool.query('UPDATE users SET phone=$1 WHERE phone=$2', [np, phone]);
    }

    const finalPhone = newPhone ? String(newPhone).replace(/[^0-9]/g, '') : phone;
    const { rows } = await pool.query('SELECT id, name, username, phone FROM users WHERE phone=$1', [finalPhone]);
    res.json({ ok: true, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kullanıcı sil (sahibi olduğu gruplar + tüm bağlı veriler dahil) ──
router.post('/users/delete', async (req, res) => {
  if (!checkKey(req, res)) return;
  if (!ensurePg(res)) return;
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone gerekli' });

  const pool = await getPool();
  const client = await pool.connect();
  try {
    const u = await client.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (!u.rows.length) { client.release(); return res.status(404).json({ error: 'Kullanıcı yok' }); }
    const uid = u.rows[0].id;

    await client.query('BEGIN');

    // 1) Kullanıcının SAHİBİ olduğu grupları ve o gruplara bağlı her şeyi sil
    const owned = await client.query('SELECT id FROM groups WHERE owner_id=$1', [uid]);
    const ownedGroupIds = owned.rows.map((r) => r.id);

    if (ownedGroupIds.length) {
      // Bu gruplara ait round id'leri (gold_orders round'a bağlı)
      const rnd = await client.query('SELECT id FROM rounds WHERE group_id = ANY($1::text[])', [ownedGroupIds]);
      const roundIds = rnd.rows.map((r) => r.id);

      if (roundIds.length) {
        await client.query('DELETE FROM gold_orders WHERE round_id = ANY($1::text[])', [roundIds]);
        await client.query('DELETE FROM payments   WHERE round_id = ANY($1::text[])', [roundIds]);
        await client.query('DELETE FROM rounds      WHERE id       = ANY($1::text[])', [roundIds]);
      }
      // Grubun tüm üyeliklerini sil (sadece silinen kullanıcının değil, herkesin)
      await client.query('DELETE FROM memberships WHERE group_id = ANY($1::text[])', [ownedGroupIds]);
      // Grupları sil
      await client.query('DELETE FROM groups WHERE id = ANY($1::text[])', [ownedGroupIds]);
    }

    // 2) Kullanıcının BAŞKA gruplardaki üyeliği + ödemeleri + altın siparişleri
    await client.query('DELETE FROM gold_orders WHERE beneficiary_id=$1', [uid]);
    await client.query('DELETE FROM payments    WHERE payer_id=$1', [uid]);
    await client.query('DELETE FROM memberships WHERE user_id=$1', [uid]);

    // 3) Son olarak kullanıcı
    await client.query('DELETE FROM users WHERE id=$1', [uid]);

    await client.query('COMMIT');
    res.json({ ok: true, deleted: phone, deletedOwnedGroups: ownedGroupIds.length });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── Tüm veriyi sıfırla ───────────────────────────────────────────
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
