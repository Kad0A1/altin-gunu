CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  phone        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  tc_verified  BOOLEAN DEFAULT FALSE,
  iban         TEXT,
  address      TEXT,
  card_token   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT REFERENCES users(id),
  member_count INT NOT NULL, unit TEXT NOT NULL, amount NUMERIC NOT NULL,
  period TEXT DEFAULT 'monthly', start_date TIMESTAMPTZ DEFAULT NOW(),
  order_method TEXT DEFAULT 'kura', invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'forming', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY, group_id TEXT REFERENCES groups(id), user_id TEXT REFERENCES users(id),
  slot_no INT, role TEXT DEFAULT 'member', join_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY, group_id TEXT REFERENCES groups(id), round_no INT NOT NULL,
  beneficiary_id TEXT REFERENCES users(id), due_date TIMESTAMPTZ, status TEXT DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, round_id TEXT REFERENCES rounds(id), payer_id TEXT REFERENCES users(id),
  amount NUMERIC NOT NULL, method TEXT DEFAULT 'card', status TEXT NOT NULL,
  provider_ref TEXT, receipt_url TEXT, paid_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS gold_orders (
  id TEXT PRIMARY KEY, round_id TEXT REFERENCES rounds(id), beneficiary_id TEXT REFERENCES users(id),
  gram NUMERIC, provider_ref TEXT, shipping_status TEXT, tracking_no TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, entity TEXT, action TEXT, actor_id TEXT, data JSONB,
  ts TIMESTAMPTZ DEFAULT NOW(), prev_hash TEXT, hash TEXT
);
CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memberships_group ON memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user  ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_group      ON rounds(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_round    ON payments(round_id);
