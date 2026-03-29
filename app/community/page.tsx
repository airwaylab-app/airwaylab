import Link from 'next/link';
import {
  Heart,
  Crown,
  Users,
  Map,
  HelpCircle,
  Sparkles,
  Check,
  ArrowRight,
  MessageCircle,
  Vote,
  Zap,
} from 'lucide-react';
import { FAQItem } from '@/components/common/faq-item';

const ACTIVITY_CARDS = [
  {
    icon: MessageCircle,
    title: 'Share your analysis',
    description:
      'Compare notes with other PAP users. Share what you see in your flow data and learn from what others find in theirs.',
  },
  {
    icon: Vote,
    title: 'Shape the roadmap',
    description:
      'Champions vote on what gets built next. Your priorities directly influence where development time goes.',
  },
  {
    icon: HelpCircle,
    title: 'Get help',
    description:
      'Ask questions, share therapy settings, and learn from people who have been where you are.',
  },
  {
    icon: Zap,
    title: 'Early access',
    description:
      'Try new analysis features before they launch. Your feedback shapes how they work for everyone.',
  },
];

const COMMUNITY_TIER = [
  'Open-source code on GitHub',
  'All 4 analysis engines',
  'Public forums (r/SleepApnea, ApneaBoard)',
];

const SUPPORTER_TIER = [
  'Everything in Community, plus:',
  'AirwayLab Discord community',
  'Unlimited AI insights',
  'Direct support from the team',
  'Supporter badge on forum exports',
];

const CHAMPION_TIER = [
  'Everything in Supporter, plus:',
  'Vote on the development roadmap',
  'Direct feature request channel',
  'Champion badge on forum exports',
  'Name on the supporters page',
];

const STEPS = [
  {
    step: '1',
    title: 'Choose a tier',
    description: 'Pick Supporter or Champion on the pricing page.',
  },
  {
    step: '2',
    title: 'Enter your Discord username',
    description: 'Add it in Account Settings after signing in.',
  },
  {
    step: '3',
    title: "You're in",
    description: 'Roles are assigned automatically within 15 minutes.',
  },
];

const FAQ_DATA = [
  {
    q: 'Is the community active?',
    a: "We're a small, early community of dedicated PAP users. That means real conversations, not noise. If you've ever wished you could talk to someone who actually looks at their flow data, this is the place.",
  },
  {
    q: 'Do I have to use Discord?',
    a: "No. All core analysis features work without it. Discord is where the community lives, but AirwayLab's engines, insights, exports, and cloud sync all work independently.",
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, anytime. One click from Account Settings. You keep access until the end of your billing period.',
  },
  {
    q: 'What if I just want to support the project?',
    a: "The Supporter tier is exactly that. Your contribution keeps AirwayLab independent and ad-free. The Discord community is a thank-you, not a product you're buying.",
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_DATA.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
};

export default function CommunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built Together
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AirwayLab is open source, built by PAP users, for PAP users. Our
            community of supporters helps shape what we build next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Heart className="h-4 w-4" />
              Support AirwayLab
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Already a member? Connect Discord
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* What happens here */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-semibold">
            What happens here
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ACTIVITY_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border/50 bg-card/30 p-6"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div className="mb-16">
          <h2 className="mb-2 text-center text-xl font-semibold">
            Support the project, join the community
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-sm text-muted-foreground">
            AirwayLab&apos;s core analysis is free and always will be. Supporters
            fund continued development and get access to the community as a
            thank-you.
          </p>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Community */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Community</h3>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">Free forever</p>
              <p className="mb-6 text-2xl font-bold">$0</p>
              <ul className="flex flex-col gap-2.5">
                {COMMUNITY_TIER.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/analyze"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Start analysing
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Supporter */}
            <div className="relative rounded-xl border-2 border-primary/30 bg-card/30 p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Most Popular
              </div>
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-400" />
                <h3 className="text-lg font-semibold">Supporter</h3>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                Help fund development
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold">$9</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {SUPPORTER_TIER.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    {f.startsWith('Everything') ? (
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Heart className="h-4 w-4" />
                  Support AirwayLab
                </Link>
              </div>
            </div>

            {/* Champion */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <h3 className="text-lg font-semibold">Champion</h3>
              </div>
              <p className="mb-1 text-sm text-muted-foreground">
                Shape what we build
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-2xl font-bold">$25</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {CHAMPION_TIER.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    {f.startsWith('Everything') ? (
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.04] px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/[0.08]"
                >
                  <Crown className="h-4 w-4" />
                  Become a Champion
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-semibold">
            How it works
          </h2>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-card/50 text-sm font-bold text-primary">
                  {step}
                </div>
                <h3 className="mb-1 text-sm font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="mb-6 text-center text-xl font-semibold">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl rounded-xl border border-border/50 bg-card/30 px-6">
            {FAQ_DATA.map((item) => (
              <FAQItem key={item.q} question={item.q}>
                {item.a}
              </FAQItem>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-xl border border-border/50 bg-card/30 px-6 py-10 text-center">
          <Map className="mx-auto mb-4 h-8 w-8 text-primary/60" />
          <p className="mx-auto max-w-md text-base font-medium text-foreground">
            Every supporter helps keep AirwayLab independent and ad-free.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your contribution funds development, not shareholders. The code stays
            open. The analysis stays free.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View pricing
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}
