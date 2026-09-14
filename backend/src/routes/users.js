import { Router } from 'express';
import { getStore } from '../store/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);
const gold = getGoldProvider();

router.get('/me', async (req, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, name: u.name, username: u.username || null, phone: u.phone,
    iban: u.iban || null, address: u.address || null, tcVerified: !!u.tcVerified } });
});

// Profil güncelle — kullanıcı adı ve telefon DEĞİŞTİRİLEMEZ (benzersiz kimlik)
router.patch('/me', async (req, res) => {
  const store = getStore();
  const { name, iban, address } = req.body;
  const fields = {};
  if (name !== undefined) fields.name = name;
  if (iban !== undefined) fields.iban = iban;
  if (address !== undefined) fields.address = address;
  const updated = await store.updateUser(req.user.id, fields);
  await store.appendAudit('user', 'update_profile', req.user.id, Object.keys(fields));
  res.json({ ok: true, user: { id: updated.id, name: updated.name, username: updated.username || null,
    phone: updated.phone, iban: updated.iban || null, address: updated.address || null } });
});

router.get('/me/summary', async (req, res) => {
  const store = getStore();
  const uid = req.user.id;
  const goldOrders = await store.goldOrdersOfUser(uid);
  const goldGram = goldOrders.reduce((s, o) => s + (Number(o.gram) || 0), 0);
  const payments = await store.paymentsOfUser(uid);
  const totalPaid = payments.filter((p) => p.status === 'success').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const groups = await store.listUserGroups(uid);
  const activeGroups = groups.filter((g) => g.status !== 'completed').length;
  const price = await gold.getSpotPrice('gram');
  const goldValueTry = price.buy ? +(goldGram * price.buy).toFixed(2) : 0;
  res.json({ goldGram: +goldGram.toFixed(4), goldValueTry, totalPaid, groupCount: groups.length, activeGroups,
    goldOrders: goldOrders.map((o) => ({ gram: o.gram, trackingNo: o.trackingNo, status: o.shippingStatus })) });
});

export default router;
