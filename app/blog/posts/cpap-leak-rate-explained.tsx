import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Droplets,
  HelpCircle,
  Lightbulb,
  Waves,
  Wind,
} from 'lucide-react';

export default function CPAPLeakRateExplainedPost() {
  return (
    <article>
      {/* Hook */}
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You open your CPAP app and see it: <strong className="text-foreground">Leak rate: 24 L/min.</strong>{' '}
        Is that good? Bad? Worth worrying about?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        CPAP mask leak rate is one of the most consistently misunderstood numbers in a therapy
        report. The apps that display it rarely explain what the figure actually represents, and
        the published reference ranges can be hard to find and harder to interpret.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide explains what CPAP mask leak rate is, how machines measure it, what different
        values represent in your data, and how to read the leak information in your nightly report.
        Your clinician can help interpret what your specific numbers mean in context.
      </p>

      {/* H2: What Is Mask Leak Rate in CPAP Data? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Droplets className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Mask Leak Rate in CPAP Data?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Every CPAP and BiPAP machine continuously tracks the difference between the air it
            delivers and the air that returns. That difference is your total mask leak rate — reported
            in litres per minute (L/min).
          </p>

          {/* H3: Intentional Leak vs. Unintentional Leak */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Intentional Leak vs. Unintentional Leak
          </h3>
          <p>
            Not all leak is a problem. This is the distinction that most CPAP apps and reports don&apos;t
            explain clearly enough.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Intentional leak (vent flow)',
                desc: 'Engineered exhaust vents built into your mask to continuously flush exhaled CO₂. Without them, you would be re-breathing spent air. This flow is constant, expected, and varies by mask model.',
                color: 'bg-emerald-400',
              },
              {
                label: 'Unintentional leak',
                desc: 'Air escaping from an imperfect seal between the mask and your face — around the cushion, from the frame, or through an open mouth on a nasal mask. This is what elevated leak rates reflect.',
                color: 'bg-red-400',
              },
            ].map(({ label, desc, color }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            ResMed devices (AirSense 10, AirSense 11, AirCurve series) report both figures
            separately: <strong className="text-foreground">total leak</strong> (vent flow plus
            unintentional leak) and <strong className="text-foreground">unintentional leak</strong>{' '}
            on its own. The unintentional leak figure is the more clinically relevant one to review.
          </p>

          {/* H3: How CPAP Machines Measure Leak Rate */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            How CPAP Machines Measure Leak Rate
          </h3>
          <p>
            Your machine calculates leak by comparing the flow it delivers at the blower with the
            flow it detects returning through the circuit. It does this continuously during the
            night. The result is recorded as a time-series — not a single nightly average — so you
            can see how leak varied across the session.
          </p>
          <p>
            Most apps and reports then summarise this as a <strong className="text-foreground">95th
            percentile figure</strong>: the leak rate at or below which you spent 95% of the night.
            This percentile approach is less sensitive to brief transient spikes (such as when you
            roll over) than a straight average would be. The 99th percentile figure, when available,
            captures those transient peaks.
          </p>

          {/* H3: Units */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Units: What L/min Means in Your Data
          </h3>
          <p>
            Leak rate is measured in <strong className="text-foreground">litres per minute (L/min)</strong>.
            To put it in perspective: normal tidal breathing at rest involves roughly 5–8 litres of
            air per minute of ventilation. An unintentional leak of 24 L/min represents a substantial
            fraction of that volume escaping the circuit rather than reaching your airway.
          </p>
          <p>
            Some devices and apps display leak as a percentile without showing the raw L/min figure.
            When reviewing your data in tools that show the raw time-series — such as OSCAR or
            AirwayLab — you&apos;ll see L/min on the y-axis.
          </p>
        </div>
      </section>

      {/* H2: How to Read Leak Rate in Your CPAP Report */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to Read Leak Rate in Your CPAP Report</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">

          {/* H3: Where Leak Data Appears */}
          <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
            Where Leak Data Appears in Your Device Report
          </h3>
          <p>
            <strong className="text-foreground">ResMed myAir app:</strong> Shows a &ldquo;mask
            seal&rdquo; rating derived from leak data rather than the raw L/min figure. The underlying
            number is in your SD card data.
          </p>
          <p>
            <strong className="text-foreground">OSCAR:</strong> Displays total leak and unintentional
            leak as separate time-series charts alongside AHI and flow data. The statistics panel
            shows 95th and 99th percentile figures.
          </p>
          <p>
            <strong className="text-foreground">AirwayLab:</strong> Reads the same SD card data and
            plots leak rate across the full night alongside event markers and flow limitation data,
            so you can see whether elevated leak periods coincide with increased breathing events.
          </p>

          {/* H3: Viewing Leak Rate Over Time */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Viewing Leak Rate Over Time
          </h3>
          <p>
            A single night of elevated leak tells you little. The more useful view is the
            multi-night trend: is your 95th percentile leak rate stable across weeks, worsening
            gradually, or variable? Consistent elevation across many nights points to a different
            pattern than a one-off spike on a specific night.
          </p>
          <p>
            AirwayLab shows your leak trend across your full history so you can see whether the
            pattern is stable or changing over time.
          </p>

          {/* H3: Reading Leak Data with AirwayLab */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Reading Leak Data with AirwayLab
          </h3>
          <p>
            Upload your ResMed SD card to AirwayLab and you can explore your leak data alongside
            your AHI, flow limitation scores, and pressure delivery — all in your browser. Your
            data never leaves your device.
          </p>
        </div>

        {/* In-section CTA */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
          <p className="text-sm font-medium text-foreground">Explore your leak rate data in AirwayLab</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Free, open-source, and 100% private &mdash; your data never leaves your browser.
          </p>
          <Link
            href="/analyze"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Upload Your SD Card Data <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* H2: What Do Different Leak Rate Values Indicate? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Do Different Leak Rate Values Indicate?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">

          {/* H3: Manufacturer Reference Ranges */}
          <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
            Manufacturer Reference Ranges (ResMed, Philips)
          </h3>
          <p>
            Manufacturers publish reference ranges in their device documentation that many PAP users
            reference when reviewing their therapy data.
          </p>
          <div className="space-y-3">
            {[
              {
                label: 'ResMed (AirSense 10, AirSense 11, AirCurve)',
                desc: "ResMed's published documentation references an unintentional leak threshold of 24 L/min. Total leak thresholds are higher, as they include the intentional vent flow.",
              },
              {
                label: 'Philips (DreamStation, System One)',
                desc: 'Philips devices report "large leak" as a binary flag rather than a continuous L/min figure. When flagged, the device indicates the leak was high enough to affect therapy delivery for a sustained period.',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            What these reference ranges mean for your individual situation depends on your machine
            model, mask type, therapy mode, and clinical context. Your clinician can help interpret
            what your leak data represents in context.
          </p>

          {/* H3: How Leak Rate Relates to Therapy Data Quality */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            How Leak Rate Relates to Therapy Data Quality
          </h3>
          <p>
            Mask leak rate isn&apos;t just a comfort metric — it affects the reliability of the
            other numbers in your report. Your machine uses the flow signal to detect breathing
            events, measure flow limitation, and drive pressure adjustments on APAP and BiPAP
            devices. When leak is elevated, that flow signal is distorted.
          </p>
          <p>
            Many PAP users discuss leak rate with their equipment provider or care team when
            reviewing therapy data, particularly when other metrics are also showing unexpected
            patterns.
          </p>

          {/* H3: What Happens to AHI Data During High Leak? */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            What Happens to AHI Data During High Leak?
          </h3>
          <p>
            When unintentional leak is high, your machine&apos;s event detection becomes less
            accurate. This can manifest in a few ways:
          </p>
          <div className="space-y-3">
            {[
              {
                label: 'Underreported events',
                desc: 'Real apneas or hypopneas may go undetected if the flow signal is too noisy to distinguish a genuine event from leak-related airflow disruption.',
                color: 'bg-amber-400',
              },
              {
                label: 'False events',
                desc: 'Conversely, some machines may flag leak artefacts as respiratory events, inflating the AHI count on high-leak nights.',
                color: 'bg-amber-400',
              },
              {
                label: 'Pressure mistitration on APAP',
                desc: 'Auto-titrating devices may respond to leak artefacts by raising or lowering pressure inappropriately, since the algorithm relies on the same flow signal.',
                color: 'bg-red-400',
              },
            ].map(({ label, desc, color }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${color}`} />
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            This is why AHI alone, on a high-leak night, may not accurately represent what was
            happening with your breathing. Reviewing leak and event data together gives a more
            complete picture.
          </p>
        </div>
      </section>

      {/* H2: Common Sources of Mask Leak */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Common Sources of Mask Leak</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Unintentional leak patterns in the data are often associated with a small number of
            recurring factors. Understanding what these factors are helps you describe what
            you&apos;re seeing when discussing your data with your care team.
          </p>

          {/* H3: Mask Fit and Facial Seal */}
          <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
            Mask Fit and Facial Seal
          </h3>
          <p>
            The cushion-to-face interface is the most common source of unintentional leak. Leak
            patterns associated with fit factors often appear in the data as persistent low-level
            elevation across the full night rather than intermittent spikes, because the seal is
            consistently imperfect rather than occasionally disrupted.
          </p>

          {/* H3: Mouth Breathing */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Mouth Breathing
          </h3>
          <p>
            On nasal and nasal pillow masks, mouth breathing creates a separate leak path not covered
            by the mask seal. In data terms, this typically appears as a sustained elevation in
            unintentional leak, often correlated with supine position (lying on your back) and more
            pronounced in the later portions of the night as sleep deepens.
          </p>

          {/* H3: Mask Wear and Cushion Condition */}
          <h3 className="mt-6 text-base font-semibold text-foreground sm:text-lg">
            Mask Wear and Cushion Condition
          </h3>
          <p>
            Silicone and gel cushions degrade with use. A cushion that sealed well when new may
            develop micro-perforations or lose its original shape over months of use. If your
            historical leak data shows a gradual worsening trend over several months, cushion
            condition is one pattern worth raising with your equipment provider when you discuss
            the data.
          </p>
        </div>
      </section>

      {/* H2: Analyzing Your Leak Rate Data with AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Analyzing Your Leak Rate Data with AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads the full SD card data from your ResMed device — the same source that{' '}
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR
            </a>{' '}
            reads — and surfaces your leak rate in context with the rest of your therapy data. Your
            data never leaves your browser. No account required.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Leak trend across nights',
                desc: 'See whether your 95th percentile mask leak rate is stable, worsening, or variable across your history.',
              },
              {
                label: 'Nightly leak timeline',
                desc: 'View leak rate plotted across the full night alongside events — see whether elevated leak periods coincide with increased AHI or flagged breathing events.',
              },
              {
                label: 'H1/H2 split',
                desc: 'Compare first-half vs second-half of the night. Leak that worsens in H2 often correlates with positional changes as sleep deepens.',
              },
              {
                label: 'Cross-metric view',
                desc: 'Review leak alongside flow limitation scores, AHI, and pressure to understand whether a high-leak night also had less reliable event data.',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Primary CTA */}
      <section className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore your CPAP mask leak rate data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to AirwayLab. Free, open-source, and 100% private &mdash; your
          data never leaves your browser.
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

      {/* H2: FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'What is a good CPAP mask leak rate?',
              a: "ResMed's published documentation references 24 L/min as a threshold for unintentional leak, but what's appropriate varies by machine model, mask type, and therapy mode. Your clinician can help you interpret what your specific numbers mean.",
            },
            {
              q: 'What is the difference between large leak and unintentional leak on CPAP?',
              a: 'These terms are used differently by different manufacturers. ResMed reports a continuous unintentional leak figure (in L/min) that subtracts the expected intentional vent flow. Philips DreamStation devices report "large leak" as a binary flag when leak is high enough to affect therapy delivery for a sustained period.',
            },
            {
              q: 'Does a high leak rate affect my AHI reading?',
              a: 'Yes. Significant unintentional leak distorts the flow signal your machine uses to detect breathing events. On high-leak nights, AHI figures may be less reliable — either underreporting events missed in the noise, or over-counting artefacts flagged as events.',
            },
            {
              q: 'How do I check my CPAP leak rate without software?',
              a: 'ResMed myAir displays a mask seal rating derived from leak data. For the raw L/min figures, you need SD card analysis software: OSCAR (free, local) or AirwayLab (free, browser-based). Both read the same underlying data.',
            },
            {
              q: 'What does it mean when my CPAP reports a leak rate of 0?',
              a: 'A reported unintentional leak of 0 L/min means the device detected no leak above the expected vent flow. This is normal for a well-fitting mask on a given night. If you see 0 L/min consistently across all nights, double-check that your device is reporting unintentional leak rather than a different column.',
            },
            {
              q: 'Can I see my CPAP leak rate data for free?',
              a: 'Yes. AirwayLab reads your ResMed SD card data in your browser — no account required, no upload to any server. Your data never leaves your device. The analysis is free and always will be.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Medical disclaimer */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">A note on interpreting your data</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          AirwayLab analysis is informational only and does not constitute medical advice, a
          diagnosis, or a recommendation to change your therapy settings. Mask leak rate thresholds
          vary by machine model, mask type, and individual clinical context. Your clinician can help
          interpret these findings in context.
        </p>
      </div>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/how-to-export-understand-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Export and Understand Your CPAP Data
            </Link>{' '}
            &mdash; a full walkthrough of the metrics in your nightly report.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data (And Why AHI Isn&apos;t the Whole Story)
            </Link>{' '}
            &mdash; why the headline number often misses important patterns.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation: What Your PAP Machine Doesn&apos;t Tell You
            </Link>{' '}
            &mdash; the metric that explains residual symptoms even when AHI looks fine.
          </p>
        </div>
      </section>
    </article>
  );
}
