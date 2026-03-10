'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import { Check, Heart, Crown, Sparkles, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { AuthModal } from '@/components/auth/auth-modal';

const PRICES = {
  supporter: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID,
    yearly: process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID,
  },
  champion: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID,
    yearly: process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID,
  },
};

const COMMUNITY_FEATURES = [
  'All 4 analysis engines',
  'Up to 3 nights per analysis',
  '3 AI insights per month',
  'CSV & JSON export',
  'Forum-formatted summaries',
];

const SUPPORTER_FEATURES = [
  'Everything in Community, plus:',
  'Unlimited AI-powered insights',
  'Cloud sync across devices',
  'Full trend analysis (90 nights)',
  'PDF clinician reports',
  'Enhanced export with annotations',
  'Supporter badge on forum posts',
];

const CHAMPION_FEATURES = [
  'Everything in Supporter, plus:',
  'Early access to new features',
  'Champion badge on forum posts',
  'Name on supporters page',
  'Priority feature requests',
];

export function LandingPricing() {
  const { user, tier } = useAuth();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId) {
      console.error('[pricing] Missing price ID for checkout — env var not configured');
      Sentry.captureMessage('Checkout attempted with missing price ID', { level: 'error' });
      setCheckoutError('This plan is not available yet. Please try again later.');
      return;
    }

    if (!user) {
      events.authStarted('pricing');
      setAuthModalOpen(true);
      return;
    }

    setLoadingPriceId(priceId);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (data.url) {
        const checkoutTier = priceId === PRICES.supporter[billing] ? 'supporter' : 'champion';
        events.checkoutStarted(checkoutTier, billing);
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Could not start checkout. Please try again.');
      }
    } catch {
      setCheckoutError('Could not connect to payment service. Please try again.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handleManage = async () => {
    setCheckoutError(null);
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError('Could not open billing portal. Please try again.');
      }
    } catch {
      setCheckoutError('Could not connect to billing portal. Please try again.');
    }
  };

  return (
    <>
      {/* Billing toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="inline-flex rounded-lg border border-warm-border bg-warm-cloud p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billing === 'monthly'
                ? 'bg-white text-brand-teal shadow-warm-sm'
                : 'text-warm-gray hover:text-warm-charcoal'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billing === 'yearly'
                ? 'bg-white text-brand-teal shadow-warm-sm'
                : 'text-warm-gray hover:text-warm-charcoal'
            }`}
          >
            Yearly
            <span className="ml-1.5 rounded-full bg-data-good/10 px-2.5 py-0.5 text-xs font-semibold text-data-good">
              Save 27%
            </span>
          </button>
        </div>
      </div>

      {/* Checkout error */}
      {checkoutError && (
        <div className="mb-4 rounded-lg border border-data-attention/20 bg-data-attention/5 px-4 py-3 text-center text-sm text-data-attention">
          {checkoutError}
        </div>
      )}

      {/* Tier cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Community */}
        <div className="rounded-xl border border-warm-border bg-warm-white p-6 shadow-warm-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-warm-charcoal">Community</h3>
            <p className="mt-1 text-sm text-warm-gray">Full analysis, free forever</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-warm-charcoal">$0</span>
            <span className="ml-1 text-sm text-warm-gray">/month</span>
          </div>
          {tier === 'community' && user ? (
            <div className="mb-6 rounded-md bg-brand-teal/5 px-3 py-2.5 text-center text-sm font-medium text-brand-teal">
              Current plan
            </div>
          ) : !user ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="mb-6 w-full rounded-md border border-warm-border bg-white px-4 py-2.5 text-sm font-medium text-warm-charcoal transition-colors hover:bg-warm-cloud"
            >
              Sign in to get started
            </button>
          ) : null}
          <ul className="flex flex-col gap-2.5">
            {COMMUNITY_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-warm-gray">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-data-good" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Supporter — highlighted */}
        <div className="relative rounded-xl border-2 border-brand-amber bg-warm-white p-6 shadow-warm-md">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-amber px-3 py-0.5 text-[10px] font-semibold text-white">
            Most Popular
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-data-good" />
              <h3 className="text-lg font-semibold text-warm-charcoal">Supporter</h3>
            </div>
            <p className="mt-1 text-sm text-warm-gray">Unlimited AI + cloud sync</p>
          </div>
          <div className="mb-6">
            {billing === 'monthly' ? (
              <>
                <span className="text-3xl font-bold text-warm-charcoal">$9</span>
                <span className="ml-1 text-sm text-warm-gray">/month</span>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-warm-charcoal">$79</span>
                  <span className="text-sm text-warm-gray">/year</span>
                  <span className="ml-1 text-sm text-warm-gray line-through">$108</span>
                </div>
                <p className="mt-1 text-xs text-warm-gray">
                  That&apos;s just <span className="font-medium text-data-good">$6.58/mo</span>
                </p>
              </>
            )}
          </div>
          {tier === 'supporter' || tier === 'champion' ? (
            <button
              onClick={handleManage}
              className="mb-6 w-full rounded-md border border-warm-border bg-white px-4 py-2.5 text-sm font-medium text-warm-charcoal transition-colors hover:bg-warm-cloud"
            >
              {tier === 'supporter' ? 'Manage subscription' : 'Current plan includes this'}
            </button>
          ) : (
            <button
              onClick={() => handleCheckout(PRICES.supporter[billing])}
              disabled={!!loadingPriceId}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand-teal px-4 py-2.5 text-sm font-medium text-white shadow-warm-sm transition-colors hover:bg-brand-teal-dark hover:shadow-warm-md disabled:opacity-50"
            >
              {loadingPriceId === PRICES.supporter[billing] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              {user ? 'Get Supporter' : 'Sign in to get started'}
            </button>
          )}
          <ul className="flex flex-col gap-2.5">
            {SUPPORTER_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-warm-gray">
                {f.startsWith('Everything') ? (
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-teal" />
                ) : (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-data-good" />
                )}
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Champion */}
        <div className="rounded-xl border border-warm-border bg-warm-white p-6 shadow-warm-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-brand-amber" />
              <h3 className="text-lg font-semibold text-warm-charcoal">Champion</h3>
            </div>
            <p className="mt-1 text-sm text-warm-gray">Maximum impact + early access</p>
          </div>
          <div className="mb-6">
            {billing === 'monthly' ? (
              <>
                <span className="text-3xl font-bold text-warm-charcoal">$25</span>
                <span className="ml-1 text-sm text-warm-gray">/month</span>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-warm-charcoal">$199</span>
                  <span className="text-sm text-warm-gray">/year</span>
                  <span className="ml-1 text-sm text-warm-gray line-through">$300</span>
                </div>
                <p className="mt-1 text-xs text-warm-gray">
                  That&apos;s just <span className="font-medium text-brand-amber">$16.58/mo</span>
                </p>
              </>
            )}
          </div>
          {tier === 'champion' ? (
            <button
              onClick={handleManage}
              className="mb-6 w-full rounded-md border border-warm-border bg-white px-4 py-2.5 text-sm font-medium text-warm-charcoal transition-colors hover:bg-warm-cloud"
            >
              Manage subscription
            </button>
          ) : (
            <button
              onClick={() => handleCheckout(PRICES.champion[billing])}
              disabled={!!loadingPriceId}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-brand-amber/30 bg-brand-amber/5 px-4 py-2.5 text-sm font-medium text-brand-amber-dark transition-colors hover:bg-brand-amber/10 disabled:opacity-50"
            >
              {loadingPriceId === PRICES.champion[billing] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              {user ? 'Become a Champion' : 'Sign in to get started'}
            </button>
          )}
          <ul className="flex flex-col gap-2.5">
            {CHAMPION_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-warm-gray">
                {f.startsWith('Everything') ? (
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-teal" />
                ) : (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-data-good" />
                )}
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trust signals */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-warm-gray">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-data-good" />
          Cancel anytime
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-data-good" />
          Secure payment via Stripe
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-data-good" />
          Your data never leaves your browser
        </span>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
