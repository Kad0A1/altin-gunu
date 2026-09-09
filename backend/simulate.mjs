// Uçtan uca simülasyon: HTTP olmadan çekirdek iş mantığını doğrular.
// Çalıştır: node simulate.mjs
import { nanoid } from 'nanoid';
import { db, membershipsOfGroup, paymentsOfRound } from './src/store/db.js';
import { hashNonce, buildSeed, drawOrder, verifyDraw } from './src/services/kura.js';
import { getPaymentProvider } from './src/services/paymentProvider.js';
import { getGoldProvider } from './src/services/goldProvider.js';
import { appendAudit, verifyAuditChain } from './src/services/audit.js';

const payments = getPaymentProvider();
const gold = getGoldProvider();
const log = (...a) => console.log(...a);

// 1) 5 kullanıcı kaydı
const names = ['Kadir', 'Ayşe', 'Mehmet', 'Zeynep', 'Ali'];
const users = names.map((name) => {
  const u = { id: nanoid(8), name, phone: '05' + Math.floor(1e8 + Math.random() * 1e8),
    address: name + ' Mah. No:1', createdAt: new Date().toISOString() };
  db.users.set(u.id, u); appendAudit('user', 'register', u.id, {});
  return u;
});
log('1) Kayıt: %d kullanıcı ✓', users.length);

// 2) Grup oluştur (Kadir kurucu)
const group = { id: nanoid(8), name: 'Ofis Altın Günü', ownerId: users[0].id,
  memberCount: 5, unit: 'gram', amount: 1, period: 'monthly',
  startDate: new Date().toISOString(), status: 'forming', inviteCode: 'GX7K2Q' };
db.groups.set(group.id, group);
appendAudit('group', 'create', group.ownerId, { groupId: group.id });
log('2) Grup: "%s" (kod %s) ✓', group.name, group.inviteCode);

// 3) Herkes davet koduyla katılır
users.forEach((u) => {
  const m = { id: nanoid(8), groupId: group.id, userId: u.id, slotNo: null,
    role: u.id === group.ownerId ? 'owner' : 'member' };
  db.memberships.set(m.id, m);
});
log('3) Katılım: %d üye linkle girdi ✓', membershipsOfGroup(group.id).length);

// 4) Kanıtlanabilir adil kura
const members = membershipsOfGroup(group.id);
const nonces = members.map(() => nanoid(16));
const commits = nonces.map(hashNonce);
const seed = buildSeed(group.id, nonces);
const order = drawOrder(members.map((m) => m.userId), seed);
order.forEach((uid, i) => { members.find((m) => m.userId === uid).slotNo = i + 1; });
order.forEach((uid, i) => {
  const due = new Date(group.startDate); due.setMonth(due.getMonth() + i);
  db.rounds.set(nanoid(8), { id: nanoid(8), groupId: group.id, roundNo: i + 1,
    beneficiaryId: uid, dueDate: due.toISOString(), status: 'pending' });
});
group.status = 'drawn';
appendAudit('group', 'draw', group.ownerId, { seed, commits, order });
log('4) Kura çekildi. Sıra: %s', order.map((id) => db.users.get(id).name).join(' → '));
log('   Bağımsız doğrulama: %s', verifyDraw(group.id, nonces, members.map((m) => m.userId), order) ? '✓ ADİL' : '✗ HATA');

// 5) Her üye kart ekler
for (const u of users) {
  const c = await payments.createCardToken(u.id); u.cardToken = c.token;
}
log('5) Kart ekleme (tokenize, PCI-DSS partnerde): %d üye ✓', users.length);

// 6) İlk turu tam çevrim: herkes öder → altın alınır → sıradakine kargolanır
const rounds = [...db.rounds.values()].sort((a, b) => a.roundNo - b.roundNo);
const round1 = rounds[0];
log('\n6) TUR 1 — alıcı: %s', db.users.get(round1.beneficiaryId).name);

for (const u of users) {
  const charge = await payments.charge({ token: u.cardToken, amount: group.amount,
    currency: 'TRY', idempotencyKey: `pay_${round1.id}_${u.id}`, description: 'Tur 1' });
  db.payments.set(charge.providerRef, { id: charge.providerRef, roundId: round1.id,
    payerId: u.id, amount: group.amount, status: charge.status, providerRef: charge.providerRef });
  appendAudit('payment', 'charge', u.id, { ref: charge.providerRef });
  log('   %s ödedi → %s (%s)', u.name.padEnd(7), charge.providerRef, charge.status);
}

const paidCount = paymentsOfRound(round1.id).filter((p) => p.status === 'success').length;
log('   Havuz durumu: %d/%d ödendi', paidCount, members.length);

// 7) Havuz doldu → altın al + fiziki teslimat
if (paidCount >= members.length) {
  const price = await gold.getSpotPrice(group.unit);
  const poolTotal = group.amount * group.memberCount;
  const grams = +(poolTotal / price.buy).toFixed(4);
  const purchase = await gold.buyGold({ grams, lockedPrice: price.buy, idempotencyKey: `gold_${round1.id}` });
  const beneficiary = db.users.get(round1.beneficiaryId);
  const delivery = await gold.requestPhysicalDelivery({ orderRef: purchase.orderRef,
    recipient: beneficiary.name, address: beneficiary.address });
  round1.status = 'fulfilled';
  appendAudit('gold', 'fulfill', 'system', { grams, trackingNo: delivery.trackingNo });
  log('\n7) 🪙 Altın alındı: %s gr @ %s TL/gr', grams, price.buy);
  log('   Fiziki teslimat → %s | kargo: %s (%s)', beneficiary.name, delivery.trackingNo, delivery.carrier);
}

// 8) Denetim defteri bütünlüğü
const chain = verifyAuditChain();
log('\n8) Denetim defteri: %d kayıt | bütünlük: %s',
  chain.length, chain.valid ? '✓ GEÇERLİ (hash zinciri sağlam)' : '✗ BOZUK');

log('\n✅ Uçtan uca akış başarıyla tamamlandı.');
