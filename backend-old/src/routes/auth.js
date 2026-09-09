import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db, findUserByPhone } from '../store/db.js';
import { signToken } from '../middleware/auth.js';
import { appendAudit } from '../services/audit.js';

const router = Router();

// 1) OTP iste — telefon numarasına 6 haneli kod gönderilir
// Üretimde: NetGSM / Twilio SMS + rate limiting
router.post('/request-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Telefon gerekli' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.otps.set(phone, { code, expiresAt: Date.now() + 3 * 60 * 1000 });

  // DEMO: kodu response'ta döndürüyoruz. ÜRETİMDE ASLA döndürmeyin — SMS ile gönderin.
  console.log(`[OTP] ${phone} -> ${code}`);
  res.json({ ok: true, devHint: code });
});

// 2) OTP doğrula — başarılıysa kullanıcı oluştur/getir ve JWT ver
router.post('/verify-otp', (req, res) => {
  const { phone, code, name } = req.body;
  const rec = db.otps.get(phone);
  if (!rec || rec.code !== code || Date.now() > rec.expiresAt) {
    return res.status(400).json({ error: 'Kod hatalı veya süresi doldu' });
  }
  db.otps.delete(phone);

  let user = findUserByPhone(phone);
  if (!user) {
    user = {
      id: nanoid(10),
      phone,
      name: name || 'Üye',
      tcVerified: false, // MASAK KYC: Model B'de altın/ödeme öncesi zorunlu
      iban: null,
      createdAt: new Date().toISOString(),
    };
    db.users.set(user.id, user);
    appendAudit('user', 'register', user.id, { phone });
  }

  res.json({ token: signToken(user.id), user });
});

export default router;
