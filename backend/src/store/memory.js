import crypto from 'node:crypto';

// In-memory backend (DATABASE_URL yoksa kullanılır).
// Yerel geliştirme için pratik; veri kalıcı DEĞİLDİR.
const m = {
  users: new Map(), groups: new Map(), memberships: new Map(),
  rounds: new Map(), payments: new Map(), goldOrders: new Map(),
  auditLog: [], otps: new Map(),
};

export const memoryStore = {
  kind: 'memory',
  async init() { /* no-op */ },

  // Users
  async createUser(u) { m.users.set(u.id, u); return u; },
  async getUser(id) { return m.users.get(id) || null; },
  async findUserByPhone(phone) { return [...m.users.values()].find((u) => u.phone === phone) || null; },
  async setUserCardToken(id, token) { const u = m.users.get(id); if (u) u.cardToken = token; },

  // Groups
  async createGroup(g) { m.groups.set(g.id, g); return g; },
  async getGroup(id) { return m.groups.get(id) || null; },
  async findGroupByCode(code) { return [...m.groups.values()].find((g) => g.inviteCode === code) || null; },
  async listUserGroups(userId) {
    const ids = [...m.memberships.values()].filter((x) => x.userId === userId).map((x) => x.groupId);
    return ids.map((id) => m.groups.get(id)).filter(Boolean);
  },
  async updateGroupStatus(id, status) { const g = m.groups.get(id); if (g) g.status = status; },

  // Memberships
  async addMembership(x) { m.memberships.set(x.id, x); return x; },
  async membershipsOfGroup(groupId) { return [...m.memberships.values()].filter((x) => x.groupId === groupId); },
  async updateMemberSlot(membershipId, slotNo) { const x = m.memberships.get(membershipId); if (x) x.slotNo = slotNo; },

  // Rounds
  async createRound(r) { m.rounds.set(r.id, r); return r; },
  async getRound(id) { return m.rounds.get(id) || null; },
  async roundsOfGroup(groupId) {
    return [...m.rounds.values()].filter((r) => r.groupId === groupId).sort((a, b) => a.roundNo - b.roundNo);
  },
  async updateRoundStatus(id, status) { const r = m.rounds.get(id); if (r) r.status = status; },

  // Payments
  async createPayment(p) { m.payments.set(p.id, p); return p; },
  async paymentsOfRound(roundId) { return [...m.payments.values()].filter((p) => p.roundId === roundId); },

  // Gold
  async createGoldOrder(o) { m.goldOrders.set(o.id, o); return o; },

  // OTP
  async setOtp(phone, code, expiresAt) { m.otps.set(phone, { code, expiresAt }); },
  async getOtp(phone) { return m.otps.get(phone) || null; },
  async deleteOtp(phone) { m.otps.delete(phone); },

  // Audit (hash zinciri)
  async appendAudit(entity, action, actorId, data = {}) {
    const prev = m.auditLog[m.auditLog.length - 1];
    const prevHash = prev ? prev.hash : 'GENESIS';
    const payload = { entity, action, actorId, data, ts: new Date().toISOString(), prevHash };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const rec = { id: m.auditLog.length + 1, ...payload, hash };
    m.auditLog.push(rec);
    return rec;
  },
  async verifyAuditChain() {
    let prevHash = 'GENESIS';
    for (const rec of m.auditLog) {
      const { hash, id, ...payload } = rec;
      const recalculated = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      if (payload.prevHash !== prevHash || recalculated !== hash) return { valid: false, brokenAt: id };
      prevHash = hash;
    }
    return { valid: true, length: m.auditLog.length };
  },
};
