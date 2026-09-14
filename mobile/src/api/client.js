import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://altin-gunu-backend.onrender.com/api';

let token = null;
export async function loadToken() { token = await AsyncStorage.getItem('token'); return token; }
export async function setToken(t) {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

export const api = {
  // Kayıt
  registerRequest: (name, username, phone) => request('/auth/register-request', { method: 'POST', body: { name, username, phone } }),
  registerVerify: (name, username, phone, code) => request('/auth/register-verify', { method: 'POST', body: { name, username, phone, code } }),
  // Giriş
  loginRequest: (username, phone) => request('/auth/login-request', { method: 'POST', body: { username, phone } }),
  loginVerify: (phone, code) => request('/auth/login-verify', { method: 'POST', body: { phone, code } }),

  // Gruplar
  listGroups: () => request('/groups'),
  createGroup: (data) => request('/groups', { method: 'POST', body: data }),
  getGroup: (id) => request(`/groups/${id}`),
  previewByCode: (code) => request(`/groups/by-code/${code}`),
  joinByCode: (code) => request(`/groups/join/${code}`, { method: 'POST' }),
  drawOrder: (id) => request(`/groups/${id}/draw`, { method: 'POST' }),

  // Ödeme & Altın
  addCard: () => request('/payments/cards', { method: 'POST' }),
  payRound: (roundId) => request(`/payments/rounds/${roundId}/pay`, { method: 'POST' }),

  // Kullanıcı & Bakiye & Altın kuru
  me: () => request('/users/me'),
  updateProfile: (data) => request('/users/me', { method: 'PATCH', body: data }),
  summary: () => request('/users/me/summary'),
  goldPrice: () => request('/gold/price'),
};
