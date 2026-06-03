import { COLORS } from '@/lib/discord-webhook';

export interface IntegrityCheckResult {
  subscriptions_orphans: number;
  user_nights_orphans: number;
  email_sequences_orphans: number;
  profiles_stripe_no_sub: number;
  profiles_paid_no_active_sub: number;
}

// These must be zero — any non-zero count signals a real data integrity problem.
export const CRITICAL_KEYS: (keyof IntegrityCheckResult)[] = [
  'subscriptions_orphans',
  'user_nights_orphans',
  'email_sequences_orphans',
  'profiles_paid_no_active_sub',
];

const LABEL: Record<keyof IntegrityCheckResult, string> = {
  subscriptions_orphans: 'Subscription orphans (1.1)',
  user_nights_orphans: 'User nights orphans (1.2)',
  email_sequences_orphans: 'Email seq orphans (1.4)',
  profiles_stripe_no_sub: 'Stripe ID, no sub row (1.12a)',
  profiles_paid_no_active_sub: 'Paid tier, no active sub (1.12b)',
};

const ALL_KEYS: (keyof IntegrityCheckResult)[] = [
  'subscriptions_orphans',
  'user_nights_orphans',
  'email_sequences_orphans',
  'profiles_paid_no_active_sub',
  'profiles_stripe_no_sub',
];

/** Build the Discord embed for db-integrity-check results. */
export function buildIntegrityEmbed(result: IntegrityCheckResult) {
  const hasCritical = CRITICAL_KEYS.some((k) => result[k] > 0);

  const color = hasCritical ? COLORS.red : COLORS.green;

  const title = hasCritical
    ? ':rotating_light: DB Integrity — Orphans Detected'
    : ':white_check_mark: DB Integrity — All Clean';

  const fields = ALL_KEYS.map((k) => ({
    name: LABEL[k],
    value: String(result[k]),
    inline: true,
  }));

  return {
    title,
    color,
    fields,
    footer: { text: 'db-integrity-check cron' },
    timestamp: new Date().toISOString(),
  };
}
