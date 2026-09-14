import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../store/index.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

// Kullanıcı adı kuralları: 3-20 karakter, harf/rakam/alt çizgi
function normUsername(u) { return String(u || '').trim(); }
function validUsername(u) { return /^[a-zA-Z0-9_]{3,20}$/.test(u); }
function normPhone(p) { return String(p || '').replace(/\s+/g, ''); }

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
async function sendOtp(store, phone) {
  const code = genCode();
  await store.setOtp(phone, code, Date.now() + 3 * 60 * 1000);
  console.log(`[OTP] ${phone} -> ${code}`);
  return code;
}

// ── KAYIT (register) ─────────────────────────────────────────────
// 1) Kayıt isteği: ad + kullanıcı adı + telefon benzersizlik kontrolü, OTP gönder
router.post('/register-request', async (req, res) => {
  const store = getStore();
  const name = String(req.body.name || '').trim();
  const username = normUsername(req.body.username);
  const phone = normPhone(req.body.phone);

  if (!name) return res.status(400).json({ error: 'Ad Soyad gerekli' });
  if (!validUsername(username))
    return res.status(400).json({ error: 'Kullanıcı adı 3-20 karakter olmalı (harf, rakam, _)' });
  if (!phone) return res.status(400).json({ error: 'Telefon gerekli' });

  // Benzersizlik: telefon
  if (await store.findUserByPhone(phone))
    return res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı. Giriş yapın.' });
  // Benzersizlik: kullanıcı adı
  if (await store.findUserByUsername(username))
    return res.status(409).json({ error: 'Bu kullanıcı adı alınmış, başka bir tane seçin.' });

  const devHint = await sendOtp(store, phone);
  res.json({ ok: true, devHint });
});

// 2) Kayıt doğrulama: OTP + son bir benzersizlik kontrolü, kullanıcı oluştur
router.post('/register-verify', async (req, res) => {
  const store = getStore();
  const name = String(req.body.name || '').trim();
  const username = normUsername(req.body.username);
  const phone = normPhone(req.body.phone);
  const code = String(req.body.code || '').trim();

  const rec = await store.getOtp(phone);
  if (!rec || rec.code !== code || Date.now() > rec.expiresAt)
    return res.status(400).json({ error: 'Kod hatalı veya süresi doldu' });

  // Yarış koşulu güvenliği: son kontrol
  if (await store.findUserByPhone(phone))
    return res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı.' });
  if (await store.findUserByUsername(username))
    return res.status(409).json({ error: 'Bu kullanıcı adı alınmış.' });

  await store.deleteOtp(phone);
  const user = { id: nanoid(10), phone, username, name, tcVerified: false,
    iban: null, createdAt: new Date().toISOString() };
  await store.createUser(user);
  await store.appendAudit('user', 'register', user.id, { username, phone });
  res.json({ token: signToken(user.id), user: { id: user.id, name, username, phone } });
});

// ── GİRİŞ (login) ────────────────────────────────────────────────
// 1) Giriş isteği: kullanıcı adı + telefon eşleşmeli, OTP gönder
router.post('/login-request', async (req, res) => {
  const store = getStore();
  const username = normUsername(req.body.username);
  const phone = normPhone(req.body.phone);
  if (!username || !phone) return res.status(400).json({ error: 'Kullanıcı adı ve telefon gerekli' });

  const user = await store.findUserByPhone(phone);
  if (!user) return res.status(404).json({ error: 'Kayıt bulunamadı. Önce kayıt olun.' });
  if (!user.username || user.username.toLowerCase() !== username.toLowerCase())
    return res.status(401).json({ error: 'Kullanıcı adı veya telefon hatalı' });

  const devHint = await sendOtp(store, phone);
  res.json({ ok: true, devHint });
});

// 2) Giriş doğrulama: OTP → token
router.post('/login-verify', async (req, res) => {
  const store = getStore();
  const phone = normPhone(req.body.phone);
  const code = String(req.body.code || '').trim();

  const rec = await store.getOtp(phone);
  if (!rec || rec.code !== code || Date.now() > rec.expiresAt)
    return res.status(400).json({ error: 'Kod hatalı veya süresi doldu' });

  const user = await store.findUserByPhone(phone);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  await store.deleteOtp(phone);
  res.json({ token: signToken(user.id), user: { id: user.id, name: user.name, username: user.username, phone: user.phone } });
});

export default router;
