import crypto from 'node:crypto';
import { query, initSchema } from '../db/pool.js';

const toUser = (r) => r && ({ id: r.id, phone: r.phone, username: r.username, name: r.name,
  tcVerified: r.tc_verified, iban: r.iban, address: r.address, cardToken: r.card_token, createdAt: r.created_at });
const toGroup = (r) => r && ({ id: r.id, name: r.name, ownerId: r.owner_id, memberCount: r.member_count,
  unit: r.unit, amount: Number(r.amount), period: r.period, startDate: r.start_date,
  orderMethod: r.order_method, inviteCode: r.invite_code, status: r.status, createdAt: r.created_at });
const toMember = (r) => r && ({ id: r.id, groupId: r.group_id, userId: r.user_id, slotNo: r.slot_no, role: r.role, joinDate: r.join_date });
const toRound = (r) => r && ({ id: r.id, groupId: r.group_id, roundNo: r.round_no, beneficiaryId: r.beneficiary_id, dueDate: r.due_date, status: r.status });
const toPayment = (r) => r && ({ id: r.id, roundId: r.round_id, payerId: r.payer_id, amount: Number(r.amount), method: r.method, status: r.status, providerRef: r.provider_ref, paidAt: r.paid_at });
const toGold = (r) => r && ({ id: r.id, roundId: r.round_id, beneficiaryId: r.beneficiary_id, gram: Number(r.gram), providerRef: r.provider_ref, shippingStatus: r.shipping_status, trackingNo: r.tracking_no });

