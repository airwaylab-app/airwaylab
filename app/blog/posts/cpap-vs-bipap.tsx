import Link from 'next/link';
import {
  Activity,
  BookOpen,
  HelpCircle,
  Layers,
  Lightbulb,
  Stethoscope,
  SplitSquareHorizontal,
  TableProperties,
} from 'lucide-react';

export default function CPAPVsBiPAPPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been on CPAP for a while and started wondering whether BiPAP might be
        relevant to your situation — or if you&apos;ve just been prescribed BiPAP and want to
        understand what&apos;s different — this article covers the key distinctions between the two
        device types and how their therapy data looks when you analyse it.
      </p>

      {/* Core difference */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Core Difference: One Pressure vs. Two</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            <strong className="text-foreground">CPAP</strong> (Continuous Positive Airway Pressure)
            delivers a single, continuous pressure throughout the entire breathing cycle. Whether
            you&apos;re inhaling or exhaling, the pressure stays the same. On auto-adjusting CPAP
            (APAP), the pressure varies based on detected events — but it still delivers one
            pressure level at any given moment.
          </p>
          <p>
            <strong className="text-foreground">BiPAP</strong> (Bilevel Positive Airway Pressure)
            delivers two separate pressure levels:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  IPAP — Inspiratory Positive Airway Pressure
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The higher pressure level, active during inhalation. Supports the breathing effort
                as air flows in.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  EPAP — Expiratory Positive Airway Pressure
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The lower pressure level, active during exhalation. Keeps the airway open while
                reducing the effort needed to breathe out against the machine.
              </p>
            </div>
          </div>
          <p>
            The gap between IPAP and EPAP — called <strong className="text-foreground">pressure
            support</strong> (PS) — is set by the prescribing clinician. This pressure difference
            actively assists the breathing effort during inhalation.
          </p>
        </div>
      </section>

      {/* Why two pressures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <SplitSquareHorizontal className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Two Pressures Instead of One?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            For most people with obstructive sleep apnea, CPAP at an appropriate pressure is
            effective at maintaining airway patency. BiPAP is typically prescribed in situations
            where:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">High pressure is required</strong> and exhaling
                against it is uncomfortable or difficult — the lower EPAP makes exhalation easier
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">There is a component of hypoventilation</strong>{' '}
                — conditions where breathing volume (tidal volume) needs support, not just airway
                patency
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Central or complex sleep apnea</strong> patterns
                are present — though specific device selection in these cases is complex and highly
                individualised
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Respiratory muscle weakness</strong> or certain
                neuromuscular conditions — where breathing assistance is needed beyond just keeping
                the airway open
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">CPAP intolerance</strong> — when patients cannot
                tolerate single fixed pressure despite adequate time and fitting adjustments
              </span>
            </li>
          </ul>
          <p>
            The decision about which device is appropriate for a given person is made by a sleep
            physician based on diagnostic study results, clinical history, and response to therapy.
          </p>
        </div>
      </section>

      {/* Therapy data comparison */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TableProperties className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What the Therapy Data Looks Like: CPAP vs. BiPAP
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you review therapy data from each device type, the pressure reports look different.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">CPAP / APAP reports show</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  A single pressure line (or pressure distribution on APAP)
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  90th or 95th percentile pressure
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  AHI with event subtypes
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  Leak rate
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">BiPAP reports show</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  IPAP and EPAP values (or ranges, on auto-BiPAP)
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  Pressure support (IPAP − EPAP)
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  Tidal volume and minute ventilation (advanced models)
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  Leak rate
                </li>
                <li className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  AHI with event subtypes
                </li>
              </ul>
            </div>
          </div>
          <p>
            One practical note: BiPAP devices — particularly those in the S/T (spontaneous/timed)
            category — may not export the same EDF data fields as APAP devices. If you&apos;re
            loading BiPAP data into AirwayLab or OSCAR, the available metrics may differ from what
            you&apos;d see with a ResMed AirSense.
          </p>
        </div>
      </section>

      {/* Flow patterns */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How Flow Patterns Differ</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            On a CPAP waveform, the inspiratory flow shape reflects the patient&apos;s own
            respiratory effort modulated by the constant applied pressure. Tools like the{' '}
            <Link href="/blog/what-is-glasgow-index-cpap" className="text-primary hover:text-primary/80">
              Glasgow Index
            </Link>{' '}
            and{' '}
            <Link href="/blog/what-is-flow-limitation-cpap" className="text-primary hover:text-primary/80">
              FL Score
            </Link>{' '}
            analyse these shapes to characterise breath quality — flatness, limitation patterns, and
            shape irregularities.
          </p>
          <p>
            On BiPAP, the pressure support component actively augments inhalation. The resulting
            flow shapes look different: inhalation is typically faster and more assisted. Flow
            limitation analysis tools designed for CPAP waveforms interpret BiPAP waveforms with
            this context in mind.
          </p>
        </div>
      </section>

      {/* Common questions */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Common Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              &ldquo;My AHI is fine on CPAP — why would I switch to BiPAP?&rdquo;
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              AHI measures event count. It doesn&apos;t fully capture comfort, breathing effort, or
              ventilation adequacy. Whether AHI alone is sufficient to evaluate therapy outcome is a
              clinical determination. Your sleep physician considers the full picture.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              &ldquo;Can I request BiPAP if I find CPAP uncomfortable?&rdquo;
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Discomfort with CPAP is worth discussing with your sleep clinician — there are fitting,
              humidity, and pressure adjustment approaches that sometimes resolve tolerance issues
              without changing device type. Your clinician can advise which approach fits your
              situation.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              &ldquo;Is BiPAP more expensive?&rdquo;
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Generally yes — BiPAP hardware and supplies typically cost more than equivalent CPAP.
              Insurance coverage varies. Your equipment provider and clinician can walk through the
              options.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              &ldquo;Does AirwayLab work with BiPAP data?&rdquo;
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              AirwayLab currently reads ResMed EDF format. Some ResMed BiPAP models write compatible
              EDF files. The available metrics depend on what your device records. Check the{' '}
              <Link
                href="https://www.reddit.com/r/airwaylab"
                className="text-primary hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                community forum
              </Link>{' '}
              for device-specific compatibility notes.
            </p>
          </div>
        </div>
      </section>

      {/* What to ask your clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What to Ask Your Clinician</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you&apos;re wondering whether your current device type is the right fit for your
            situation, useful questions include:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                &ldquo;Based on my recent data, does my event and pressure pattern suggest my
                current device is well-matched to my needs?&rdquo;
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                &ldquo;Are there any aspects of my data — central events, pressure levels, flow
                patterns — that would warrant a review of my device type?&rdquo;
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                &ldquo;If I&apos;m finding exhalation difficult at my current pressure, is bilevel
                worth exploring?&rdquo;
              </span>
            </li>
          </ul>
          <p>
            These questions give your clinician the opening to review your data in context. They are
            in the best position to compare your diagnostic study, your current data trends, and your
            symptoms together.
          </p>
        </div>
      </section>

      {/* Further reading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/bipap-data-analysis-aircurve-10" className="text-primary hover:text-primary/80">
              BiPAP Data Analysis: AirCurve 10 SD Card Guide
            </Link>{' '}
            &mdash; how to load and interpret BiPAP SD card data from a ResMed AirCurve.
          </p>
          <p>
            <Link href="/blog/bipap-vs-cpap-data" className="text-primary hover:text-primary/80">
              BiPAP vs CPAP Data: What Changes in Your Reports
            </Link>{' '}
            &mdash; a closer look at how the data fields differ between device modes.
          </p>
          <p>
            <Link href="/blog/what-is-flow-limitation-cpap" className="text-primary hover:text-primary/80">
              What Is Flow Limitation on CPAP?
            </Link>{' '}
            &mdash; the breath-shape analysis that goes beyond AHI.
          </p>
          <p>
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              AHI Normal but Still Tired? Understanding the Gap
            </Link>{' '}
            &mdash; why a normal AHI doesn&apos;t always mean therapy is complete.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">A note on device decisions</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is a data-visualisation tool, not a medical device. This article describes how
            CPAP and BiPAP devices work and how their therapy data differs — it is not a
            recommendation for any particular device or treatment. Device selection and prescription
            decisions belong with your sleep physician. Your clinician can help interpret these
            findings in context.
          </p>
        </div>
      </section>
    </article>
  );
}
