'use client';

import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import Link from 'next/link';
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
  'All 4 analysis engines (Glasgow, WAT, NED, Oximetry)',
  'Up to 3 nights per analysis',
  '3-6 AI insights per month',
  'Unlimited cloud storage for your EDF files',
  'CSV & JSON export',
  'Forum-formatted summaries',
];

const SUPPORTER_FEATURES = [
  'Everything in Community, plus:',
  '6-10 deep AI insights per analysis (unlimited)',
  'Cloud sync across devices',
  'Full trend analysis (up to 90 nights)',
  'PDF clinician reports',
  'Enhanced export with annotations',
  'Detailed metric explanations',
  'Supporter badge on forum posts',
];

const CHAMPION_FEATURES = [
  'Everything in Supporter, plus:',
  'Early access to new features',
  'Champion badge on forum posts',
  'Name on supporters page',
  'Priority feature requests',
];

const FAQ_ITEMS = [
  {
    q: 'Can I really use AirwayLab for free?',
    a: 'Yes. All four analysis engines, 3 nights per upload, and 3-6 AI insights per month are free forever. No credit card required.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your sleep data is analysed entirely in your browser — no account required. Registered users get unlimited cloud storage and AI insights. Your data can be deleted anytime from Account Settings.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel with one click from your account settings. You keep access until the end of your billing period — no questions asked.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. AirwayLab is an analysis tool, not a medical device. Always discuss therapy changes with your clinician.',
  },
];

export default function PricingPage() {
  const { user, tier } = useAuth();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    events.pricingViewed();
  }, []);

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
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'checkout' } });
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
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'customer-portal' } });
      setCheckoutError('Could not connect to billing portal. Please try again.');
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Keep AirwayLab Independent
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            AirwayLab&apos;s core analysis is free and always will be. Paid tiers
            fund development and keep the project independent.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-border/50 bg-card/30 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billing === 'monthly'
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billing === 'yearly'
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                Save 27%
              </span>
            </button>
          </div>
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-sm text-red-400">
            {checkoutError}
          </div>
        )}

        {/* Tier cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Community */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Community</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Full analysis, free forever
              </p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            {tier === 'community' && user ? (
              <div className="mb-6 rounded-md bg-primary/5 px-3 py-2 text-center text-sm font-medium text-primary">
                Current plan
              </div>
            ) : !user ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="mb-6 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Sign in to get started
              </button>
            ) : null}
            <ul className="flex flex-col gap-2.5">
              {COMMUNITY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Supporter */}
          <div className="relative rounded-xl border-2 border-primary/30 bg-card/30 p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Most Popular
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-400" />
                <h2 className="text-lg font-semibold">Supporter</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlimited AI + cloud sync
              </p>
            </div>
            <div className="mb-6">
              {billing === 'monthly' ? (
                <>
                  <span className="text-3xl font-bold">$9</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold">$79</span>
                    <span className="text-sm text-muted-foreground">/year</span>
                    <span className="text-sm text-muted-foreground line-through ml-1">$108</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    That&apos;s just <span className="text-emerald-500 font-medium">$6.58/mo</span>
                  </p>
                </>
              )}
            </div>
            {tier === 'supporter' || tier === 'champion' ? (
              <button
                onClick={handleManage}
                className="mb-6 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tier === 'supporter' ? 'Manage subscription' : 'Current plan includes this'}
              </button>
            ) : (
              <button
                onClick={() => handleCheckout(PRICES.supporter[billing])}
                disabled={!!loadingPriceId}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  {f.startsWith('Everything') ? (
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Champion */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <h2 className="text-lg font-semibold">Champion</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Maximum impact + early access
              </p>
            </div>
            <div className="mb-6">
              {billing === 'monthly' ? (
                <>
                  <span className="text-3xl font-bold">$25</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold">$199</span>
                    <span className="text-sm text-muted-foreground">/year</span>
                    <span className="text-sm text-muted-foreground line-through ml-1">$300</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    That&apos;s just <span className="text-amber-400 font-medium">$16.58/mo</span>
                  </p>
                </>
              )}
            </div>
            {tier === 'champion' ? (
              <button
                onClick={handleManage}
                className="mb-6 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Manage subscription
              </button>
            ) : (
              <button
                onClick={() => handleCheckout(PRICES.champion[billing])}
                disabled={!!loadingPriceId}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.04] px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/[0.08] disabled:opacity-50"
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
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  {f.startsWith('Everything') ? (
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Cancel anytime
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Secure payment via Stripe
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Delete all data anytime
          </span>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="mb-6 text-center text-xl font-semibold">Frequently asked questions</h2>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="rounded-lg border border-border/50 bg-card/30 p-4">
                <h3 className="text-sm font-medium text-foreground">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            More questions?{' '}
            <Link href="/about" className="text-primary hover:underline">
              Learn more about AirwayLab
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Provider and clinic features are in development.{' '}
            <Link href="/providers" className="text-primary hover:underline">
              Learn more →
            </Link>
          </p>
        </div>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
