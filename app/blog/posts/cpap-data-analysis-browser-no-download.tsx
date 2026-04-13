import Link from 'next/link';
import { ArrowRight, BarChart3, Lock, Shield, Cpu, BookOpen } from 'lucide-react';

export default function CPAPDataAnalysisBrowserNoDownloadPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve tried to analyse your CPAP data, you&apos;ve probably run into the same
        friction: most tools ask you to either install desktop software or upload your health data
        to a cloud service. Installation means setup, dependencies, and a machine you can reliably
        use for it. Cloud upload means your breathing data leaving your device &mdash; which, for a
        lot of people, isn&apos;t something they want.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        AirwayLab does neither.
      </p>

      {/* How it works */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Cpu className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How it works</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab runs entirely in your browser. When you drag in your SD card files, the
            analysis happens locally using Web Workers &mdash; background threads that process your
            EDF data without touching a server. Your breathing data stays on your device throughout
            the session. When you close the tab, nothing persists anywhere except your own machine.
          </p>
          <p>
            There&apos;s no account to create. No email address required. Open the page, load your
            files, see your data.
          </p>
        </div>
      </section>

      {/* What it analyses */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What it analyses</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads the detailed EDF files that ResMed CPAP, APAP, and BiPAP machines
            record to their SD cards. See our{' '}
            <Link href="/blog/resmed-airsense-10-sd-card" className="text-primary hover:text-primary/80">
              ResMed SD card guide
            </Link>{' '}
            for step-by-step instructions on accessing your data. From those files, it displays:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'AHI',
                desc: 'Apnea-hypopnea index, broken down by event type.',
                color: 'blue',
              },
              {
                label: 'Flow limitation',
                desc: 'A description of partial upper airway narrowing, which may appear in nights with a low AHI.',
                color: 'blue',
              },
              {
                label: 'RERAs',
                desc: 'Respiratory effort-related arousals, shown as a timeline alongside the flow waveform.',
                color: 'emerald',
              },
              {
                label: 'Glasgow Index',
                desc: 'A composite score summarising breathing quality across the session.',
                color: 'emerald',
              },
              {
                label: 'Full flow waveform',
                desc: 'The raw breathing signal from the EDF file, scrollable and zoomable.',
                color: 'primary',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              All of this is informational. AirwayLab describes what&apos;s in your data. It
              doesn&apos;t interpret what the numbers mean for your therapy, and it doesn&apos;t
              suggest changes. Bring a screenshot of what you see to your next appointment and
              discuss it with your clinician &mdash; they have the clinical context to make sense
              of it.
            </p>
          </div>
        </div>
      </section>

      {/* OSCAR comparison */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How AirwayLab relates to OSCAR</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you&apos;re already using{' '}
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR
            </a>{' '}
            for detailed analysis, you don&apos;t need to stop. OSCAR is excellent, well-maintained,
            and handles desktop workflows very well. AirwayLab is useful for a different scenario:
            when you want a quick look at your data in a browser without a full install, when
            you&apos;re on a second machine, or when you&apos;d rather not add another application
            to your system. They&apos;re complementary &mdash; same data, different surfaces.
          </p>
          <p>
            Read the full comparison:{' '}
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR: How They Complement Each Other
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Privacy you can verify</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The core analysis in AirwayLab is designed to run with zero data transmission. No
            waveform data, no event data, no session metadata is sent to any server. The source
            code is on GitHub under GPL-3.0 &mdash; which means you can read exactly how it works
            and verify that claim yourself. You don&apos;t have to take our word for it.
          </p>
          <p>
            The optional AI insights feature &mdash; if you choose to enable it &mdash; requires
            explicit, informed consent before any data is sent. It&apos;s entirely opt-in.
          </p>
          <p>
            Learn more about{' '}
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              PAP data privacy and your rights
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Free tier */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">The free tier is complete</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab&apos;s core analysis &mdash; including{' '}
            <Link href="/glossary/flow-limitation" className="text-primary hover:text-primary/80">
              flow limitation
            </Link>
            ,{' '}
            <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
              RERAs
            </Link>
            ,{' '}
            <Link href="/glossary/glasgow-index" className="text-primary hover:text-primary/80">
              Glasgow Index
            </Link>
            , and the full flow waveform &mdash; is free and always will be. Premium supports
            continued development and adds some conveniences, but it doesn&apos;t gate the analysis
            that most users are here for.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try it — nothing to install</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in your SD card files. No account, no cloud upload, no download required.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/airwaylab/airwaylab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View Source on GitHub
          </a>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-8 rounded-xl border border-border/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <em>
          AirwayLab is informational only. Nothing displayed constitutes a clinical diagnosis or
          therapeutic recommendation. Always discuss your therapy data with your clinician for
          clinical interpretation.
        </em>
      </p>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/resmed-sd-card-browser-analysis"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your ResMed SD Card Data in Your Browser
            </Link>{' '}
            &mdash; step-by-step guide to finding and opening EDF files.
          </p>
          <p>
            <Link
              href="/blog/bipap-data-analysis-aircurve-10"
              className="text-primary hover:text-primary/80"
            >
              BiPAP Data Analysis: How to Read Your AirCurve 10 Data for Free
            </Link>{' '}
            &mdash; AirCurve 10 ST and VAuto support.
          </p>
          <p>
            <Link
              href="/blog/beyond-ahi"
              className="text-primary hover:text-primary/80"
            >
              Beyond AHI
            </Link>{' '}
            &mdash; why AHI alone doesn&apos;t tell the whole story.
          </p>
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Glossary</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/glossary/glasgow-index" className="text-primary hover:text-primary/80">
              Glasgow Index
            </Link>{' '}
            &mdash; the 9-component breath shape scoring system.
          </p>
          <p>
            <Link href="/glossary/fl-score" className="text-primary hover:text-primary/80">
              FL Score
            </Link>{' '}
            &mdash; population-level flow limitation measure from the WAT engine.
          </p>
          <p>
            <Link href="/glossary/ned-mean" className="text-primary hover:text-primary/80">
              NED Mean
            </Link>{' '}
            &mdash; per-breath negative effort dependence metric.
          </p>
          <p>
            <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
              RERA
            </Link>{' '}
            &mdash; respiratory effort-related arousals explained.
          </p>
        </div>
      </section>
    </article>
  );
}
