import Link from 'next/link';
import { RefreshCw, Scale, ArrowRight } from 'lucide-react';

export default function V121ClearerLanguagePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you opened AirwayLab today and noticed your insights sound a little different,
        that&apos;s v1.2.1 at work.
      </p>

      {/* What Changed */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What changed</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            We rewrote 22+ insight strings, updated our AI prompt layer, and revised all email
            templates. The goal: make every piece of text AirwayLab shows you strictly
            data-descriptive rather than clinical-sounding.
          </p>

          {/* Before/After Example */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
                Before
              </p>
              <p className="text-sm text-muted-foreground">
                &quot;Your flow limitation pattern suggests elevated upper airway resistance.&quot;
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                After
              </p>
              <p className="text-sm text-muted-foreground">
                &quot;Your data shows a recurring flow limitation pattern across 68% of recorded
                breaths.&quot;
              </p>
            </div>
          </div>

          <p>
            The left panel shows wording we have eliminated from the product. The right panel shows
            the replacement. Same underlying analysis. Same algorithms. Same depth. The difference is
            that we now describe <em>what your data shows</em> instead of hinting at what it might
            mean clinically. That is your clinician&apos;s job, not ours.
          </p>
        </div>
      </section>

      {/* Why We Did This */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why we did this</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The EU Medical Device Regulation (MDR) draws a clear line between informational software
            and medical devices. Software that uses diagnostic or therapeutic language risks being
            classified as a medical device under Rule 11, regardless of intent.
          </p>
          <p>
            We are an informational tool. Our language should reflect that. Rather than wait for a
            regulatory body to point this out, we audited every user-facing string against MDR Rule
            11 and fixed everything proactively.
          </p>
        </div>
      </section>

      {/* What This Means For You */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">What this means for you</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Nothing changes about what AirwayLab can do. Flow limitation analysis, RERA patterns,
            breath shape scoring, oximetry overlays -- all identical. These are visualisations of
            your recorded data, not clinical assessments. The wording is simply more precise about
            what the data describes versus what a clinical interpretation might be.
          </p>
          <p>
            As always: your clinician can help interpret findings in your clinical context.
          </p>
          <p>
            AirwayLab remains free, open source (GPL-3.0), and privacy-first. Your data never leaves
            your browser unless you explicitly choose otherwise.
          </p>
          <p>
            <strong className="text-foreground">Technical details:</strong>{' '}
            <a
              href="https://github.com/airwaylab-app/airwaylab/releases/tag/v1.2.1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              v1.2.1 on GitHub
            </a>
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <div className="mt-10 rounded-xl border border-border/50 bg-muted/30 p-5">
        <p className="text-xs italic leading-relaxed text-muted-foreground">
          AirwayLab is an informational tool. It does not provide medical advice, diagnosis, or
          treatment recommendations. Always discuss your sleep data with a qualified clinician.
        </p>
      </div>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try the Updated AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Same deep analysis, clearer language. Upload your ResMed SD card and see the difference.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}
