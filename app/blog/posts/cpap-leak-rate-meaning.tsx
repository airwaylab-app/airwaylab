import Link from 'next/link';
import {
  Wind,
  AlertTriangle,
  BarChart2,
  Activity,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function CPAPLeakRateMeaning() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve ever opened your CPAP app and seen a red &quot;Large Leak&quot; warning — or
        noticed your unintentional leak rate spiking in OSCAR — you&apos;re not alone. CPAP leak
        rate meaning is one of the most commonly searched questions among PAP users, and for good
        reason. Leak rate is one of the numbers most likely to cause confusion, and one of the most
        important for judging whether your therapy data is trustworthy.
      </p>

      {/* Medical Disclaimer */}
      <blockquote className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-amber-400">Medical disclaimer:</strong> This article is for
            informational purposes only. AirwayLab is not a medical device and does not provide
            medical advice, diagnosis, or treatment. Your prescribing clinician or sleep specialist
            can help interpret your therapy data and address any concerns.
          </p>
        </div>
      </blockquote>

      {/* What Is CPAP Leak Rate? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is CPAP Leak Rate?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Leak rate measures the volume of air escaping your CPAP circuit that isn&apos;t part of
            intentional, designed airflow. Your machine records it continuously throughout a session
            and expresses it in litres per minute (L/min).
          </p>
          <p>
            The key word is <em>unintentional</em>. Every PAP mask has exhaust vents built in —
            small holes or ports designed to flush exhaled CO₂ out of the mask. This is called{' '}
            <strong className="text-foreground">intentional leak</strong>, and it&apos;s supposed to
            be there. Without it, you&apos;d rebreathe your own exhaled air.
          </p>
          <p>
            What your machine flags is <em>unintentional</em> leak: air escaping from places it
            shouldn&apos;t — around the mask cushion, at connection points, or through an open mouth
            on a nasal-only mask.
          </p>
        </div>
      </section>

      {/* Total Leak vs Unintentional Leak */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Total Leak vs Unintentional Leak</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This distinction trips people up constantly, so it&apos;s worth spelling out clearly.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Total Leak Rate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Intentional (vent) leak + unintentional leak. This is the raw figure your machine
                records.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Unintentional Leak Rate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Also called residual leak. Total leak minus the designed vent flow. This is the
                number that indicates whether your seal is holding.
              </p>
            </div>
          </div>
          <p>
            Modern ResMed machines report both figures. Older machines or third-party devices may
            only report total leak. Knowing which one you&apos;re reading makes a significant
            difference in how you interpret the number.
          </p>
          <p>
            The intentional vent leak rate varies by mask model and therapy pressure. A full-face
            mask at 10 cmH₂O might vent around 24 L/min as a baseline. A nasal pillow mask at the
            same pressure might vent around 18 L/min. ResMed publishes vent flow curves for each
            mask, and OSCAR uses these curves to calculate the unintentional (residual) leak from
            the raw total leak data your machine records.
          </p>
          <p>
            If OSCAR&apos;s leak graph shows a fairly steady baseline with occasional spikes above
            it, the baseline is your intentional vent leak and the spikes are unintentional leak
            events.
          </p>
        </div>
      </section>

      {/* What Typical Numbers Look Like */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Typical Leak Rate Numbers Look Like
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            There&apos;s no universal &quot;normal&quot; that applies to every mask and machine
            combination, but some context helps:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">ResMed&apos;s &quot;Large Leak&quot; threshold</strong>{' '}
                in myAir is typically unintentional leak ≥ 24 L/min sustained over a meaningful
                portion of the session.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">OSCAR&apos;s leak display</strong> shows the
                95th percentile (L/min), median, and maximum for the session. A lower 95th
                percentile is generally better — it means leak events were infrequent and brief.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                A <strong className="text-foreground">well-sealed session</strong> on a full-face
                mask might show unintentional leak near 0 L/min for most of the night, with small
                spikes during positional shifts.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                Sessions with significant <strong className="text-foreground">mouth breathing</strong>{' '}
                on a nasal-only mask will show elevated unintentional leak, because exhaled air is
                escaping through the mouth rather than through the circuit.
              </span>
            </li>
          </ul>
          <p>
            What matters most isn&apos;t a single number in isolation — it&apos;s whether leak rate
            is consistent and low, and how often it spikes during the night.
          </p>
        </div>
      </section>

      {/* What "Large Leak" Actually Means */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What &quot;Large Leak&quot; Actually Means for Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The &quot;Large Leak&quot; flag on ResMed machines (and similar alerts on other devices)
            is a <strong className="text-foreground">data-quality signal</strong>, not a diagnosis.
          </p>
          <p>
            When unintentional leak is high, the machine&apos;s ability to accurately detect
            apnoeas and hypopnoeas is compromised. Pressure algorithms may respond to air rushing
            out of the mask in a similar way to a respiratory event, potentially triggering
            unnecessary pressure adjustments. Some real events may also be harder to detect against
            the noise of a large leak.
          </p>
          <p>
            This is why your AHI on a high-leak night should be interpreted with caution. The figure
            may be less reliable than on a low-leak night — not because your breathing was better or
            worse, but because the underlying signal quality was lower.
          </p>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-rose-400">Data interpretation note:</strong> High
              unintentional leak = lower confidence in event detection for that session. Your
              clinician can help interpret recurring leak patterns in the context of your overall
              therapy data.
            </p>
          </div>
        </div>
      </section>

      {/* Reading Leak Rate in OSCAR */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Reading Leak Rate in OSCAR</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR is the primary open-source tool for detailed PAP data analysis, and it handles
            leak data well. Here&apos;s how to read it:
          </p>
          <ol className="ml-4 space-y-3">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>
                <strong className="text-foreground">Import your CPAP data</strong> — from your SD
                card or ResMed data folder.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>
                <strong className="text-foreground">Open the daily view</strong> and look at the{' '}
                &quot;Leak Rate&quot; chart. By default, OSCAR displays unintentional (residual)
                leak after subtracting the vent flow curve for your detected mask model.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>
                <strong className="text-foreground">Check the statistics panel</strong> on the left
                for the 95th percentile, median, and maximum values for the session.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              <span>
                <strong className="text-foreground">Overlay with AHI or flow limitation charts</strong>{' '}
                — look for correlations between leak rate spikes and event clusters. Clusters of
                events that coincide with high-leak episodes are worth noting and discussing with
                your clinician.
              </span>
            </li>
          </ol>
          <p>
            One thing to verify: confirm OSCAR has detected the correct mask model. The vent flow
            curve used to calculate unintentional leak depends on the specific mask. If OSCAR is
            using the wrong mask profile, the residual leak calculation will be off. Set your mask
            manually in OSCAR&apos;s settings if the auto-detected mask doesn&apos;t match what you
            use.
          </p>
        </div>
      </section>

      {/* Reading Leak Rate in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Reading Leak Rate in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab displays your leak rate data in the analysis view alongside your AHI, flow
            limitation, and breathing pattern charts.{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              Upload your SD card data at /analyze
            </Link>{' '}
            — your data never leaves your browser.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Nightly leak rate trend</p>
              <p className="mt-1 text-xs text-muted-foreground">
                How your leak varied night to night over the selected period.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Session leak distribution</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The spread of leak values within a single session.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">High-leak flagging</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sessions where sustained high unintentional leak may have reduced data reliability
                are highlighted, so you can factor that in when reading your AHI.
              </p>
            </div>
          </div>
          <p>
            Because AirwayLab is open-source (GPL-3.0), you can verify exactly how leak rate is
            calculated and displayed. There&apos;s nothing opaque in the analysis.
          </p>
          <p className="text-sm font-medium text-foreground">Also worth reading:</p>
          <ul className="ml-4 space-y-1">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
                How to read your CPAP data
              </Link>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <Link
                href="/blog/how-to-export-understand-cpap-data"
                className="text-primary hover:text-primary/80"
              >
                How to export and understand your CPAP data
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* A Note on Using This Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">A Note on Using This Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Leak rate is one input among many. A single high-leak night doesn&apos;t necessarily
            mean something is wrong long-term. Positional shifts, nasal congestion, illness, or
            even a different pillow can temporarily affect seal quality.
          </p>
          <p>
            What&apos;s more informative is the pattern over time — whether high-leak nights
            cluster, whether they correlate with worse-feeling mornings, and how leak trends have
            changed since starting therapy or switching equipment.
          </p>
          <p>
            This is the kind of pattern your clinician or sleep specialist is best placed to
            interpret in the context of your full therapy history and clinical picture. Your
            clinician can review your OSCAR or AirwayLab data at your next appointment if you
            choose to share it. You can{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              generate a session summary at /analyze
            </Link>{' '}
            to share.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What is a normal CPAP leak rate?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              There&apos;s no single universal figure — it depends on your mask type, therapy
              pressure, and machine brand. ResMed machines typically flag sessions with sustained
              unintentional leak above ~24 L/min as &quot;Large Leak.&quot; In OSCAR, a 95th
              percentile unintentional leak below roughly 24 L/min is often cited as a reasonable
              reference point, but what&apos;s appropriate for your specific setup is a question for
              your clinician.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What is the difference between total leak and unintentional leak?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Total leak is all the air leaving your CPAP circuit, including the intentional vent
              leak your mask is designed to produce (to flush exhaled CO₂). Unintentional leak —
              also called residual leak — is total leak minus the designed vent flow. Unintentional
              leak is the figure that indicates whether your mask seal is holding.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What does &quot;Large Leak&quot; mean on my ResMed machine?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              &quot;Large Leak&quot; is ResMed&apos;s flag in myAir and AirSense device reports,
              indicating that unintentional leak exceeded a threshold for a meaningful portion of
              your session. It&apos;s primarily a data-quality indicator: event detection (AHI, flow
              limitation readings) may be less reliable for that session. Your clinician can help
              assess recurring Large Leak flags in your therapy context.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Can high leak rate affect my AHI reading?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. When unintentional leak is high, the pressure algorithm&apos;s ability to
              accurately detect apnoeas and hypopnoeas is reduced. AHI figures from high-leak nights
              may be less reliable. Your clinician can help interpret these figures in the context of
              your therapy.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              How do I read my leak rate in OSCAR?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Open OSCAR and load your CPAP data from your SD card. In the daily view, look for the
              &quot;Leak Rate&quot; chart. OSCAR calculates unintentional (residual) leak by
              subtracting the vent flow curve for your mask model. The statistics panel shows 95th
              percentile, median, and maximum values. Make sure OSCAR has your correct mask selected
              in settings — the right mask profile is essential for an accurate calculation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Leak Rate in Context</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your CPAP SD card data to see your leak rate alongside your full data picture —
          AHI, flow limitation, and nightly trends. Free, in-browser, and your data never leaves
          your device.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/how-to-read-cpap-data"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: How to Read Your CPAP Data
          </Link>
        </div>
      </section>
    </article>
  );
}
