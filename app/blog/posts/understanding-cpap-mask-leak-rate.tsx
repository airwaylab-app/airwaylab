import Link from 'next/link';
import {
  Wind,
  Database,
  BarChart3,
  Layers,
  Eye,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export default function UnderstandingCpapMaskLeakRatePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&#39;ve ever looked at a night&#39;s CPAP data and wondered what the leak rate
        number actually represents — you&#39;re not alone. It&#39;s one of the most searched
        questions PAP users bring to forums, and most of the answers either stop too short
        (&quot;anything under 24 is fine&quot;) or go too far (&quot;high leaks mean your therapy
        is failing&quot;).
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Neither is quite right. This article is about what the data <em>is</em> and how to
        read it. What to do about it is a conversation for your sleep physician.
      </p>

      {/* What is mask leak rate */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What is mask leak rate in CPAP data?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your CPAP device measures airflow continuously. Every breath in and out, every
            second of the night, is tracked. Part of what it&#39;s tracking is how much air
            is escaping the mask circuit in ways that weren&#39;t intended.
          </p>
          <p>There are two leak figures stored in the data:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Total leak</strong> — all air leaving the
              circuit, including the intentional exhaust port built into your mask. This vent
              is <em>supposed</em> to be there; it&#39;s how CO₂ is flushed away. Total leak
              is always present, even with a perfect seal.
            </li>
            <li>
              <strong className="text-foreground">Unintentional leak</strong> (also called
              mask leak) — total leak minus the designed vent flow. This is the number that
              tells you how much air escaped in ways that weren&#39;t part of the mask&#39;s
              design.
            </li>
          </ul>
          <p>
            On ResMed devices, both figures are stored per-second in EDF (European Data Format)
            files on the SD card. This per-second resolution is why tools like AirwayLab and
            OSCAR can show you exactly when during the night a leak event happened — not just
            a nightly average.
          </p>
        </div>
      </section>

      {/* How leak rate relates to device pressure delivery */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How leak rate relates to device pressure delivery
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A PAP device works by maintaining pressure to keep your airway open. When air
            escapes through an unintended gap — at the nose bridge, at the sides of a
            full-face mask, through an open mouth — the device may have trouble maintaining
            target pressure, particularly during pressure fluctuations in auto-titrating mode.
          </p>
          <p>
            That said, <em>some</em> unintentional leakage is normal. Masks aren&#39;t
            perfectly sealed. The data almost always shows non-zero unintentional leak; the
            question is whether it&#39;s episodic and brief, or sustained and large.
          </p>
          <p>
            What the data doesn&#39;t tell you directly is whether a given leak level mattered
            clinically on any given night. That interpretation depends on many factors your
            device can&#39;t see. Your clinician can interpret these patterns in full clinical
            context.
          </p>
        </div>
      </section>

      {/* How to read leak rate */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to read your leak rate in CPAP data (SD card vs. app)
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Most CPAP devices that support SD card data recording store leak information in
            the detail data — the high-resolution per-second channel — rather than only in
            the daily summary.
          </p>
          <p>
            If you&#39;re reading from the summary view in the manufacturer&#39;s app (ResMed
            myAir, for example), you typically see a single averaged leak figure for the night.
            That average can hide a lot: a 90-minute high-leak episode in the middle of the
            night may average out to a number that looks unremarkable.
          </p>
          <p>
            When you load the same SD card data into a desktop analysis tool — OSCAR or
            AirwayLab — you see the full time-series. You can spot the exact timestamp when
            leak climbed, how long it lasted, and what else was happening in the data at the
            same time.
          </p>
          <p>
            This time-series view is where the real data literacy happens. A brief spike at
            02:30 when you shifted positions looks very different from a sustained high-leak
            baseline all night.
          </p>
        </div>
      </section>

      {/* What counts as a large leak */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What counts as a large leak?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In the EDF data from ResMed devices, there is a separate binary channel called{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Large Leak</code>{' '}
            that fires when unintentional leak exceeds approximately{' '}
            <strong className="text-foreground">24 L/min</strong>. This threshold is baked into
            the device firmware — it&#39;s not a clinical guideline, it&#39;s a flag in the
            data that ResMed uses internally to indicate an elevated leak event.
          </p>
          <p>
            When AirwayLab (or OSCAR) shows you a{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Large Leak</code>{' '}
            marker on the timeline, it&#39;s reporting that your device logged that flag. It
            is a description of what the data contains, not a diagnosis.
          </p>
          <p>To be precise about what you&#39;ll see in the data:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Unintentional leak consistently below ~24 L/min: no{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Large Leak</code>{' '}
              flag in the record
            </li>
            <li>
              Unintentional leak exceeding ~24 L/min:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Large Leak</code>{' '}
              flagged in the EDF data for those seconds
            </li>
          </ul>
          <p>
            Some users notice that their devices respond to sustained large leak periods by
            increasing pressure in an attempt to compensate. How the pressure response changed
            other signals in the data is something the full record can show you.
          </p>
        </div>
      </section>

      {/* Flow limitation and leaks interaction */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Flow limitation and leaks: how they interact</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is one of the less-discussed dynamics in PAP data, and it matters.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Flow limitation
            </Link>{' '}
            is a pattern in the inspiratory flow waveform — a flattening that devices record
            breath-by-breath. It&#39;s one of the signals that feeds into metrics like the
            Glasgow Distress Index.
          </p>
          <p>
            Here&#39;s the interaction: when there&#39;s a significant unintentional leak, your
            device is working with an incomplete picture of your actual flow. Air that exits
            through a gap isn&#39;t part of the measured breath — the device has to estimate
            what your true airflow was. In high-leak conditions, flow limitation scores can be
            underestimated (because the distorted signal looks less flat than it really was)
            or overestimated depending on how the firmware handles the correction.
          </p>
          <p>
            The practical implication for reading your data: if you have a night with
            substantial large leak events, the flow limitation data from that same period should
            be interpreted carefully. The two signals are not independent.
          </p>
          <p>
            This is another reason why the raw SD card data, loaded into a tool that shows
            all channels together, is more informative than any single summary metric.
          </p>
        </div>
      </section>

      {/* How to view in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">How to view your leak rate in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads EDF data directly from your ResMed SD card — entirely in your
            browser, with no data leaving your device.
          </p>
          <p>
            When you load a night&#39;s data, the leak rate channel appears on the main
            timeline alongside flow limitation, AHI events, pressure, and breathing patterns.
            You can:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>See the full per-second leak trace for the night</li>
            <li>
              Identify when{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Large Leak</code>{' '}
              events were flagged in the raw data
            </li>
            <li>
              Compare leak timing against flow limitation and RERA events on the same timeline
            </li>
            <li>Check how leak patterns correlate with your Glasgow Index score for that night</li>
          </ul>
          <p>
            You can also look across multiple nights to see whether high-leak episodes are
            consistent (same time of night, same body position, same pressure range) or random.
          </p>
          <p>
            For a broader guide to what CPAP data channels mean and how to read them together,
            see{' '}
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              How to Read Your CPAP Data
            </Link>
            .
          </p>
        </div>
      </section>

      {/* What this data can and can't tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What this data can and can&#39;t tell you
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your SD card data is a detailed record of what your device measured. It can show
            you:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>When leak events happened</li>
            <li>How large they were</li>
            <li>How they relate to other signals in the same night</li>
          </ul>
          <p>
            It cannot tell you whether any of this is clinically significant for your specific
            situation, or what action (if any) would be appropriate. Those are clinical
            questions that belong with your sleep physician, who can review the full picture.
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
            — how the Glasgow Index, NED, and WAT analysis detect flow limitation in your data.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            — a guide to all the channels your PAP machine records and what they mean.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Nightly Leak Rate in AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Load your ResMed SD card data to view leak rate alongside flow limitation and Glasgow
          Index. AirwayLab analyses your data for the patterns that matter — free, open-source,
          and 100% private. Everything in your browser, nothing stored.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/how-to-read-cpap-data"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How to Read CPAP Data
          </Link>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is not a medical device. Data displayed is for informational purposes only.
        Consult your sleep physician for clinical decisions about your therapy.
      </p>
    </article>
  );
}
