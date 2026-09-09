// Basit in-memory veri deposu (MVP demo).
// ÜRETİMDE: PostgreSQL + Row Level Security ile değiştirin.
// Her tablo bir Map; şema plan dokümanındaki veri modelini takip eder.

export const db = {
  users: new Map(),        // id -> User
  groups: new Map(),       // id -> Group
  memberships: new Map(),  // id -> Membership
  rounds: new Map(),       // id -> Round
  payments: new Map(),     // id -> Payment
  goldOrders: new Map(),   // id -> GoldOrder
  auditLog: [],            // append-only hash zinciri
  otps: new Map(),         // phone -> { code, expiresAt }
};

// --- Yardımcı sorgular ---
export const findUserByPhone = (phone) =>
  [...db.users.values()].find((u) => u.phone === phone);

export const findGroupByCode = (code) =>
  [...db.groups.values()].find((g) => g.inviteCode === code);

export const membershipsOfGroup = (groupId) =>
  [...db.memberships.values()].filter((m) => m.groupId === groupId);

export const membershipsOfUser = (userId) =>
  [...db.memberships.values()].filter((m) => m.userId === userId);

export const roundsOfGroup = (groupId) =>
  [...db.rounds.values()]
    .filter((r) => r.groupId === groupId)
    .sort((a, b) => a.roundNo - b.roundNo);

export const paymentsOfRound = (roundId) =>
  [...db.payments.values()].filter((p) => p.roundId === roundId);
