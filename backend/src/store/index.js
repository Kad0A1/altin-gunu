import { memoryStore } from './memory.js';

// DATABASE_URL varsa PostgreSQL, yoksa in-memory kullanılır.
let store = memoryStore;

export async function initStore() {
  if (process.env.DATABASE_URL) {
    // Postgres modülünü sadece gerektiğinde yükle (local'de pg kurulu olmasa da çalışsın)
    const { postgresStore } = await import('./postgres.js');
    store = postgresStore;
    console.log('🗄️  Veri deposu: PostgreSQL (kalıcı)');
  } else {
    console.log('🗄️  Veri deposu: in-memory (kalıcı DEĞİL — DATABASE_URL tanımlı değil)');
  }
  await store.init();
  return store;
}

export function getStore() { return store; }
