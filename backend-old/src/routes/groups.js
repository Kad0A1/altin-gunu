import { Router } from 'express';
import { nanoid } from 'nanoid';
import {
  db, findGroupByCode, membershipsOfGroup,
  membershipsOfUser, roundsOfGroup,
} from '../store/db.js';
import { requireAuth } from '../middleware/auth.js';
import { appendAudit } from '../services/audit.js';
import { config } from '../config.js';
import { buildSeed, drawOrder, hashNonce } from '../services/kura.js';

const router = Router();
router.use(requireAuth);

// Kısa, okunabilir davet kodu üret (ör. "GX7K2Q")
function genInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (findGroupByCode(code));
  return code;
}

// ── Grup oluştur ────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, memberCount, unit = 'gram', amount, period = 'monthly',
          startDate, orderMethod = 'kura' } = req.body;
  if (!name || !memberCount || !amount)
    return res.status(400).json({ error: 'name, memberCount, amount zorunlu' });

  const inviteCode = genInviteCode();
  const group = {
    id: nanoid(10),
    name, ownerId: req.user.id,
    memberCount, unit, amount, period,
    startDate: startDate || new Date().toISOString(),
    orderMethod, inviteCode,
    status: 'forming', // forming -> drawn -> active -> completed
    createdAt: new Date().toISOString(),
  };
  db.groups.set(group.id, group);

  // Kurucu ilk üye olur
  const m = { id: nanoid(10), groupId: group.id, userId: req.user.id,
              slotNo: null, role: 'owner', joinDate: new Date().toISOString() };
  db.memberships.set(m.id, m);

  appendAudit('group', 'create', req.user.id, { groupId: group.id, name });
  res.status(201).json({ group, inviteLink: `${config.appBaseUrl}/join/${inviteCode}` });
});

// ── Kullanıcının grupları ───────────────────────────────────────
router.get('/', (req, res) => {
  const groups = membershipsOfUser(req.user.id)
    .map((m) => db.groups.get(m.groupId))
    .filter(Boolean);
  res.json({ groups });
});

// ── Davet kodu ile grup önizleme (katılım öncesi) ───────────────
router.get('/by-code/:code', (req, res) => {
  const group = findGroupByCode(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  const members = membershipsOfGroup(group.id).length;
  res.json({ group: { id: group.id, name: group.name, unit: group.unit,
    amount: group.amount, memberCount: group.memberCount, currentMembers: members } });
});

// ── Gruba katıl ─────────────────────────────────────────────────
router.post('/join/:code', (req, res) => {
  const group = findGroupByCode(req.params.code.toUpperCase());
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  if (group.status !== 'forming')
    return res.status(400).json({ error: 'Grup katılıma kapalı' });

  const members = membershipsOfGroup(group.id);
  if (members.some((m) => m.userId === req.user.id))
    return res.status(400).json({ error: 'Zaten üyesiniz' });
  if (members.length >= group.memberCount)
    return res.status(400).json({ error: 'Grup dolu' });

  const m = { id: nanoid(10), groupId: group.id, userId: req.user.id,
              slotNo: null, role: 'member', joinDate: new Date().toISOString() };
  db.memberships.set(m.id, m);
  appendAudit('membership', 'join', req.user.id, { groupId: group.id });
  res.status(201).json({ ok: true, membership: m });
});

// ── Grup detayı (üyeler + turlar) ───────────────────────────────
router.get('/:id', (req, res) => {
  const group = db.groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  const members = membershipsOfGroup(group.id).map((m) => ({
    ...m, user: (({ id, name, phone }) => ({ id, name, phone }))(db.users.get(m.userId)),
  }));
  res.json({ group, members, rounds: roundsOfGroup(group.id) });
});

// ── Kura çek → sıra belirle → turları oluştur ───────────────────
// Basitleştirilmiş: nonce'ları sunucu üretir. Tam commit-reveal için
// üyeler kendi nonce'larını gönderir; burada MVP demo yapıyoruz.
router.post('/:id/draw', (req, res) => {
  const group = db.groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
  if (group.ownerId !== req.user.id)
    return res.status(403).json({ error: 'Sadece kurucu kura çekebilir' });

  const members = membershipsOfGroup(group.id);
  if (members.length < 2)
    return res.status(400).json({ error: 'En az 2 üye gerekli' });

  // Her üyeye ait nonce + commit (kanıtlanabilir adalet)
  const nonces = members.map(() => nanoid(16));
  const commits = nonces.map(hashNonce);
  const seed = buildSeed(group.id, nonces);
  const order = drawOrder(members.map((m) => m.userId), seed);

  // Slotları ata
  order.forEach((userId, idx) => {
    const m = members.find((mm) => mm.userId === userId);
    m.slotNo = idx + 1;
  });

  // Turları oluştur (her tur = bir üyenin altını alacağı periyot)
  const start = new Date(group.startDate);
  order.forEach((userId, idx) => {
    const due = new Date(start);
    due.setMonth(due.getMonth() + idx);
    const round = {
      id: nanoid(10), groupId: group.id, roundNo: idx + 1,
      beneficiaryId: userId, dueDate: due.toISOString(), status: 'pending',
    };
    db.rounds.set(round.id, round);
  });

  group.status = 'drawn';
  appendAudit('group', 'draw', req.user.id, { groupId: group.id, seed, commits, order });

  res.json({ ok: true, order, seed, commits,
    note: 'Seed ve commit değerleri defterde saklandı; sonuç bağımsız doğrulanabilir.' });
});

export default router;
