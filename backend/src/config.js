// Ortam yapılandırması. Üretimde .env / secret manager kullanın.
export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-degistirin',
  jwtExpiresIn: '30d',

  // Uygulamanın herkese açık kök URL'i (deep link üretimi için)
  appBaseUrl: process.env.APP_BASE_URL || 'https://altingunu.app',

  // --- LİSANSLI PARTNER ANAHTARLARI (Model B) ---
  // Ödeme Kuruluşu (ör. iyzico / PayTR / Param / Sipay)
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock', // mock | iyzico | paytr ...
    apiKey: process.env.PAYMENT_API_KEY || 'test-key',
    secret: process.env.PAYMENT_SECRET || 'test-secret',
    // Chargeback/webhook doğrulama için imza gizli anahtarı
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'test-webhook',
  },

  // Lisanslı dijital altın platformu (ör. Minted / ARDGold / Nadir Metal)
  gold: {
    provider: process.env.GOLD_PROVIDER || 'mock',
    apiKey: process.env.GOLD_API_KEY || 'test-key',
    // Fiziki teslimat için sigortalı kargo entegrasyonu partnerde
  },
};
