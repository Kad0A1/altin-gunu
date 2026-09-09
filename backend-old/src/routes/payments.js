import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db, membershipsOfGroup, paymentsOfRound } from '../store/db.js';
import { requireAuth } from '../middleware/auth.js';
import { appendAudit } from '../services/audit.js';
import { getPaymentProvider } from '../services/paymentProvider.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);

const payments = getPaymentProvider();
const gold = getGoldProvider();

// ── Kart ekle (tokenize) ─────────────────────────────────────────
// Kart verisi bizde saklanmaz — partner token'ı saklarız.
router.post('/cards', async (req, res) => {
  const result = await payments.createCardToken(req.user.id);
  req.user.cardToken = result.token; // demo: kullanıcıya iliştir
  appendAudit('payment', 'card_added', req.user.id, { token: result.token });
  res.json({ ok: true, ...result });
});

// ── Bir tur için ödeme yap (tahsilatı partnere yönlendir) ────────
router.post('/rounds/:roundId/pay', async (req, res) => {
  const round = db.rounds.get(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Tur bulunamadı' });
  const group = db.groups.get(round.groupId);

  // Kullanıcı bu grupta üye mi?
  const isMember = membershipsOfGroup(group.id).some((m) => m.userId === req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Bu grubun üyesi değilsiniz' });

  // Çift ödeme kontrolü
  const already = paymentsOfRound(round.id).some(
    (p) => p.payerId === req.user.id && p.status === 'success');
  if (already) return res.status(400).json({ error: 'Bu tur için zaten ödediniz' });

  if (!req.user.cardToken)
    return res.status(400).json({ error: 'Önce kart ekleyin' });

  // Idempotency: aynı tur+kullanıcı için tek tahsilat
  const idempotencyKey = `pay_${round.id}_${req.user.id}`;

  // → LİSANSLI ÖDEME KURULUŞUNA tahsilat emri
  const charge = await payments.charge({
    token: req.user.cardToken,
    amount: group.amount,
    currency: 'TRY',
    idempotencyKey,
    description: `${group.name} - Tur ${round.roundNo}`,
  });

  const payment = {
    id: nanoid(10), roundId: round.id, payerId: req.user.id,
    amount: group.amount, method: 'card', status: charge.status,
    providerRef: charge.providerRef, receiptUrl: null,
    paidAt: charge.capturedAt,
  };
  db.payments.set(payment.id, payment);
  appendAudit('payment', 'charge', req.user.id,
    { roundId: round.id, providerRef: charge.providerRef, amount: group.amount });

  // Tüm üyeler ödedi mi? → altın alım + teslimatı tetikle
  const members = membershipsOfGroup(group.id);
  const paidCount = paymentsOfRound(round.id)
    .filter((p) => p.status === 'success').length;

  let goldTriggered = null;
  if (paidCount >= members.length) {
    goldTriggered = await fulfillGold(round, group);
  }

  res.json({ ok: true, payment, roundComplete: !!goldTriggered, gold: goldTriggered });
});

// ── Havuz dolunca: altın al + sıradaki üyeye fiziki gönder ───────
async function fulfillGold(round, group) {
  const beneficiary = db.users.get(round.beneficiaryId);
  const price = await gold.getSpotPrice(group.unit);

  // Toplam havuz / güncel fiyat → alınacak gram
  const poolTotal = group.amount * group.memberCount;
  const grams = +(poolTotal / price.buy).toFixed(4);

  // → LİSANSLI ALTIN PLATFORMUNA alım emri (fiyat kilitli)
  const purchase = await gold.buyGold({
    grams, lockedPrice: price.buy, idempotencyKey: `gold_${round.id}`,
  });

  // → Fiziki teslimat (sigortalı kargo, partner tarafında)
  const delivery = await gold.requestPhysicalDelivery({
    orderRef: purchase.orderRef,
    recipient: beneficiary.name,
    address: beneficiary.address || 'Kayıtlı adres',
  });

  const order = {
    id: nanoid(10), roundId: round.id, beneficiaryId: beneficiary.id,
    gram: grams, providerRef: purchase.orderRef,
    shippingStatus: delivery.status, trackingNo: delivery.trackingNo,
  };
  db.goldOrders.set(order.id, order);
  round.status = 'fulfilled';
  appendAudit('gold', 'fulfill', 'system',
    { roundId: round.id, beneficiary: beneficiary.id, grams, trackingNo: delivery.trackingNo });

  return { order, delivery, grams, lockedPrice: price.buy };
}

// ── Webhook: ödeme kuruluşundan gelen durum güncellemeleri ───────
// (chargeback, iade, başarısız tahsilat). İmza doğrulanır.
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-provider-signature'];
  if (!payments.verifyWebhookSignature(JSON.stringify(req.body), signature))
    return res.status(401).json({ error: 'Geçersiz imza' });
  appendAudit('payment', 'webhook', 'provider', req.body);
  res.json({ ok: true });
});

export default router;
