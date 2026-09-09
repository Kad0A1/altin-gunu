import crypto from 'node:crypto';

// ── Kanıtlanabilir Adil Kura (Provably-Fair) ────────────────────────────
// Amaç: Kimse (biz dahil) sonucu önceden manipüle edemesin ve sonuç
// sonradan herkes tarafından doğrulanabilsin.
//
// Yöntem: Commit-Reveal + Fisher-Yates.
// 1) Her üye gizli bir "nonce" gönderir, biz hash'ini (commit) saklarız.
// 2) Herkes commit ettikten sonra nonce'lar açıklanır (reveal).
// 3) Tüm nonce'lar + grup id birleşip deterministik seed üretir.
// 4) Seed ile Fisher-Yates karıştırma yapılır → sıra belirlenir.
// 5) Seed ve sonuç defterde saklanır; herkes doğrulayabilir.

export function hashNonce(nonce) {
  return crypto.createHash('sha256').update(String(nonce)).digest('hex');
}

// Seed'i tüm açıklanmış nonce'lardan üretir
export function buildSeed(groupId, revealedNonces) {
  const material = groupId + '|' + [...revealedNonces].sort().join('|');
  return crypto.createHash('sha256').update(material).digest('hex');
}

// Seed'den deterministik sözde-rastgele üretici (mulberry32)
function seededRng(seedHex) {
  let a = parseInt(seedHex.slice(0, 8), 16);
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates ile üye listesini karıştırır → sıra (slot) atar
export function drawOrder(memberIds, seedHex) {
  const rng = seededRng(seedHex);
  const arr = [...memberIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr; // index 0 = ilk sıradaki üye
}

// Bağımsız doğrulama: aynı girdi aynı sonucu vermeli
export function verifyDraw(groupId, revealedNonces, memberIds, expectedOrder) {
  const seed = buildSeed(groupId, revealedNonces);
  const order = drawOrder(memberIds, seed);
  return JSON.stringify(order) === JSON.stringify(expectedOrder);
}
