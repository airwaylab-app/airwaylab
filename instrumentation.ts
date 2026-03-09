export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    // Validate environment variables at startup to surface misconfigurations early
    const { validateServerEnv } = await import('./lib/env');
    validateServerEnv();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
