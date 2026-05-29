/**
 * Stripe per-customer reconciliation logic (AIR-2255 Phase 1b).
 *
 * For every profile with a stripe_customer_id, calls the Stripe API to verify:
 *   1. The customer exists (not deleted, not phantom)
 *   2. Customer metadata.supabase_user_id matches the profile id
 *   3. Any active Stripe subscription has a corresponding row in subscriptions table
 *
 * Divergences are reported to Sentry at CRITICAL (active sub missing from DB) or
 * HIGH (customer not in Stripe, metadata mismatch) severity. This function does NOT
 * auto-fix — reconciliation tasks are filed manually from the Sentry alerts.
 *
 * Designed to be called from both the weekly cron and a one-shot backfill endpoint.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';

export type DivergenceType =
  | 'active_sub_not_in_db'
  | 'metadata_mismatch'
  | 'customer_not_in_stripe';

export interface StripeDivergence {
  user_id: string;
  stripe_customer_id: string;
  divergence_type: DivergenceType;
  severity: 'CRITICAL' | 'HIGH';
  stripe_subscription_id?: string;
  stripe_metadata_user_id?: string;
  detail?: string;
}

export interface StripeReconciliationResult {
  profiles_checked: number;
  active_sub_not_in_db: number;
  metadata_mismatch: number;
  customer_not_in_stripe: number;
  api_errors: number;
  divergences: StripeDivergence[];
}

export async function runStripeReconciliation(
  supabase: SupabaseClient,
  stripe: Stripe
): Promise<StripeReconciliationResult> {
  const result: StripeReconciliationResult = {
    profiles_checked: 0,
    active_sub_not_in_db: 0,
    metadata_mismatch: 0,
    customer_not_in_stripe: 0,
    api_errors: 0,
    divergences: [],
  };

  // Fetch all profiles that have a Stripe customer ID set
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, stripe_customer_id')
    .not('stripe_customer_id', 'is', null);

  if (profilesError) {
    Sentry.captureException(profilesError, {
      tags: { route: 'cron-stripe-reconciliation', action: 'fetch-profiles' },
    });
    throw profilesError;
  }

  if (!profiles || profiles.length === 0) {
    return result;
  }

  result.profiles_checked = profiles.length;

  // Pre-fetch all DB subscription IDs so we can check membership in O(1)
  const { data: dbSubscriptions, error: dbSubsError } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id');

  if (dbSubsError) {
    Sentry.captureException(dbSubsError, {
      tags: { route: 'cron-stripe-reconciliation', action: 'fetch-db-subscriptions' },
    });
    throw dbSubsError;
  }

  const dbSubIdSet = new Set<string>(
    (dbSubscriptions ?? [])
      .map((s: { stripe_subscription_id: string }) => s.stripe_subscription_id)
      .filter(Boolean)
  );

  for (const profile of profiles) {
    const stripeCustomerId = profile.stripe_customer_id as string;
    const userId = profile.id as string;

    // Step 1: Verify the customer exists in Stripe
    let customer: Stripe.Customer | Stripe.DeletedCustomer | null = null;

    try {
      customer = await stripe.customers.retrieve(stripeCustomerId);
    } catch (stripeErr) {
      const isNotFound =
        (stripeErr as { code?: string }).code === 'resource_missing' ||
        (stripeErr as { statusCode?: number }).statusCode === 404;

      if (isNotFound) {
        const divergence: StripeDivergence = {
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          divergence_type: 'customer_not_in_stripe',
          severity: 'HIGH',
          detail: 'resource_missing',
        };
        result.divergences.push(divergence);
        result.customer_not_in_stripe++;
        Sentry.captureMessage('Stripe reconciliation: customer ID not found in Stripe', {
          level: 'error',
          tags: {
            route: 'cron-stripe-reconciliation',
            divergence_type: 'customer_not_in_stripe',
          },
          extra: { user_id: userId, stripe_customer_id: stripeCustomerId },
        });
      } else {
        result.api_errors++;
        Sentry.captureException(stripeErr, {
          tags: { route: 'cron-stripe-reconciliation', action: 'customers-retrieve' },
          extra: { user_id: userId, stripe_customer_id: stripeCustomerId },
        });
      }
      continue;
    }

    // Deleted customer counts as "not in Stripe" — can't hold an active subscription
    if ('deleted' in customer && customer.deleted) {
      const divergence: StripeDivergence = {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        divergence_type: 'customer_not_in_stripe',
        severity: 'HIGH',
        detail: 'deleted',
      };
      result.divergences.push(divergence);
      result.customer_not_in_stripe++;
      Sentry.captureMessage('Stripe reconciliation: customer is deleted in Stripe', {
        level: 'error',
        tags: {
          route: 'cron-stripe-reconciliation',
          divergence_type: 'customer_not_in_stripe',
        },
        extra: { user_id: userId, stripe_customer_id: stripeCustomerId, deleted: true },
      });
      continue;
    }

    // Step 2: Metadata user ID mismatch — indicates a phantom checkout customer
    const activeCustomer = customer as Stripe.Customer;
    const metadataUserId = activeCustomer.metadata?.supabase_user_id;
    if (metadataUserId && metadataUserId !== userId) {
      const divergence: StripeDivergence = {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        divergence_type: 'metadata_mismatch',
        severity: 'HIGH',
        stripe_metadata_user_id: metadataUserId,
      };
      result.divergences.push(divergence);
      result.metadata_mismatch++;
      Sentry.captureMessage(
        'Stripe reconciliation: customer metadata supabase_user_id does not match profile',
        {
          level: 'error',
          tags: {
            route: 'cron-stripe-reconciliation',
            divergence_type: 'metadata_mismatch',
          },
          extra: {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_metadata_user_id: metadataUserId,
          },
        }
      );
    }

    // Step 3: Check for active Stripe subscriptions absent from the DB
    try {
      const stripeSubs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 10,
      });

      for (const sub of stripeSubs.data) {
        if (!dbSubIdSet.has(sub.id)) {
          const divergence: StripeDivergence = {
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            divergence_type: 'active_sub_not_in_db',
            severity: 'CRITICAL',
            stripe_subscription_id: sub.id,
          };
          result.divergences.push(divergence);
          result.active_sub_not_in_db++;
          Sentry.captureMessage(
            'Stripe reconciliation: active subscription has no row in DB — CRITICAL',
            {
              level: 'error',
              tags: {
                route: 'cron-stripe-reconciliation',
                divergence_type: 'active_sub_not_in_db',
                severity: 'CRITICAL',
              },
              extra: {
                user_id: userId,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: sub.id,
              },
            }
          );
        }
      }
    } catch (subErr) {
      result.api_errors++;
      Sentry.captureException(subErr, {
        tags: { route: 'cron-stripe-reconciliation', action: 'subscriptions-list' },
        extra: { user_id: userId, stripe_customer_id: stripeCustomerId },
      });
    }
  }

  return result;
}
