import crypto from 'node:crypto';

// Kanıtlanabilir adil kura: commit-reveal + Fisher-Yates.
export function hashNonce(nonce) {
  return crypto.createHash('sha256').update(String(nonce)).digest('hex');
}
export function buildSeed(groupId, revealedNonces) {
  const material = groupId + '|' + [...revealedNonces].sort().join('|');
  return crypto.createHash('sha256').update(material).digest('hex');
}
function seededRng(seedHex) {
  let a = parseInt(seedHex.slice(0, 8), 16);
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function drawOrder(memberIds, seedHex) {
  const rng = seededRng(seedHex);
  const arr = [...memberIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
export function verifyDraw(groupId, revealedNonces, memberIds, expectedOrder) {
  const order = drawOrder(memberIds, buildSeed(groupId, revealedNonces));
  return JSON.stringify(order) === JSON.stringify(expectedOrder);
}
