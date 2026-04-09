import Link from 'next/link';
import { ArrowRight, ShieldCheck, LayoutDashboard, Lock, Sparkles, Smartphone, FileText } from 'lucide-react';

export default function V122YourDataExplainedPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Something clicked with this release. Not just the features -- the framing.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        AirwayLab has always been a tool for understanding your own PAP data: AHI patterns, flow
        limitation events, RERAs, breathing patterns across the night. But the language we used did
        not always reflect that. Some of it crept in from clinical contexts. Some of it sounded more
        like diagnosis than description. v1.2.2 is where we fixed that -- deliberately.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Twenty-three pull requests merged. Here is what shipped.
      </p>

      {/* Language Cleanup */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Language cleanup is a feature</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The biggest change is one users may not notice immediately: the entire interface has been
            revised for MDR compliance. Every data point -- AHI counts, flow limitation scores, RERA
            tallies -- is now framed as informational. &ldquo;Your data shows X&rdquo; instead of
            &ldquo;you have X&rdquo;. &ldquo;This session displays elevated flow limitation
            events&rdquo; instead of implying clinical judgment.
          </p>
          <p>
            This is not legal box-ticking. It is honest design. AirwayLab shows you what your
            device recorded. What that means for your therapy is something to work out with your
            clinician -- not something software should tell you.
          </p>
          <p>
            The new site headline captures it:{' '}
            <strong className="text-foreground">See What Your PAP Data Actually Shows.</strong>
          </p>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Dashboard got smarter</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Three things improved in the main dashboard:</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Night summary</strong> -- a cleaner at-a-glance
              view of each session
            </li>
            <li>
              <strong className="text-foreground">Overview tab</strong> -- reorganised to surface
              the most useful metrics first
            </li>
            <li>
              <strong className="text-foreground">Guided walkthrough</strong> -- a new first-run
              flow to help you orient without drowning in numbers
            </li>
          </ul>
          <p>
            If you have been using AirwayLab for a while, the walkthrough is skippable. For new
            users uploading their first EDF file, it is the difference between &ldquo;what is
            this?&rdquo; and &ldquo;I can see exactly what happened.&rdquo;
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Security hardening</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Seven API routes now have Zod validation on inputs. Discord OAuth has rate limiting.
            Neither of these is visible to users -- that is the point. Secure defaults should be
            infrastructure, not afterthoughts.
          </p>
        </div>
      </section>

      {/* UX Quick Wins */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">UX quick wins</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>A handful of small changes that add up:</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Progress stage labels during analysis so you can follow what the tool is doing</li>
            <li>Simplified upload copy -- less jargon, faster orientation</li>
            <li>Mid-page CTA for users who scroll but do not immediately convert</li>
          </ul>
          <p>
            The pricing page now includes testimonials and a stats bar with real numbers: active
            users, sessions analysed, community size. If you have used AirwayLab and want to
            contribute a quote, open a GitHub issue.
          </p>
        </div>
      </section>

      {/* Mobile */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Mobile email capture</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The /analyze page now has working email capture on mobile. Previously desktop-only. More
            people than expected find AirwayLab on their phone first -- now they can get notified
            when they are ready to do a full session review on desktop.
          </p>
        </div>
      </section>

      {/* Point-of-use disclaimers */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Point-of-use disclaimers</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Every metric popover, every data-highlights section, every insight card now carries
            a clear, direct disclaimer: this is informational data, not medical advice. Discuss your
            findings with your clinician.
          </p>
          <p>
            These are short, honest, and placed where they matter -- not buried in a footer nobody
            reads.
          </p>
        </div>
      </section>

      {/* What this release is really about */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">What this release is really about</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            v1.2.2 is a maturity release. The core analysis -- breath shape scoring, flow limitation
            detection, RERA classification -- has not changed. That code is stable and validated.
            What changed is how we present those results.
          </p>
          <p>
            AirwayLab is free and always will be. GPL-3.0 means the analysis algorithms are open
            and verifiable. Analysis runs entirely in your browser. Your data never leaves your
            device unless you explicitly choose otherwise.
          </p>
          <p>
            The premium tier supports continued development -- server infrastructure, AI-assisted
            interpretation, long-term data sync. It does not gate the core tool.
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <div className="mt-10 rounded-xl border border-border/50 bg-muted/30 p-5">
        <p className="text-xs italic leading-relaxed text-muted-foreground">
          AirwayLab is an informational tool for reviewing PAP therapy session data. It does not
          provide medical diagnoses or therapy recommendations. Always discuss your data and therapy
          adjustments with a qualified clinician.
        </p>
      </div>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Load your latest session</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Same deep analysis. Clearer language. Upload your ResMed SD card and see what your data
          actually shows.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Load your latest session <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}
