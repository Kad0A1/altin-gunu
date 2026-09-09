import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend adresi — cihazdan erişilebilir IP olmalı (emülatörde 10.0.2.2 vb.)
const BASE_URL = 'http://localhost:4000/api';

let token = null;
export async function loadToken() {
  token = await AsyncStorage.getItem('token');
  return token;
}
export async function setToken(t) {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

export const api = {
  // Auth
  requestOtp: (phone) => request('/auth/request-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code, name) =>
    request('/auth/verify-otp', { method: 'POST', body: { phone, code, name } }),

  // Groups
  listGroups: () => request('/groups'),
  createGroup: (data) => request('/groups', { method: 'POST', body: data }),
  getGroup: (id) => request(`/groups/${id}`),
  previewByCode: (code) => request(`/groups/by-code/${code}`),
  joinByCode: (code) => request(`/groups/join/${code}`, { method: 'POST' }),
  drawOrder: (id) => request(`/groups/${id}/draw`, { method: 'POST' }),

  // Payments & Gold
  addCard: () => request('/payments/cards', { method: 'POST' }),
  payRound: (roundId) => request(`/payments/rounds/${roundId}/pay`, { method: 'POST' }),
};
