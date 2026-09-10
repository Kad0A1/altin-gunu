export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-degistirin',
  jwtExpiresIn: '30d',
  appBaseUrl: process.env.APP_BASE_URL || 'https://altingunu.app',
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock',
    apiKey: process.env.PAYMENT_API_KEY || 'test-key',
    secret: process.env.PAYMENT_SECRET || 'test-secret',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'test-webhook',
  },
  gold: {
    provider: process.env.GOLD_PROVIDER || 'mock',
    apiKey: process.env.GOLD_API_KEY || 'test-key',
  },
};
