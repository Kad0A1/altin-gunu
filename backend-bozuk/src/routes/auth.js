import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../store/index.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Telefon gerekli' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getStore().setOtp(phone, code, Date.now() + 3 * 60 * 1000);
  console.log(`[OTP] ${phone} -> ${code}`);
  res.json({ ok: true, devHint: code }); // DEMO: üretimde SMS ile gönderin
});

router.post('/verify-otp', async (req, res) => {
  const { phone, code, name } = req.body;
  const store = getStore();
  const rec = await store.getOtp(phone);
  if (!rec || rec.code !== code || Date.now() > rec.expiresAt) {
    return res.status(400).json({ error: 'Kod hatalı veya süresi doldu' });
  }
  await store.deleteOtp(phone);

  let user = await store.findUserByPhone(phone);
  if (!user) {
    user = { id: nanoid(10), phone, name: name || 'Üye', tcVerified: false, iban: null,
      createdAt: new Date().toISOString() };
    await store.createUser(user);
    await store.appendAudit('user', 'register', user.id, { phone });
  }
  res.json({ token: signToken(user.id), user });
});

export default router;