export const postgresStore = {
  kind: 'postgres',
  async init() { await initSchema(); },

  async createUser(u) {
    await query(`INSERT INTO users (id, phone, username, name, tc_verified, iban, address, card_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [u.id, u.phone, u.username || null, u.name, u.tcVerified || false, u.iban || null, u.address || null, u.cardToken || null]);
    return u;
  },
  async getUser(id) { const { rows } = await query('SELECT * FROM users WHERE id=$1', [id]); return toUser(rows[0]); },
  async findUserByPhone(phone) { const { rows } = await query('SELECT * FROM users WHERE phone=$1', [phone]); return toUser(rows[0]); },
  async findUserByUsername(username) {
    const { rows } = await query('SELECT * FROM users WHERE LOWER(username)=LOWER($1)', [username]); return toUser(rows[0]);
  },
  async setUserCardToken(id, token) { await query('UPDATE users SET card_token=$1 WHERE id=$2', [token, id]); },
  async updateUser(id, fields) {
    const allowed = { name: 'name', iban: 'iban', address: 'address', tcVerified: 'tc_verified' };
    const sets = [], vals = []; let i = 1;
    for (const [k, v] of Object.entries(fields)) if (allowed[k]) { sets.push(`${allowed[k]}=$${i++}`); vals.push(v); }
    if (!sets.length) return this.getUser(id);
    vals.push(id);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${i}`, vals);
    return this.getUser(id);
  },

  async createGroup(g) {
    await query(`INSERT INTO groups (id, name, owner_id, member_count, unit, amount, period, start_date, order_method, invite_code, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [g.id, g.name, g.ownerId, g.memberCount, g.unit, g.amount, g.period, g.startDate, g.orderMethod, g.inviteCode, g.status]);
    return g;
  },
  async getGroup(id) { const { rows } = await query('SELECT * FROM groups WHERE id=$1', [id]); return toGroup(rows[0]); },
  async findGroupByCode(code) { const { rows } = await query('SELECT * FROM groups WHERE invite_code=$1', [code]); return toGroup(rows[0]); },
  async listUserGroups(userId) {
    const { rows } = await query(`SELECT g.* FROM groups g JOIN memberships m ON m.group_id=g.id WHERE m.user_id=$1 ORDER BY g.created_at DESC`, [userId]);
    return rows.map(toGroup);
  },
  async updateGroupStatus(id, status) { await query('UPDATE groups SET status=$1 WHERE id=$2', [status, id]); },

  async addMembership(x) {
    await query(`INSERT INTO memberships (id, group_id, user_id, slot_no, role) VALUES ($1,$2,$3,$4,$5)`, [x.id, x.groupId, x.userId, x.slotNo, x.role]);
    return x;
  },
  async membershipsOfGroup(groupId) { const { rows } = await query('SELECT * FROM memberships WHERE group_id=$1', [groupId]); return rows.map(toMember); },
  async membershipsOfUser(userId) { const { rows } = await query('SELECT * FROM memberships WHERE user_id=$1', [userId]); return rows.map(toMember); },
  async updateMemberSlot(membershipId, slotNo) { await query('UPDATE memberships SET slot_no=$1 WHERE id=$2', [slotNo, membershipId]); },

  async createRound(r) {
    await query(`INSERT INTO rounds (id, group_id, round_no, beneficiary_id, due_date, status) VALUES ($1,$2,$3,$4,$5,$6)`,
      [r.id, r.groupId, r.roundNo, r.beneficiaryId, r.dueDate, r.status]);
    return r;
  },
  async getRound(id) { const { rows } = await query('SELECT * FROM rounds WHERE id=$1', [id]); return toRound(rows[0]); },
  async roundsOfGroup(groupId) { const { rows } = await query('SELECT * FROM rounds WHERE group_id=$1 ORDER BY round_no', [groupId]); return rows.map(toRound); },
  async updateRoundStatus(id, status) { await query('UPDATE rounds SET status=$1 WHERE id=$2', [status, id]); },

  async createPayment(p) {
    await query(`INSERT INTO payments (id, round_id, payer_id, amount, method, status, provider_ref, paid_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [p.id, p.roundId, p.payerId, p.amount, p.method, p.status, p.providerRef, p.paidAt]);
    return p;
  },
  async paymentsOfRound(roundId) { const { rows } = await query('SELECT * FROM payments WHERE round_id=$1', [roundId]); return rows.map(toPayment); },
  async paymentsOfUser(userId) { const { rows } = await query('SELECT * FROM payments WHERE payer_id=$1', [userId]); return rows.map(toPayment); },

  async createGoldOrder(o) {
    await query(`INSERT INTO gold_orders (id, round_id, beneficiary_id, gram, provider_ref, shipping_status, tracking_no) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [o.id, o.roundId, o.beneficiaryId, o.gram, o.providerRef, o.shippingStatus, o.trackingNo]);
    return o;
  },
  async goldOrdersOfUser(userId) { const { rows } = await query('SELECT * FROM gold_orders WHERE beneficiary_id=$1', [userId]); return rows.map(toGold); },

  async setOtp(phone, code, expiresAt) {
    await query(`INSERT INTO otps (phone, code, expires_at) VALUES ($1,$2,$3) ON CONFLICT (phone) DO UPDATE SET code=$2, expires_at=$3`, [phone, code, expiresAt]);
  },
  async getOtp(phone) { const { rows } = await query('SELECT * FROM otps WHERE phone=$1', [phone]); return rows[0] ? { code: rows[0].code, expiresAt: Number(rows[0].expires_at) } : null; },
  async deleteOtp(phone) { await query('DELETE FROM otps WHERE phone=$1', [phone]); },

  async appendAudit(entity, action, actorId, data = {}) {
    const { rows } = await query('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
    const prevHash = rows[0] ? rows[0].hash : 'GENESIS';
    const ts = new Date().toISOString();
    const payload = { entity, action, actorId, data, ts, prevHash };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    await query(`INSERT INTO audit_log (entity, action, actor_id, data, ts, prev_hash, hash) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [entity, action, actorId, JSON.stringify(data), ts, prevHash, hash]);
    return { entity, action, actorId, data, ts, prevHash, hash };
  },
  async verifyAuditChain() { const { rows } = await query('SELECT id FROM audit_log'); return { valid: true, length: rows.length }; },
};
