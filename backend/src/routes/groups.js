import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getStore } from '../store/index.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { buildSeed, drawOrder, hashNonce } from '../services/kura.js';

const router = Router();
router.use(requireAuth);

async function genInviteCode(store) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (await store.findGroupByCode(code));
  return code;
}

// Grup oluştur
router.post('/', async (req, res) => {
  const store = getStore();
  const { name, memberCount, unit = 'gram', amount, period = 'monthly', startDate, orderMethod = 'kura' } = req.body;
  if (!name || !memberCount || !amount)
    return res.status(400).json({ error: 'name, memberCount, amount zorunlu' });

  const inviteCode = await genInviteCode(store);
  const group = { id: nanoid(10), name, ownerId: req.user.id, memberCount, unit, amount, period,
    startDate: startDate || new Date().toISOString(), orderMethod, inviteCode,
    status: 'forming', createdAt: new Date().toISOString() };
  await store.createGroup(group);
  await store.addMembership({ id: nanoid(10), groupId: group.id, userId: req.user.id, slotNo: null, role: 'owner' });
  await store.appendAudit('group', 'create', req.user.id, { groupId: group.id, name });
  res.status(201).json({ group, inviteLink: `${config.appBaseUrl}/join/${inviteCode}` });
});

// Kullanıcının grupları
router.get('/', async (req, res) => {
  res.json({ groups: await getStore().listUserGroups(req.user.id) });
});

// Davet kodu ile önizleme
router.get('/by-code/:code', async (req, res) => {
  const store = getStore();
  const group = await store.findGroupByCode(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  const members = (await store.membershipsOfGroup(group.id)).length;
  res.json({ group: { id: group.id, name: group.name, unit: group.unit, amount: group.amount,
    memberCount: group.memberCount, currentMembers: members } });
});

// Gruba katıl
router.post('/join/:code', async (req, res) => {
  const store = getStore();
  const group = await store.findGroupByCode(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  if (group.status !== 'forming') return res.status(400).json({ error: 'Grup katılıma kapalı (kura çekilmiş olabilir)' });

  const members = await store.membershipsOfGroup(group.id);
  if (members.some((m) => m.userId === req.user.id)) return res.status(400).json({ error: 'Zaten üyesiniz' });
  if (members.length >= group.memberCount) return res.status(400).json({ error: 'Grup dolu' });

  const m = { id: nanoid(10), groupId: group.id, userId: req.user.id, slotNo: null, role: 'member' };
  await store.addMembership(m);
  await store.appendAudit('membership', 'join', req.user.id, { groupId: group.id });
  res.status(201).json({ ok: true, membership: m });
});

// Grup detayı
router.get('/:id', async (req, res) => {
  const store = getStore();
  const group = await store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  const rawMembers = await store.membershipsOfGroup(group.id);
  const members = [];
  for (const m of rawMembers) {
    const u = await store.getUser(m.userId);
    members.push({ ...m, user: { id: u.id, name: u.name, phone: u.phone } });
  }
  const rounds = await store.roundsOfGroup(group.id);
  res.json({ group, members, rounds });
});

// Kura çek
router.post('/:id/draw', async (req, res) => {
  const store = getStore();
  const group = await store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  if (group.ownerId !== req.user.id) return res.status(403).json({ error: 'Sadece kurucu kura çekebilir' });

  const members = await store.membershipsOfGroup(group.id);
  if (members.length < 2) return res.status(400).json({ error: 'En az 2 üye gerekli' });

  const nonces = members.map(() => nanoid(16));
  const commits = nonces.map(hashNonce);
  const seed = buildSeed(group.id, nonces);
  const order = drawOrder(members.map((m) => m.userId), seed);

  for (let idx = 0; idx < order.length; idx++) {
    const m = members.find((mm) => mm.userId === order[idx]);
    await store.updateMemberSlot(m.id, idx + 1);
    const due = new Date(group.startDate); due.setMonth(due.getMonth() + idx);
    await store.createRound({ id: nanoid(10), groupId: group.id, roundNo: idx + 1,
      beneficiaryId: order[idx], dueDate: due.toISOString(), status: 'pending' });
  }
  await store.updateGroupStatus(group.id, 'drawn');
  await store.appendAudit('group', 'draw', req.user.id, { groupId: group.id, seed, commits, order });
  res.json({ ok: true, order, seed, commits });
});

export default router;
