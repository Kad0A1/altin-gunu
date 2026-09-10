import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../store/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getPaymentProvider } from '../services/paymentProvider.js';
import { getGoldProvider } from '../services/goldProvider.js';

const router = Router();
router.use(requireAuth);
const payments = getPaymentProvider();
const gold = getGoldProvider();

// Kart ekle (tokenize)
router.post('/cards', async (req, res) => {
  const store = getStore();
  const result = await payments.createCardToken(req.user.id);
  await store.setUserCardToken(req.user.id, result.token);
  await store.appendAudit('payment', 'card_added', req.user.id, { token: result.token });
  res.json({ ok: true, ...result });
});

// Tur için ödeme
router.post('/rounds/:roundId/pay', async (req, res) => {
  const store = getStore();
  const round = await store.getRound(req.params.roundId);
  if (!round) return res.status(404).json({ error: 'Tur bulunamadı' });
  const group = await store.getGroup(round.groupId);

  const members = await store.membershipsOfGroup(group.id);
  if (!members.some((m) => m.userId === req.user.id))
    return res.status(403).json({ error: 'Bu grubun üyesi değilsiniz' });

  const roundPayments = await store.paymentsOfRound(round.id);
  if (roundPayments.some((p) => p.payerId === req.user.id && p.status === 'success'))
    return res.status(400).json({ error: 'Bu tur için zaten ödediniz' });

  const user = await store.getUser(req.user.id);
  let cardToken = user.cardToken;
  if (!cardToken) {
    const c = await payments.createCardToken(user.id);
    await store.setUserCardToken(user.id, c.token);
    cardToken = c.token;
  }

  const charge = await payments.charge({ token: cardToken, amount: group.amount, currency: 'TRY',
    idempotencyKey: `pay_${round.id}_${req.user.id}`, description: `${group.name} - Tur ${round.roundNo}` });

  const payment = { id: nanoid(10), roundId: round.id, payerId: req.user.id, amount: group.amount,
    method: 'card', status: charge.status, providerRef: charge.providerRef, paidAt: charge.capturedAt };
  await store.createPayment(payment);
  await store.appendAudit('payment', 'charge', req.user.id,
    { roundId: round.id, providerRef: charge.providerRef, amount: group.amount });

  const paidCount = (await store.paymentsOfRound(round.id)).filter((p) => p.status === 'success').length;
  let goldTriggered = null;
  if (paidCount >= members.length) goldTriggered = await fulfillGold(store, round, group);

  res.json({ ok: true, payment, roundComplete: !!goldTriggered, gold: goldTriggered });
});

async function fulfillGold(store, round, group) {
  const beneficiary = await store.getUser(round.beneficiaryId);
  const price = await gold.getSpotPrice(group.unit);
  const poolTotal = group.amount * group.memberCount;
  const grams = +(poolTotal / price.buy).toFixed(4);
  const purchase = await gold.buyGold({ grams, lockedPrice: price.buy, idempotencyKey: `gold_${round.id}` });
  const delivery = await gold.requestPhysicalDelivery({ orderRef: purchase.orderRef,
    recipient: beneficiary.name, address: beneficiary.address || 'Kayıtlı adres' });

  const order = { id: nanoid(10), roundId: round.id, beneficiaryId: beneficiary.id, gram: grams,
    providerRef: purchase.orderRef, shippingStatus: delivery.status, trackingNo: delivery.trackingNo };
  await store.createGoldOrder(order);
  await store.updateRoundStatus(round.id, 'fulfilled');
  await store.appendAudit('gold', 'fulfill', 'system',
    { roundId: round.id, beneficiary: beneficiary.id, grams, trackingNo: delivery.trackingNo });
  return { order, delivery, grams, lockedPrice: price.buy };
}

export default router;
