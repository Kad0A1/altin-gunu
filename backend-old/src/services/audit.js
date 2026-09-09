import crypto from 'node:crypto';
import { db } from '../store/db.js';

// Değiştirilemez (append-only) denetim defteri — hash zinciri.
// Her kayıt bir öncekinin hash'ini içerir; sonradan oynanamaz.
export function appendAudit(entity, action, actorId, data = {}) {
  const prev = db.auditLog[db.auditLog.length - 1];
  const prevHash = prev ? prev.hash : 'GENESIS';
  const payload = {
    entity,
    action,
    actorId,
    data,
    ts: new Date().toISOString(),
    prevHash,
  };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  const record = { id: db.auditLog.length + 1, ...payload, hash };
  db.auditLog.push(record);
  return record;
}

// Zincirin bütünlüğünü doğrular
export function verifyAuditChain() {
  let prevHash = 'GENESIS';
  for (const rec of db.auditLog) {
    const { hash, id, ...payload } = rec;
    if (payload.prevHash !== prevHash) return { valid: false, brokenAt: id };
    const recalculated = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    if (recalculated !== hash) return { valid: false, brokenAt: id };
    prevHash = hash;
  }
  return { valid: true, length: db.auditLog.length };
}
