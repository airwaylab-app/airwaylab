import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Info, Wind, Layers } from 'lucide-react';

export default function WhatAreRerasSleepApnea() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve spent any time in CPAP forums, you&apos;ve probably heard someone say their
        AHI is fine but they still feel exhausted during the day.{' '}
        <strong className="text-foreground">
          RERAs — Respiratory Effort-Related Arousals
        </strong>{' '}
        are often part of that picture. They are real events in your breathing data that your
        machine&apos;s nightly summary quietly ignores.
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This article explains what are RERAs sleep apnea events, why they don&apos;t show up in
        your AHI score, how they look in raw CPAP flow data, and how AirwayLab can help you see
        them in your own nightly recordings.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is not a medical device, and nothing here
          constitutes a diagnosis or treatment recommendation. Always discuss your therapy data
          with a qualified clinician before making any changes to your settings or care.
        </p>
      </div>

      {/* What Is a RERA */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a RERA?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            RERA stands for <strong className="text-foreground">Respiratory Effort-Related Arousal</strong>.
            In plain language: it is a period of increased breathing effort that ends in an
            arousal — a brief waking moment — without crossing the threshold for a full apnea or
            hypopnea.
          </p>
          <p>
            During normal breathing, your airway stays open and your respiratory effort is low
            and consistent. During an obstructive apnea, the airway closes completely for at
            least 10 seconds. During a hypopnea, airflow drops significantly (typically 30% or
            more) with an associated oxygen desaturation or arousal.
          </p>
          <p>A RERA fits neither definition. It might be:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>A partial narrowing of the airway that causes increasing respiratory effort</li>
            <li>A gradual rise in breathing resistance that your brain detects and wakes from</li>
            <li>
              A pattern of{' '}
              <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
                flow limitation
              </Link>{' '}
              that doesn&apos;t quite dip enough to score as a hypopnea
            </li>
          </ul>
          <p>
            What they share: increased effort, a disruption to sleep continuity, and no trace in
            your AHI.
          </p>
        </div>
      </section>

      {/* How RERAs Differ from Apneas and Hypopneas */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How RERAs Differ from Apneas and Hypopneas
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            It helps to think of these three event types as a spectrum of airway obstruction
            severity.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apnea</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A near-complete stop in airflow lasting at least 10 seconds. Obstructive apneas
                happen when the airway physically collapses. Central apneas happen when the brain
                temporarily stops sending the signal to breathe. Both are counted in your AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopnea</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A partial reduction in airflow — typically 30% or more below baseline — lasting
                at least 10 seconds, accompanied by either an oxygen desaturation or an arousal
                from sleep. Hypopneas are also counted in your AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">RERA</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Subtler than both. Airflow may drop, but not enough to score as a hypopnea under
                the applicable criteria. What defines it is the pattern of increasing respiratory
                effort followed by an arousal that clears the obstruction. The effort is there in
                the flow waveform. The arousal is there in the EEG (in a sleep lab) or detectable
                as a breathing-pattern shift in CPAP data. But the event does not cross the AHI
                threshold.
              </p>
            </div>
          </div>
          <p>
            This is not a flaw in your device. It reflects how these metrics were defined — and
            the definitions have changed over time.
          </p>
        </div>
      </section>

      {/* Why RERAs Don't Appear in Your AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why RERAs Don&apos;t Appear in Your AHI
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The <strong className="text-foreground">AHI (Apnea-Hypopnea Index)</strong> counts
            apneas and hypopneas per hour of sleep. By definition, RERAs are excluded.
          </p>
          <p>
            The AASM (American Academy of Sleep Medicine) scoring guidelines have changed over
            time, and different labs use different hypopnea scoring rules. Under some rulesets,
            events that would be counted in AHI are scored as RERAs under others. Two people with
            identical underlying breathing patterns can receive very different AHI numbers
            depending on which criteria were applied.
          </p>
          <p>
            The practical result: someone using CPAP therapy with a low AHI might still have
            significant respiratory effort going on throughout the night — it is just not being
            counted in the headline metric.
          </p>
          <p>
            Some sleep specialists use the{' '}
            <strong className="text-foreground">RDI (Respiratory Disturbance Index)</strong>{' '}
            instead, which includes RERAs alongside apneas and hypopneas. But most CPAP machines
            do not report RDI. Your device summarises your night as AHI, and RERAs remain
            invisible in that number.
          </p>
        </div>
      </section>

      {/* How RERAs Show Up in Flow Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How RERAs Show Up in Flow Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is where it gets interesting if you look at your raw CPAP data. RERAs have a
            characteristic signature in the airflow waveform:{' '}
            <strong className="text-foreground">flow limitation</strong>. Instead of the normal
            rounded shape of a healthy breath, flow-limited breaths have a flattened top — the
            airway is partially narrowed, airflow plateaus early, and the breath looks truncated
            rather than arched.
          </p>
          <p>
            A sequence of flow-limited breaths with increasing effort, followed by an abrupt
            shift in breathing pattern (the arousal clearing the obstruction), is the fingerprint
            of a RERA in the raw data.
          </p>
          <p>
            You will not see this in your device&apos;s summary numbers. But it is in the
            detailed flow waveform data that your CPAP or BiPAP records to its SD card — if you
            know how to look.
          </p>
          <p>
            For a deeper dive into flow limitation patterns specifically, see our article{' '}
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation in CPAP Data
            </Link>{' '}
            — it covers how to identify these waveform shapes in detail.
          </p>
        </div>
      </section>

      {/* Seeing RERA-Related Patterns in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Seeing RERA-Related Patterns in AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads your SD card data directly in your browser. Your data never leaves
            your device. It gives you access to the same breath-by-breath flow data available in
            tools like OSCAR, with visualisations designed to make flow limitation and
            RERA-related patterns easier to explore.
          </p>
          <p>Here is what to look for when investigating your nightly data:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow waveform view</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Load your session and look at the detailed flow channel. Healthy breaths appear
                as smooth arcs. Breaths during flow limitation look flatter on top — the plateau
                is the tell. A run of flattened breaths followed by a larger, more forceful breath
                is consistent with a RERA-type pattern.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation channel</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AirwayLab surfaces your device&apos;s flow limitation score alongside the raw
                waveform. Look for periods where flow limitation is elevated but your event
                markers show no scored apneas or hypopneas. That gap — flagged limitation with no
                scored events — is exactly where RERA-type patterns tend to live in the data.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Clustering by time of night</p>
              <p className="mt-2 text-sm text-muted-foreground">
                RERAs related to body position (for example, sleeping on your back) often cluster
                in specific windows. AirwayLab&apos;s timeline view lets you see whether patterns
                are consistent across sessions and correlate with time.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Multi-session comparison</p>
              <p className="mt-2 text-sm text-muted-foreground">
                If you want to understand whether changes in your therapy affect these patterns,
                AirwayLab&apos;s multi-session view lets you compare flow limitation trends across
                nights rather than relying on AHI alone.
              </p>
            </div>
          </div>
          <p>
            This is not diagnosis — it is data. What you see in AirwayLab gives you something
            concrete to discuss with your clinician: specific timestamps, specific flow patterns,
            a picture of what your nights actually look like beyond the headline number.
          </p>
          <p>
            If you are new to reading CPAP data,{' '}
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              How to Read Your CPAP Data
            </Link>{' '}
            and{' '}
            <Link href="/blog/how-to-analyse-cpap-data" className="text-primary hover:text-primary/80">
              How to Analyse CPAP Data with AirwayLab
            </Link>{' '}
            are good starting points.
          </p>
        </div>
      </section>

      {/* AHI Is One Number */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI Is One Number</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your AHI is a useful summary. It is not a complete picture. RERAs are one of the
            reasons a low AHI does not automatically mean fully restorative sleep — there are
            others, including periodic limb movements, central breathing patterns, and
            oxygen-independent arousals.
          </p>
          <p>
            The point of looking at your data beyond AHI is not to self-diagnose or second-guess
            your therapy settings. It is to understand what is actually happening in your airway
            during the night, and to have a more informed conversation with whoever is managing
            your care.
          </p>
          <p>
            AirwayLab is free and always will be. It runs entirely in your browser with no
            account required, and the source code is publicly available under GPL-3.0 — so you
            can verify exactly what it does with your data.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore What Your AHI Might Be Missing</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data and look at the flow limitation channel — the part of your
          data most closely linked to RERA-type patterns.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Understanding Flow Limitation
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation in CPAP Data
            </Link>{' '}
            — the waveform patterns behind RERA-type events.
          </p>
          <p>
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              How to Read Your CPAP Data
            </Link>{' '}
            — a beginner&apos;s guide to the metrics that matter.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            — a deep dive into AHI&apos;s limits as a sleep quality metric.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source tool for analysing PAP flow data. Your data never leaves
        your browser. Nothing on this page constitutes medical advice -- always discuss your
        results with a qualified sleep specialist.
      </p>
    </article>
  );
}
