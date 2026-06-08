import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';
import Stripe from 'stripe';

// This endpoint derives all input from the authenticated session.
// No request body is accepted; unexpected fields are rejected.
const BodySchema = z.object({}).strict();

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 3 });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null;
  if (!_stripe) _stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
  return _stripe;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const rawBody = await request.json().catch(() => null);
    if (rawBody !== null) {
      const parsed = BodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'This endpoint does not accept a request body.' }, { status: 400 });
      }
    }

    const supabase = await getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // 0. Cancel any live Stripe subscription BEFORE deleting local/auth data.
    //    STRIPE IS THE SOURCE OF TRUTH (local `subscriptions` rows can drift — the
    //    drift cron exists precisely because Stripe subs can lack a local row).
    //    FAIL-SAFE: if the user has a billing identity (stripe_customer_id) and we
    //    cannot verify/cancel via Stripe, ABORT the whole deletion — never strand a
    //    deleted account with a live subscription that keeps billing the customer.
    const { data: profileRow, error: profileLookupError } = await serviceRole
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (profileLookupError) {
      Sentry.captureException(profileLookupError, {
        tags: { route: 'delete-user-data', action: 'profile-lookup' },
        extra: { userId: user.id },
      });
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
    const stripeCustomerId = (profileRow as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (stripeCustomerId) {
      const stripe = getStripe();
      if (!stripe) {
        // Billing identity exists but Stripe is unavailable (config regression).
        // Abort rather than orphan a paying customer.
        Sentry.captureMessage('account-deletion aborted: Stripe not configured but user has a stripe_customer_id', {
          level: 'error',
          fingerprint: ['delete-stripe-unconfigured'],
          tags: { route: 'delete-user-data', action: 'cancel-subscription' },
          extra: { userId: user.id },
        });
        return NextResponse.json({ error: 'Account deletion is temporarily unavailable. Please try again later.' }, { status: 503 });
      }
      // Authoritative: list the customer's subscriptions from Stripe.
      let subs: Stripe.Subscription[];
      try {
        const list = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all', limit: 100 });
        if (list.has_more) {
          // >100 subscriptions cannot be enumerated in one page — fail closed
          // rather than risk leaving a live one billing. (Not realistic for a real
          // customer; surfaces for manual handling if it ever happens.)
          Sentry.captureMessage('account-deletion aborted: customer has >100 subscriptions', {
            level: 'error',
            fingerprint: ['delete-too-many-subs'],
            tags: { route: 'delete-user-data', action: 'cancel-subscription' },
            extra: { userId: user.id, stripeCustomerId },
          });
          return NextResponse.json(
            { error: 'Could not delete your account automatically — please contact support.' },
            { status: 502 }
          );
        }
        subs = list.data;
      } catch (err) {
        Sentry.captureException(err, {
          level: 'error',
          fingerprint: ['delete-stripe-list-failed'],
          tags: { route: 'delete-user-data', action: 'cancel-subscription' },
          extra: { userId: user.id, stripeCustomerId },
        });
        return NextResponse.json(
          { error: 'Could not verify your subscription. Your account was NOT deleted — please retry.' },
          { status: 502 }
        );
      }
      const cancellable = subs.filter((s) => s.status !== 'canceled' && s.status !== 'incomplete_expired');
      let cancelledCount = 0;
      for (const sub of cancellable) {
        // Attribute this cancellation to account deletion BEFORE cancelling, so the
        // resulting customer.subscription.deleted webhook labels the #revenue alert
        // as account_deletion (not a user portal cancel). Spread keeps existing
        // metadata (e.g. supabase_user_id) intact. Best-effort — never block deletion.
        try {
          await stripe.subscriptions.update(sub.id, {
            metadata: { ...sub.metadata, canceled_via: 'account_deletion' },
          });
        } catch (metaErr) {
          Sentry.captureException(metaErr, {
            level: 'warning',
            fingerprint: ['delete-cancel-metadata-failed'],
            tags: { route: 'delete-user-data', action: 'cancel-subscription' },
            extra: { userId: user.id, subscriptionId: sub.id },
          });
        }
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (err) {
          // Only a confirmed-missing resource is idempotent success; anything else
          // aborts. Subs cancelled earlier in this loop already recorded their churn
          // below, so an abort here never loses an earlier cancellation.
          if ((err as { code?: string })?.code !== 'resource_missing') {
            Sentry.captureException(err, {
              level: 'error',
              fingerprint: ['delete-cancel-subscription-failed'],
              tags: { route: 'delete-user-data', action: 'cancel-subscription' },
              extra: { userId: user.id, stripeCustomerId, failedSubscriptionId: sub.id, cancelledSoFar: cancelledCount },
            });
            return NextResponse.json(
              { error: 'Could not cancel your subscription. Your account was NOT deleted — please retry or contact support.' },
              { status: 502 }
            );
          }
          // resource_missing — already gone; still record churn (idempotent) below.
        }
        // Record churn for THIS sub immediately + idempotently. The
        // customer.subscription.deleted webhook cannot record it (by the time it
        // processes, the user is deleted → its insert hits the FK and is swallowed),
        // and recording per-sub means a later abort never loses an earlier one.
        const { error: auditError } = await serviceRole.from('subscription_events').upsert(
          {
            user_id: user.id,
            event_type: 'cancelled',
            tier: 'community',
            mrr_cents: 0,
            stripe_subscription_id: sub.id,
            stripe_event_id: `account_deletion:${user.id}:${sub.id}`,
            source: 'account_deletion',
          },
          { onConflict: 'stripe_event_id', ignoreDuplicates: true }
        );
        if (auditError) {
          // The subscription IS cancelled (billing stopped) — do not fail the whole
          // deletion over an analytics write. Alert loudly for manual backfill.
          Sentry.captureException(auditError, {
            level: 'error',
            fingerprint: ['delete-churn-audit-failed'],
            tags: { route: 'delete-user-data', action: 'audit-cancellation' },
            extra: { userId: user.id, subscriptionId: sub.id },
          });
        }
        cancelledCount++;
      }
      if (cancelledCount > 0) {
        Sentry.captureMessage('account-deletion: stripe subscription(s) cancelled', {
          level: 'info',
          fingerprint: ['account-deletion-sub-cancelled'],
          tags: { route: 'delete-user-data', action: 'account-deletion' },
          extra: { userId: user.id, count: cancelledCount },
        });
      }
    }

    // 1. Delete files from Supabase Storage (handles nested directories)
    try {
      // List top-level entries (date folders + analysis folder)
      const { data: topLevel } = await serviceRole.storage
        .from(STORAGE_BUCKET)
        .list(user.id);

      if (topLevel && topLevel.length > 0) {
        const allPaths: string[] = [];
        for (const entry of topLevel) {
          // Entry could be a folder or file — list contents of each folder
          const { data: subFiles } = await serviceRole.storage
            .from(STORAGE_BUCKET)
            .list(`${user.id}/${entry.name}`);

          if (subFiles && subFiles.length > 0) {
            for (const file of subFiles) {
              allPaths.push(`${user.id}/${entry.name}/${file.name}`);
            }
          } else if (entry.id) {
            // It's a file at top level
            allPaths.push(`${user.id}/${entry.name}`);
          }
        }

        if (allPaths.length > 0) {
          // Remove in batches of 100
          for (let i = 0; i < allPaths.length; i += 100) {
            const batch = allPaths.slice(i, i + 100);
            const { error: removeError } = await serviceRole.storage
              .from(STORAGE_BUCKET)
              .remove(batch);

            if (removeError) {
              Sentry.captureException(removeError, {
                extra: { userId: user.id, step: 'storage_delete', batch: i },
              });
            }
          }
        }
      }
    } catch (error) {
      Sentry.captureException(error, {
        extra: { userId: user.id, step: 'storage_delete' },
      });
    }

    // 2. Delete user health data from DB (service role to bypass RLS)
    //
    // Excluded by design:
    //   - data_contributions, waveform_contributions, symptom_contributions,
    //     oximetry_trace_contributions: anonymised research data, no user_id
    //   - ai_usage: usage counter, not user data (resetting would grant free credits)
    //   - email_sequences: drip state (deleting re-triggers onboarding emails)
    //   - consent_audit: legal compliance record, retained under GDPR Art. 17(3)(b)
    const tables = [
      'user_files',
      'user_storage_usage',
      'analysis_data',
      'user_nights',
    ];

    for (const table of tables) {
      try {
        const { error: deleteError } = await serviceRole
          .from(table)
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          Sentry.captureException(deleteError, {
            extra: { userId: user.id, step: `delete_${table}` },
          });
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: { userId: user.id, step: `delete_${table}` },
        });
      }
    }

    // remind_requests has no user_id FK — delete by email
    if (user.email) {
      try {
        const { error: remindError } = await serviceRole
          .from('remind_requests')
          .delete()
          .eq('email', user.email);

        if (remindError) {
          Sentry.captureException(remindError, {
            extra: { userId: user.id, step: 'delete_remind_requests' },
          });
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: { userId: user.id, step: 'delete_remind_requests' },
        });
      }
    }

    // consent_audit is intentionally retained (GDPR Art. 17(3)(b) — legal compliance).
    // The FK is ON DELETE SET NULL so auth.admin.deleteUser() anonymises rows rather
    // than cascade-deleting them; the audit trail survives as pseudonymous records.

    // 3. Delete auth user — cascades to profiles and all FK children
    //    (profiles → user_files, user_storage_usage, user_nights, subscriptions;
    //     auth.users → analysis_data, ai_insights_log, account_deletion_requests)
    const { error: deleteAuthError } = await serviceRole.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      Sentry.captureException(deleteAuthError, {
        extra: { userId: user.id, step: 'delete_auth_user' },
      });
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'delete-user-data' },
      extra: {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
