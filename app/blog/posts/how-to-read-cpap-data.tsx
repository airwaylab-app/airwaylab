import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  HardDrive,
  Wind,
  XCircle,
} from 'lucide-react';

export default function HowToReadCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most CPAP machines record detailed information every night. AHI, leak rate, usage hours,
        pressure data — these numbers sit on an SD card, quietly accumulating. Your clinician
        reviews them at appointments. But you can look at them too, right now, for free, without
        sending your data anywhere.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide explains what each metric represents and how to visualise it in AirwayLab.
      </p>

      {/* Top disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is a data
            visualisation tool, not a medical device. Nothing in this article constitutes medical
            advice. Always discuss your therapy data and any concerns with your sleep physician or
            qualified clinician.
          </p>
        </div>
      </div>

      {/* Section 1: Four Key Metrics */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Read Your CPAP Data: The Four Metrics Your Clinician Will Reference
          </h2>
        </div>
        <div className="mt-4 space-y-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {/* AHI */}
          <div>
            <h3 className="text-lg font-bold text-foreground">AHI (Apnoea-Hypopnoea Index)</h3>
            <div className="mt-3 space-y-3">
              <p>
                AHI counts the number of breathing events — apnoeas and hypopnoeas — recorded per
                hour of therapy. It is calculated from the machine&apos;s internal sensor data.
              </p>
              <p>
                A lower AHI on therapy generally reflects fewer recorded breathing interruptions
                during that session. Most clinicians use AHI as one data point among several when
                reviewing how a therapy night went.{' '}
                <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
                  For a deeper look at what AHI measures and what it misses
                </Link>
                , the full picture goes beyond a single nightly number.
              </p>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-400">What AirwayLab shows</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Nightly AHI alongside trend charts across multiple nights, so you can see how
                  the number varies over time rather than reviewing a single session in isolation.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your clinician interprets AHI in the context of your symptoms, sleep quality,
                  and clinical history. The number alone doesn&apos;t tell the whole story.
                </p>
              </div>
            </div>
          </div>

          {/* Leak Rate */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Leak Rate</h3>
            <div className="mt-3 space-y-3">
              <p>
                CPAP machines record air flow leaving the mask seal — termed unintentional or mask
                leak. Higher recorded leak rates can affect how consistently therapy pressure is
                maintained across the session.
              </p>
              <p>
                Leak data is typically reported in litres per minute (L/min) or as a
                95th-percentile figure. Every mask has some intentional vent flow to flush exhaled
                CO&#x2082; — unintentional leak is what escapes around the seal.
              </p>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-400">What AirwayLab shows</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Leak rate trends across your recorded nights, with traffic-light colouring to
                  help you see which sessions had higher or lower recorded leak levels.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  If your recorded leak data shows consistently elevated figures, this is the kind
                  of data your clinician or equipment provider may ask about at your next
                  appointment.
                </p>
              </div>
            </div>
          </div>

          {/* Usage Hours */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Usage Hours</h3>
            <div className="mt-3 space-y-3">
              <p>
                Usage hours records how long the machine was running during the night. This is the
                period the machine was on and delivering pressure — distinct from total sleep time.
              </p>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-400">What AirwayLab shows</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Nightly usage hours across your recorded history. Consistent usage data gives
                  your clinician a clearer picture at review.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Usage data is one of the metrics your clinician will typically reference at a
                  follow-up appointment.
                </p>
              </div>
            </div>
          </div>

          {/* Pressure Data */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Pressure Data</h3>
            <div className="mt-3 space-y-3">
              <p>
                Your machine records the pressure it delivered throughout the night. For
                fixed-pressure machines this is a flat line; for APAP/AutoCPAP machines the
                pressure varies in response to detected events.
              </p>
              <p>
                The 95th-percentile pressure figure (P95) is commonly referenced — it describes
                the pressure level the machine was at or below for 95% of the session.
              </p>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-400">What AirwayLab shows</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Pressure trend charts over your recorded nights, including P95 figures and
                  session-by-session variation.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Pressure settings are determined by your clinician based on your titration study
                  and clinical assessment. AirwayLab describes what pressures were recorded — it
                  does not suggest pressure changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Flow Limitation and Breathing Patterns */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Going Deeper: Flow Limitation and Breathing Patterns
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Standard CPAP reports show AHI, leak, usage, and pressure. AirwayLab goes further by
            analysing the shape of your breath waveforms from the raw EDF data on your SD card.
          </p>
          <p>This analysis describes four patterns:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation — FL Score</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The shape of individual breath curves, which can appear flat-topped rather than
                rounded. AirwayLab&apos;s FL Score (0–100) quantifies this per breath.{' '}
                <Link
                  href="/blog/understanding-flow-limitation"
                  className="text-primary hover:text-primary/80"
                >
                  Flow limitation and its relationship to upper airway resistance is explained in
                  detail in our flow limitation guide
                </Link>
                .
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">RERAs (estimated)</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Runs of breaths with progressive flow limitation features that don&apos;t reach
                the threshold of a scored apnoea or hypopnoea. AirwayLab&apos;s RERA detection
                uses NED slope, recovery breath shape, and sigh detection from the EDF waveform —
                it is a flow-based heuristic, not polysomnography-grade scoring.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Glasgow Index (9-component breath shape score)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                An open-source methodology (GPL-3.0) scoring inspiratory flow shape across nine
                components: skew, spike, flat top, top heavy, multi-peak, no pause, inspiration
                rate, multi-breath, and variable amplitude. Scores range 0–9 per night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                WAT Score — Wobble Analysis Tool
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Three breathing stability metrics: FL Score (flow limitation percentage),
                Regularity (sample entropy of minute ventilation), and Periodicity Index (spectral
                analysis detecting cyclical breathing in the 30–100 second range).
              </p>
            </div>
          </div>
          <p>
            These metrics describe patterns in your breathing data that standard machine reports
            don&apos;t surface. They are informational — your clinician can help interpret what
            the patterns mean in your specific situation.
          </p>
        </div>
      </section>

      {/* Section 3: What AirwayLab Doesn't Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <XCircle className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Doesn&apos;t Do</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>This is as important as knowing what AirwayLab does show.</p>
          <div className="space-y-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">AirwayLab does not diagnose.</strong> Pattern
                descriptions in your data — elevated AHI, high FL Score, frequent RERA estimates
                — are informational observations. They are not diagnostic findings.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  AirwayLab does not suggest pressure changes.
                </strong>{' '}
                Pressure settings are a clinical decision. Nothing AirwayLab shows should be used
                as the basis for self-adjusting your therapy.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  AirwayLab does not interpret clinical context.
                </strong>{' '}
                Your data has meaning in the context of your medical history, symptoms, and
                prescription — context that only your clinical team has.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  AirwayLab does not currently support Philips Respironics or Fisher &amp; Paykel
                  data formats.
                </strong>{' '}
                Analysis uses the ResMed EDF format (AirSense 10, AirSense 11, and AirCurve
                devices). Support for additional manufacturers is planned.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How to Visualise */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Visualise Your CPAP Data in AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            To start, copy the DATALOG folder from your ResMed SD card and open AirwayLab in your
            browser. No account required.{' '}
            <Link
              href="/blog/resmed-airsense-10-sd-card"
              className="text-primary hover:text-primary/80"
            >
              Step-by-step SD card setup for ResMed AirSense
            </Link>{' '}
            covers the full process if you&apos;re doing this for the first time.
          </p>
          <p>
            AirwayLab is browser-based and processes all data locally — your breathing data never
            leaves your device. It complements OSCAR rather than replacing it: OSCAR excels at
            detailed waveform browsing, while AirwayLab adds automated analysis across multiple
            nights.{' '}
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              See how AirwayLab and OSCAR compare
            </Link>{' '}
            if you&apos;re deciding which tools to use.
          </p>
          <p>
            The core analysis is free and always will be. A premium tier adds AI-powered insights,
            forum export, and PDF reports.
          </p>
          <div className="mt-2">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Analyse your CPAP data with AirwayLab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The information in this article is for educational purposes only and does not
            constitute medical advice. AirwayLab does not diagnose, treat, or provide clinical
            recommendations. Always discuss CPAP therapy and data observations with your clinician
            or equipment provider. Your clinician can help interpret these patterns in clinical
            context.
          </p>
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
              Understanding Flow Limitation
            </Link>{' '}
            — what flow limitation is, how it appears in waveform data, and what it means for PAP
            therapy.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            — the limitations of AHI as a metric and what it misses.
          </p>
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>{' '}
            — how the two open-source PAP tools compare and how to use both together.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Visualise Your CPAP Data with AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Free, browser-based, and private. Your data stays in your browser — no upload, no
          account needed.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/resmed-airsense-10-sd-card"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Getting Started with ResMed
          </Link>
        </div>
      </section>
    </article>
  );
}
