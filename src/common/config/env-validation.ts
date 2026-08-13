const PLACEHOLDER_SECRETS = new Set([
  'change-me-in-production',
  'change-me-too',
  'secret',
  'changeme',
]);

/**
 * Fails fast at boot rather than letting a fintech API run with a weak or
 * placeholder JWT secret in production — silently accepting one would let an
 * attacker forge access tokens for any user/kycTier.
 */
export function validateEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const isProduction = env.NODE_ENV === 'production';

  const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of requiredSecrets) {
    const value = env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    if (isProduction && (PLACEHOLDER_SECRETS.has(value.toLowerCase()) || value.length < 32)) {
      throw new Error(
        `${key} is missing, a known placeholder, or too short (<32 chars) for production. ` +
          'Generate a strong random secret (e.g. `openssl rand -hex 32`) and inject it via your secrets manager.',
      );
    }
  }

  if (isProduction && !env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set explicitly in production (no wildcard fallback).');
  }

  return env;
}
