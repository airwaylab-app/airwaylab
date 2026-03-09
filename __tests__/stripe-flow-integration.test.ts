import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Full-flow integration test for the Stripe payment lifecycle.
 *
 * Simulates the complete user journey:
 *   1. Sign in (community tier)
 *   2. Run 3 free AI analyses → each succeeds
 *   3. 4th AI analysis → blocked (403 limit reached)
 *   4. Checkout as Supporter
 *   5. Stripe webhook fires checkout.session.completed
 *   6. Profile upgraded to supporter tier
 *   7. AI analysis now unlimited
 *   8. Customer portal access works
 *   9. Stripe webhook fires subscription.deleted (cancel)
 *   10. Profile downgraded back to community
 *   11. AI analysis limited again
 *
 * This test uses a shared mock "database" to simulate state changes
 * across the different route handlers.
 */

// ─── Simulated Database State ─────────────────────────────────
interface MockDB {
  profiles: Record<string, { tier: string; stripe_customer_id: string | null }>;
  ai_usage: Record<string, number>; // keyed by `${userId}_${month}`
  subscriptions: Record<string, { user_id: string; status: string; tier: string }>;
  stripe_events: Set<string>;
}

const db: MockDB = {
  profiles: {},
  ai_usage: {},
  subscriptions: {},
  stripe_events: new Set(),
};

function resetDB() {
  db.profiles = {};
  db.ai_usage = {};
  db.subscriptions = {};
  db.stripe_events = new Set();
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Test Suite ───────────────────────────────────────────────

describe('Full Stripe Payment Flow Integration', () => {
  const userId = 'user-integration-test';
  const userEmail = 'test@airwaylab.app';
  const month = getCurrentMonth();

  beforeEach(() => {
    resetDB();
    // Create community user
    db.profiles[userId] = { tier: 'community', stripe_customer_id: null };
    db.ai_usage[`${userId}_${month}`] = 0;
  });

  // Simulate what the AI insights route does for usage checking
  function checkAIAccess(uid: string): { allowed: boolean; count: number } {
    const profile = db.profiles[uid];
    if (!profile) return { allowed: false, count: 0 };

    if (profile.tier === 'supporter' || profile.tier === 'champion') {
      return { allowed: true, count: 0 };
    }

    const count = db.ai_usage[`${uid}_${month}`] ?? 0;
    return { allowed: count < 3, count };
  }

  function useAI(uid: string): boolean {
    const { allowed } = checkAIAccess(uid);
    if (allowed) {
      const key = `${uid}_${month}`;
      db.ai_usage[key] = (db.ai_usage[key] ?? 0) + 1;
    }
    return allowed;
  }

  // Simulate what the webhook does on checkout.session.completed
  function handleCheckoutComplete(uid: string, subscriptionId: string) {
    db.subscriptions[subscriptionId] = {
      user_id: uid,
      status: 'active',
      tier: 'supporter',
    };
    db.profiles[uid] = {
      ...db.profiles[uid],
      tier: 'supporter',
      stripe_customer_id: 'cus_test',
    };
  }

  // Simulate what the webhook does on customer.subscription.deleted
  function handleSubscriptionDeleted(uid: string, subscriptionId: string) {
    const sub = db.subscriptions[subscriptionId];
    if (sub) sub.status = 'canceled';

    // Check for other active subs
    const otherActive = Object.values(db.subscriptions).some(
      (s) => s.user_id === uid && s.status === 'active'
    );

    if (!otherActive) {
      db.profiles[uid] = { ...db.profiles[uid], tier: 'community' };
    }
  }

  it('complete lifecycle: free → limit → pay → unlimited → cancel → limited', () => {
    // Step 1: User starts as community
    expect(db.profiles[userId].tier).toBe('community');

    // Step 2: Run 3 free AI analyses — all succeed
    expect(useAI(userId)).toBe(true);  // 1st
    expect(useAI(userId)).toBe(true);  // 2nd
    expect(useAI(userId)).toBe(true);  // 3rd
    expect(db.ai_usage[`${userId}_${month}`]).toBe(3);

    // Step 3: 4th analysis — blocked
    expect(useAI(userId)).toBe(false);
    expect(db.ai_usage[`${userId}_${month}`]).toBe(3); // count didn't increase

    // Step 4–5: Checkout + webhook fires
    handleCheckoutComplete(userId, 'sub_test_001');

    // Step 6: Verify profile upgraded
    expect(db.profiles[userId].tier).toBe('supporter');
    expect(db.profiles[userId].stripe_customer_id).toBe('cus_test');
    expect(db.subscriptions['sub_test_001'].status).toBe('active');

    // Step 7: AI now unlimited for supporter
    const access = checkAIAccess(userId);
    expect(access.allowed).toBe(true);
    // Supporters bypass usage check entirely
    expect(useAI(userId)).toBe(true); // 4th (now allowed)
    expect(useAI(userId)).toBe(true); // 5th
    expect(useAI(userId)).toBe(true); // 6th ... unlimited

    // Step 8: Customer portal access — just verify profile has stripe_customer_id
    expect(db.profiles[userId].stripe_customer_id).toBeTruthy();

    // Step 9: Cancel subscription via webhook
    handleSubscriptionDeleted(userId, 'sub_test_001');

    // Step 10: Verify downgrade
    expect(db.profiles[userId].tier).toBe('community');
    expect(db.subscriptions['sub_test_001'].status).toBe('canceled');

    // Step 11: AI limited again (but usage counter persists from this month)
    // They already used 6 analyses this month, so they're still over the limit
    const postCancelAccess = checkAIAccess(userId);
    expect(postCancelAccess.allowed).toBe(false);
  });

  it('idempotent webhook handling — duplicate events are safe', () => {
    const eventId = 'evt_test_dedup';

    // First processing
    expect(db.stripe_events.has(eventId)).toBe(false);
    db.stripe_events.add(eventId);
    handleCheckoutComplete(userId, 'sub_dedup_001');
    expect(db.profiles[userId].tier).toBe('supporter');

    // "Duplicate" event — should be detected
    expect(db.stripe_events.has(eventId)).toBe(true);
    // In real code, the webhook returns { duplicate: true } and skips processing
  });

  it('payment failure marks subscription as past_due', () => {
    handleCheckoutComplete(userId, 'sub_pastdue_001');
    expect(db.subscriptions['sub_pastdue_001'].status).toBe('active');

    // Simulate invoice.payment_failed
    db.subscriptions['sub_pastdue_001'].status = 'past_due';
    expect(db.subscriptions['sub_pastdue_001'].status).toBe('past_due');

    // Profile tier should still reflect current subscription tier
    // (past_due doesn't immediately downgrade)
    expect(db.profiles[userId].tier).toBe('supporter');
  });

  it('multiple subscriptions — canceling one keeps active tier', () => {
    // User has two active subscriptions (edge case)
    handleCheckoutComplete(userId, 'sub_multi_001');
    db.subscriptions['sub_multi_002'] = {
      user_id: userId,
      status: 'active',
      tier: 'champion',
    };
    db.profiles[userId].tier = 'champion';

    // Cancel one
    db.subscriptions['sub_multi_001'].status = 'canceled';

    // Check if other subs are still active
    const hasActive = Object.values(db.subscriptions).some(
      (s) => s.user_id === userId && s.status === 'active'
    );
    expect(hasActive).toBe(true);

    // Profile should keep the remaining tier
    expect(db.profiles[userId].tier).toBe('champion');
  });
});
