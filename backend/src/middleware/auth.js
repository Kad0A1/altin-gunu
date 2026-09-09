import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getStore } from '../store/index.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token gerekli' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await getStore().getUser(payload.sub);
    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
