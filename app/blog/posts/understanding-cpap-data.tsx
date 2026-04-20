import Link from 'next/link';
import { Activity, ArrowRight, BarChart3, BookOpen, HelpCircle, MonitorSmartphone, Gauge, Wind, Waves } from 'lucide-react';

export default function UnderstandingCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        When you first download your CPAP or BiPAP data, the numbers can feel like reading a
        foreign language. AHI of 2.1. Leak rate at the 94th percentile. Flow limitations flagged.
        RERAs: 4.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        What does any of it mean? And is it something to act on &mdash; or not?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide walks through the most common metrics in a CPAP report: what they measure, why
        they&apos;re worth understanding, and how to have a more informed conversation with your
        clinician about what you&apos;re seeing. Understanding your CPAP data doesn&apos;t mean
        interpreting it yourself &mdash; it means being a better participant in your own care.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        AirwayLab can help you visualise and explore these numbers in your browser. Your clinician
        can help interpret these numbers in the context of your full clinical picture.
      </p>

      {/* What Is a CPAP Report? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a CPAP Report?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Modern CPAP and BiPAP machines record data every night &mdash; pressure delivery,
            breathing events, airflow patterns, leak rates, and more. That data lives on an SD card
            inside your device. When you pull it out and run it through analysis software, you get a
            CPAP report.
          </p>
          <p>
            Tools like OSCAR (the gold standard for local, open-source data analysis) and AirwayLab
            can both read that raw data and surface it in a readable format. They complement each
            other &mdash; OSCAR gives you deep, granular access to your raw data files; AirwayLab
            adds a browser-based interface for quickly visualising breathing patterns and reviewing
            your therapy over time. Your data never leaves your browser when you use AirwayLab. No
            account required, no server upload &mdash; it runs entirely on your device.
          </p>
        </div>
      </section>

      {/* AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AHI: The Headline Number (But Not the Only One)
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI stands for Apnea-Hypopnea Index. It counts the average number of breathing pauses
            per hour of sleep &mdash; either full apneas (breathing stops briefly) or hypopneas
            (breathing becomes significantly reduced).
          </p>
          <p>
            For most people on PAP therapy, a lower AHI is better. But what your clinician targets
            for you specifically depends on your full clinical picture, not just this number.
            That&apos;s not a disclaimer &mdash; it&apos;s genuinely how sleep medicine works.
          </p>
          <p>
            The more important point: AHI is the most-watched metric, but it doesn&apos;t tell the
            whole story. You can have a low AHI and still feel like your therapy isn&apos;t working.
            That&apos;s where the other numbers come in.
          </p>
          <p>Your clinician can help you understand what your AHI trend means in context.</p>
        </div>
      </section>

      {/* Flow Limitations */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Flow Limitations: The Subtle Signal</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Flow limitation is what happens when your upper airway partially collapses &mdash; not
            enough to trigger an apnea or hypopnea that gets counted in your AHI, but enough to
            restrict airflow through part of a breath. Your device detects this as a flattening in
            the breathing waveform rather than a clean round curve.
          </p>
          <p>
            Flow limitations matter because they don&apos;t always show up in AHI. If you
            consistently see them in your data &mdash; especially clustering during certain parts of
            the night &mdash; your clinician can help you understand what flow limitation patterns
            mean for your situation.
          </p>
          <p>
            AirwayLab plots flow limitation data across the full night so you can see whether they
            appear in bursts, track with body position changes, or coincide with periods of high
            pressure demand.
          </p>
        </div>
      </section>

      {/* RERAs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            RERAs: What Happens Just Before a Full Arousal
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            RERAs &mdash; Respiratory Effort Related Arousals &mdash; are brief sleep disruptions
            caused by increasing respiratory effort. They don&apos;t fully meet the criteria for a
            hypopnea, but they can still fragment sleep and affect how rested you feel in the
            morning.
          </p>
          <p>
            Not all devices score RERAs the same way, and some don&apos;t report them at all. If
            your device data includes RERA events, AirwayLab will surface them alongside your AHI
            breakdown. Your clinician can help you understand what RERA data means in context.
          </p>
        </div>
      </section>

      {/* Leak Rate */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Leak Rate: The Unsexy Problem That Matters a Lot
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A mask that doesn&apos;t seal properly leaks air. That leak disrupts pressure delivery
            and can affect the data your machine records even when your AHI looks fine on paper.
          </p>
          <p>
            Most devices report leak rate as a 95th or 99th percentile figure &mdash; meaning that
            for 95% (or 99%) of the night, your leak was at or below that value. What counts as an
            acceptable leak rate depends on your machine model and mask type. Your device manual and
            your clinician&apos;s guidance are the right reference points for your specific
            situation.
          </p>
          <p>AirwayLab displays leak and event data together so you can see whether they correlate.</p>
        </div>
      </section>

      {/* Pressure */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Pressure: What Your Machine Was Actually Doing
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you&apos;re on a fixed-pressure CPAP, you have one set pressure delivered all night.
            If you&apos;re on an APAP (auto-adjusting) or BiPAP, your device varies pressure in
            response to what it detects in your breathing.
          </p>
          <p>
            Looking at your pressure data over time shows whether your machine is frequently
            reaching its upper limit &mdash; which can indicate the auto-titrating algorithm is
            working hard to keep your airway open. Your clinician can help interpret pressure trends
            in context.
          </p>
        </div>
      </section>

      {/* How AirwayLab Fits In */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <MonitorSmartphone className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How AirwayLab Fits In</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is built to make your CPAP report readable &mdash; not to replace the
            clinical conversation. Upload your SD card data, and you get:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'AHI breakdown',
                desc: 'By event type: obstructive apneas, central apneas, hypopneas.',
              },
              {
                label: 'Flow limitation patterns',
                desc: 'A full night view of flow limitation across every breath.',
              },
              {
                label: 'Leak rate',
                desc: 'Plotted alongside breathing events so you can see whether they correlate.',
              },
              {
                label: 'Pressure delivery',
                desc: 'Pressure across the night, showing when your machine was working harder.',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            Everything runs in your browser. Your data is yours. The analysis is free, and always
            will be.
          </p>
          <p>
            If you already use{' '}
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR
            </a>
            , AirwayLab doesn&apos;t replace it &mdash; they&apos;re looking at the same data in
            different ways. Use whichever interface helps you see your therapy more clearly.
          </p>
        </div>
      </section>

      {/* What to Actually Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What to Actually Do With This Information
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding your CPAP data means being an informed participant in your care &mdash;
            not a self-diagnosing one. When you can look at a chart and describe specific patterns
            &mdash; like flow limitations clustering after midnight, or leak rate spiking on certain
            nights &mdash; you have a clearer picture of what your data shows.
          </p>
          <p>That&apos;s the goal. Upload your data and explore what&apos;s there.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See your therapy data clearly</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data and explore AHI, flow limitations, leak rate, and pressure
          &mdash; all in your browser, no account required.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Upload Your SD Card Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/analyze?sample=true"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See a Sample Analysis
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'What is AHI on a CPAP report?',
              a: 'AHI (Apnea-Hypopnea Index) is the average number of breathing pauses per hour during sleep. Your clinician can help you understand what your AHI means in context.',
            },
            {
              q: 'What do flow limitations mean on my CPAP data?',
              a: 'Flow limitations indicate partial airway restriction that may not appear in your AHI count. Your clinician can help you understand what frequent flow limitation patterns mean for your situation.',
            },
            {
              q: 'What is a RERA in CPAP data?',
              a: "A Respiratory Effort Related Arousal is a brief sleep disruption from increased breathing effort that doesn't meet the full criteria for a hypopnea.",
            },
            {
              q: 'How do I read my CPAP data?',
              a: 'Tools like OSCAR and AirwayLab can help you visualise your SD card data. AirwayLab runs in your browser with no upload required.',
            },
            {
              q: 'What causes high leak rate on CPAP?',
              a: 'Common causes include mask fit issues, mouth breathing, or positional factors. Your care team can help you understand what your leak rate data means.',
            },
            {
              q: 'Is AirwayLab free?',
              a: 'Yes. AirwayLab is free and always will be. Premium features support ongoing development but the core analysis is always available at no cost.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-8 rounded-xl border border-border/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <em>
          AirwayLab analysis is informational only and does not constitute medical advice, a
          diagnosis, or a recommendation to change your therapy settings. Always discuss your CPAP
          data and any therapy concerns with a qualified clinician.
        </em>
      </p>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data (And Why AHI Isn&apos;t the Whole Story)
            </Link>{' '}
            &mdash; deeper dive into all the metrics your machine records.
          </p>
          <p>
            <Link
              href="/blog/cpap-data-analysis-browser-no-download"
              className="text-primary hover:text-primary/80"
            >
              Analyse CPAP Data in Your Browser &mdash; No Download, No Cloud, No Account
            </Link>{' '}
            &mdash; how AirwayLab processes your data locally.
          </p>
          <p>
            <Link
              href="/blog/why-ahi-is-lying"
              className="text-primary hover:text-primary/80"
            >
              Why Your AHI Is Lying to You
            </Link>{' '}
            &mdash; the evidence behind AHI&apos;s limitations.
          </p>
        </div>
      </section>
    </article>
  );
}
