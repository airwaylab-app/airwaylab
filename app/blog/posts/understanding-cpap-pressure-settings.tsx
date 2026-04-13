import Link from 'next/link';
import {
  Gauge,
  SlidersHorizontal,
  ArrowUpDown,
  Timer,
  BarChart3,
  Monitor,
  Stethoscope,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export default function UnderstandingCPAPPressureSettingsPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve ever peeked at your CPAP settings and seen a number like
        &ldquo;8.4 cmH&#x2082;O&rdquo; and wondered what it actually means for your sleep —
        you&apos;re in good company. Pressure settings are one of the most common points of
        confusion for PAP users, and the clinical language around them doesn&apos;t help.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This is a straightforward explanation of what those numbers mean, how different pressure
        modes work, and how to look at your own data to understand what&apos;s happening during
        the night. It&apos;s not medical advice — your sleep specialist is the right person to
        make any adjustments — but understanding the basics means you can have a much more useful
        conversation with them.
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-sm font-medium text-amber-400">Medical disclaimer</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This article is for educational purposes only. Nothing here constitutes a medical
          recommendation or clinical guidance. Always discuss changes to your therapy settings
          with your prescribing clinician.
        </p>
      </div>

      {/* What Does CPAP Pressure Actually Mean? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Gauge className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Does CPAP Pressure Actually Mean?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP stands for Continuous Positive Airway Pressure. The pressure your machine
            delivers is measured in centimetres of water (cmH&#x2082;O) — a unit that reflects
            how much force the airflow exerts. A setting of 10 cmH&#x2082;O means the machine is
            pushing air at a pressure equivalent to the weight of a 10-centimetre column of water.
          </p>
          <p>
            For most people, prescribed pressures fall somewhere in the range of 4 to
            20 cmH&#x2082;O. The right pressure for you depends on the anatomy of your airway,
            your sleep position, your weight, and how your airway behaves at different stages of
            sleep. None of those factors are visible to the machine — which is why the mode your
            machine uses to find and hold that pressure matters a lot.
          </p>
        </div>
      </section>

      {/* Fixed Pressure vs. Auto-Adjusting (APAP) */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Fixed Pressure vs. Auto-Adjusting (APAP)
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The most important distinction in pressure modes is whether your machine uses a{' '}
            <strong className="text-foreground">fixed</strong> pressure or an{' '}
            <strong className="text-foreground">auto-adjusting</strong> (APAP) pressure.
          </p>
          <p>
            <strong className="text-foreground">Fixed pressure (CPAP mode):</strong> Your machine
            delivers one constant pressure all night, every night. If your prescription says
            10 cmH&#x2082;O, the machine runs at 10 cmH&#x2082;O from the moment you put the
            mask on until you take it off. Simple, predictable, and appropriate for many people —
            especially those with a well-characterised, stable airway.
          </p>
          <p>
            <strong className="text-foreground">Auto-adjusting pressure (APAP mode):</strong> Your
            machine continuously monitors your breathing and adjusts pressure within a range you
            (or your clinician) set. If it detects you&apos;re breathing comfortably at
            7 cmH&#x2082;O, it backs off to 7. If it detects flow limitation or an event, it
            ramps up. The machine is essentially running a real-time feedback loop throughout the
            night.
          </p>
          <p>
            Neither mode is inherently better — the right one depends on your airway&apos;s
            behaviour. Some people do better with the stability of fixed pressure; others benefit
            from the machine&apos;s ability to compensate for positional changes or REM-related
            variability. Your clinician chose your mode based on your titration data and history.
          </p>
        </div>
      </section>

      {/* BiPAP Pressure: EPAP, IPAP, and Pressure Support */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ArrowUpDown className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            BiPAP Pressure: EPAP, IPAP, and Pressure Support
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you use a BiPAP (Bilevel PAP) machine, you have two pressure numbers instead of
            one:
          </p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                <strong className="text-foreground">EPAP</strong> (Expiratory Positive Airway
                Pressure): the pressure when you breathe <em>out</em>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                <strong className="text-foreground">IPAP</strong> (Inspiratory Positive Airway
                Pressure): the pressure when you breathe <em>in</em>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                <strong className="text-foreground">Pressure support</strong>: the difference
                between IPAP and EPAP (IPAP − EPAP)
              </span>
            </li>
          </ul>
          <p>
            BiPAP is often prescribed when someone finds it hard to exhale against continuous
            pressure, or when there&apos;s a component of breathing effort or hypoventilation
            involved. The pressure support number — that IPAP/EPAP gap — is often where the
            interesting therapy work happens. A wider pressure support means the machine is doing
            more of the breathing work on each inhale.
          </p>
        </div>
      </section>

      {/* Pressure Ramp: The Gentle Start */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Timer className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Pressure Ramp: The Gentle Start
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Most CPAP and APAP machines have a <strong className="text-foreground">ramp</strong>{' '}
            feature — a period at the start of the session where the machine runs at a lower
            pressure and gradually increases to your therapeutic pressure. This makes it easier to
            fall asleep before the full pressure kicks in.
          </p>
          <p>
            The ramp duration (often 5–45 minutes) and starting pressure are adjustable. Some
            people find a long ramp helpful; others prefer to start at full pressure immediately.
            If you&apos;re waking up partway through the ramp while pressure hasn&apos;t yet
            reached your prescribed level, that&apos;s worth discussing with your clinician.
          </p>
          <p>
            In your nightly data, you can usually spot the ramp period as a low, rising pressure
            line at the start of the session.
          </p>
        </div>
      </section>

      {/* How Pressure Relates to Your Therapy Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How Pressure Relates to Your Therapy Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here&apos;s where things get interesting if you like looking at your data (and if
            you&apos;re reading this, you probably do).
          </p>
          <p>
            Your machine&apos;s pressure doesn&apos;t exist in isolation — it&apos;s in constant
            conversation with your breathing patterns. The key things to look at together:
          </p>
          <div className="space-y-4 rounded-xl border border-border/50 bg-card/50 p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                AHI (Apnoea-Hypopnea Index)
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The number of scored breathing events per hour. AHI is one of several metrics
                clinicians use when evaluating therapy, but it&apos;s not the whole picture. Some
                events that affect sleep quality aren&apos;t captured in AHI.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The shape of your breath — specifically the flattening that happens when your
                airway is partially narrowed. Flow limitation can be present even when AHI is low,
                and it&apos;s associated with RERAs (Respiratory Effort-Related Arousals), which
                can fragment sleep without showing up as full apnoeas.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">RERAs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Brief arousals driven by respiratory effort — often the missing piece when
                someone&apos;s AHI looks good but they&apos;re still tired. RERAs are visible in
                detailed flow waveform data, not just summary statistics.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Pressure percentiles</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your machine records pressure across the night. The 90th or 95th percentile
                pressure — the pressure at or below which you spent 90–95% of the night — tells
                you where your APAP machine was spending most of its time. If that number is near
                your maximum setting, your machine may be constrained.
              </p>
            </div>
          </div>
          <p>
            These signals together give a much richer picture than AHI alone. Understanding them
            helps you have a more informed conversation with your clinician.
          </p>
        </div>
      </section>

      {/* Reading Your Pressure Data in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Reading Your Pressure Data in AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads your CPAP data directly from your device&apos;s SD card in your
            browser — your raw waveform data never leaves your device. That matters for pressure
            analysis because the interesting signals are in the detailed waveform, not just the
            summary statistics your machine&apos;s built-in display shows you.
          </p>
          <p>
            When you{' '}
            <Link href="/analyze" className="text-primary underline underline-offset-2 hover:text-primary/80">
              upload your data to AirwayLab
            </Link>
            , you&apos;ll see your pressure trends across the night, alongside flow limitation
            scoring, RERA scoring, and AHI breakdown. If you use an APAP machine, you can see
            exactly how often your machine was adjusting pressure and what it was responding to.
          </p>
          <p>
            This is the same underlying data that{' '}
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              OSCAR
            </a>{' '}
            displays — AirwayLab is a complement to OSCAR, not a replacement. OSCAR is a powerful
            desktop tool; AirwayLab runs entirely in your browser and focuses on the analysis
            layer on top of the raw data.
          </p>
          <p>
            For a guide on getting your data off your device, see our{' '}
            <Link
              href="/blog/resmed-sd-card-browser-analysis"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              ResMed SD card browser analysis guide
            </Link>
            . If you want to understand what AirwayLab is measuring and why,{' '}
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              how to read your CPAP data
            </Link>{' '}
            is a good next read.
          </p>
        </div>
      </section>

      {/* When to Talk to Your Sleep Specialist */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to Talk to Your Sleep Specialist
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding your data is genuinely useful — it helps you notice patterns and ask
            better questions. But adjusting your pressure settings is your clinician&apos;s call,
            not yours. If you&apos;re curious about any of the following patterns, your clinician
            can provide context:
          </p>
          <ul className="space-y-2 pl-1">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">
                  Consistently high 90th-percentile pressure
                </strong>{' '}
                on APAP — your machine is spending more time near its upper pressure limit
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Persistent flow limitation</strong> even with
                a low AHI — a pattern your clinician may find informative
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Frequent RERA events</strong> — can cause
                sleep fragmentation even when AHI is low
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Mask leak spikes</strong> — can affect how
                accurately the machine reads your breathing and adjusts pressure
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">
                  Symptoms that don&apos;t match your data
                </strong>{' '}
                — your clinician can look at factors beyond summary statistics
              </span>
            </li>
          </ul>
          <p>
            The goal of looking at your data isn&apos;t to self-prescribe. It&apos;s to walk into
            your next appointment with something concrete — &ldquo;here&apos;s what I&apos;m
            seeing, here&apos;s when it happens, what does this tell you?&rdquo; That&apos;s a
            better conversation than &ldquo;I&apos;m still tired.&rdquo;
          </p>
        </div>
      </section>

      {/* What the Numbers Don't Tell You */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-orange-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What the Numbers Don&apos;t Tell You
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            One thing worth saying plainly: your prescribed pressure is not a measure of how
            severe your sleep apnoea is. A higher pressure doesn&apos;t mean a worse condition. It
            means your airway needs more support to stay open — which is influenced by anatomy,
            position, weight, nasal congestion, alcohol, and many other factors that change night
            to night.
          </p>
          <p>
            The number on your machine is a starting point, not a verdict. Your data is the story
            of what&apos;s actually happening.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          AirwayLab is free to use and always will be. The analysis runs in your browser — your
          health data stays on your device.
        </p>
        <Link
          href="/analyze"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Upload your data and see your pressure trends
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
