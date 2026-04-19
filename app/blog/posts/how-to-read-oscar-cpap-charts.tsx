import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Droplets,
  HardDrive,
  Heart,
  Lightbulb,
  MonitorSmartphone,
  Wind,
} from 'lucide-react';

export default function HowToReadOSCARCPAPChartsPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You downloaded OSCAR, opened it up, and now you&apos;re staring at a wall of colourful
        squiggly lines wondering what any of it means. You&apos;re not alone — almost every new
        CPAP user goes through this. OSCAR is one of the most powerful tools available for
        understanding your PAP therapy data, but it hands you the raw detail with very little
        explanation.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide walks through how to read OSCAR CPAP charts panel by panel, in plain English,
        so you can start making sense of what your machine recorded last night.
      </p>

      {/* Medical Disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          The information in this article is for educational and informational purposes only. It is
          not a substitute for professional medical advice, diagnosis, or treatment. Always discuss
          changes to your therapy with your prescribing clinician before acting on anything you see
          in your data.
        </p>
      </div>

      {/* What OSCAR Is */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What OSCAR Is (and Why PAP Users Use It)
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR — Open Source CPAP Analysis Reporter — is a free, open-source desktop application
            that reads the detailed data stored on your CPAP or BiPAP machine&apos;s SD card. Your
            machine&apos;s built-in app often shows you a single nightly AHI number. OSCAR shows
            you everything underneath that number: every breathing event, every pressure change,
            every significant leak, minute by minute across the whole night.
          </p>
          <p>
            That granularity matters. Two nights can have the same AHI but completely different
            stories. One might be a handful of positional obstructive events in the first REM cycle;
            the other might be scattered flow limitations and RERAs throughout the whole night. You
            can only see that difference when you read the charts.
          </p>
        </div>
      </section>

      {/* Main OSCAR Panels */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Main OSCAR Panels</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you open a daily summary in OSCAR, you&apos;ll see several chart panels stacked
            vertically. Each panel shares the same horizontal time axis — the night runs left to
            right. Here are the most important ones:
          </p>
        </div>

        {/* AHI / Events */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <h3 className="text-lg font-bold text-foreground">1. AHI / Events</h3>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              This panel shows your <strong className="text-foreground">apnea-hypopnea events</strong>{' '}
              plotted against time. Each dot or bar represents a detected breathing interruption.
              OSCAR colour-codes events by type:
            </p>
            <div className="space-y-2">
              {[
                {
                  color: 'bg-teal-400',
                  label: 'OA (Obstructive Apnea)',
                  desc: 'A full stop in airflow caused by the airway physically collapsing. Usually green or teal.',
                },
                {
                  color: 'bg-yellow-400',
                  label: 'H (Hypopnea)',
                  desc: "A partial reduction in airflow — breathing is happening, but significantly reduced. Usually yellow.",
                },
                {
                  color: 'bg-blue-400',
                  label: 'CA (Central Apnea)',
                  desc: 'A pause in breathing where the airway is open but the brain momentarily stops sending the signal to breathe. Usually blue. Central events during CPAP therapy can sometimes be treatment-emergent, which is worth discussing with your clinician.',
                },
                {
                  color: 'bg-pink-400',
                  label: 'FL (Flow Limitation)',
                  desc: 'Not an apnea, but the airway is partially narrowed, creating a flattened-top shape in the flow waveform. Usually shown in a pink/salmon colour. Your clinician can interpret flow limitation counts in the context of your specific prescription.',
                },
                {
                  color: 'bg-orange-400',
                  label: 'RERA (Respiratory Effort-Related Arousal)',
                  desc: "A sequence of flow limitations that ends in a micro-arousal — your brain waking you enough to restore airflow without fully waking you. RERAs don't count toward the official AHI but can significantly fragment sleep quality.",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${item.color}`} />
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p>
              Looking at the <strong className="text-foreground">distribution</strong> of events
              across the night is as important as the total count. A cluster of OAs in the early
              morning sometimes correlates with sleeping position. Different event distributions
              across the night represent different data patterns.
            </p>
          </div>
        </div>

        {/* Pressure */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <h3 className="text-lg font-bold text-foreground">2. Pressure</h3>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              The pressure panel shows the pressure your machine delivered in cm H₂O over the
              night. If you&apos;re on APAP (automatic CPAP), you&apos;ll see the pressure trace
              rising and falling as the machine responds to your breathing. Fixed-pressure CPAP will
              show a flat line. BiPAP users will see two lines — IPAP (inhale pressure) and EPAP
              (exhale pressure).
            </p>
            <p>Things to notice:</p>
            <div className="space-y-2">
              {[
                {
                  label: 'Pressure ceiling',
                  desc: "If your machine is frequently reaching its maximum allowed pressure setting, that pattern is visible in OSCAR's pressure trace.",
                },
                {
                  label: 'Pressure hunting',
                  desc: 'Rapid, erratic pressure fluctuations are sometimes associated with leak artefact in the data.',
                },
                {
                  label: 'Correlation with events',
                  desc: 'Check whether your events cluster at moments of lower pressure or just after a pressure spike.',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leak Rate */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-amber-400" />
            <h3 className="text-lg font-bold text-foreground">3. Leak Rate</h3>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              The leak panel shows total mask leak in litres per minute. A small amount of
              intentional leak is by design — masks have vent ports that continuously exhaust CO₂.
              What you&apos;re watching for is{' '}
              <strong className="text-foreground">unintentional leak</strong> above your
              mask&apos;s design threshold.
            </p>
            <p>
              High leak (typically above 24 L/min for most masks, but check your specific mask
              specs) means some of the pressure you&apos;re supposed to be getting isn&apos;t
              reaching your airway. It can also cause your APAP machine to misread your breathing
              and respond poorly. Many unexplained AHI spikes trace back to positional leak —
              rolling onto your side and creating a gap at the mask seal.
            </p>
            <p>Look for:</p>
            <div className="space-y-2">
              {[
                {
                  label: 'Sustained high leak',
                  desc: 'Consistently elevated leak throughout the night suggests a fit issue — mask size, headgear adjustment, or a worn-out cushion.',
                },
                {
                  label: 'Intermittent spikes',
                  desc: 'Brief leak spikes often correspond to swallowing, changing position, or an event.',
                },
                {
                  label: 'Large mouth leak',
                  desc: 'If you use a nasal or nasal pillow mask and breathe through your mouth during the night, that shows up as sustained high leak.',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flow Rate */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-400" />
            <h3 className="text-lg font-bold text-foreground">4. Flow Rate</h3>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              The flow rate panel is the raw breathing waveform — it shows actual airflow in and
              out of your lungs throughout the night. This is the richest panel in OSCAR, and also
              the most detailed.
            </p>
            <p>
              Each breath appears as a wave: inhalation peaks upward, exhalation dips downward. On
              a healthy breath with adequate pressure, the inhalation has a smooth, rounded peak.{' '}
              <strong className="text-foreground">Flow limitation</strong> appears as a flattened
              top on the inhalation — the curve is cut short before it reaches a natural peak, a
              pattern the machine flags as flow limitation.
            </p>
            <p>
              Zooming in with OSCAR&apos;s time-range selector (drag to zoom on the time axis) lets
              you inspect individual breath shapes. This is where reading OSCAR really pays off —
              you can see the subtle deterioration in breath shape in the minutes before an event,
              or confirm that an apparent event flag was actually a swallow artefact.
            </p>
          </div>
        </div>

        {/* SpO2 and Pulse */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <h3 className="text-lg font-bold text-foreground">
              5. SpO₂ and Pulse (if available)
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              If your machine has a pulse oximeter or you&apos;ve connected one, OSCAR plots your
              blood oxygen saturation (SpO₂) and pulse rate. These panels are informational
              context, not diagnostic tools. Large drops in SpO₂ that correlate with event clusters
              are the kind of thing worth noting for your next clinic appointment.
            </p>
          </div>
        </div>
      </section>

      {/* AirwayLab Comparison */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <MonitorSmartphone className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab Shows the Same Data — in Your Browser
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If the OSCAR installation process put you off, or if you want a second way to look at
            your data,{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              AirwayLab
            </Link>{' '}
            reads the same SD card files directly in your browser. No software to install, and{' '}
            <strong className="text-foreground">your data never leaves your browser</strong> — it&apos;s
            processed locally, in the same tab.
          </p>
          <p>
            AirwayLab presents your AHI breakdown, flow limitation density, RERA index, leak
            statistics, and pressure summary in a single-page view alongside trend charts across
            multiple nights. The flow waveform viewer lets you zoom into individual breathing
            sequences the same way OSCAR does.
          </p>
          <p>
            The two tools are genuinely complementary. OSCAR gives you fine-grained per-breath
            inspection and a desktop environment that&apos;s hard to beat for deep dives. AirwayLab
            gives you an instant overview without installation friction, makes multi-night trends
            easy to scan, and works on any device — including the laptop you bring to a clinic
            appointment.
          </p>
        </div>
      </section>

      {/* Practical Reading Workflow */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">A Practical Reading Workflow</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you open a night in OSCAR (or in AirwayLab), try this sequence:
          </p>
          <div className="space-y-3">
            {[
              {
                step: '1',
                label: 'Start with the AHI panel',
                desc: "What's the total? Where are events clustered? Any pattern by time of night?",
              },
              {
                step: '2',
                label: 'Check leak rate',
                desc: 'Rule out a leak-driven false event count before digging into event types.',
              },
              {
                step: '3',
                label: 'Look at the pressure trace',
                desc: 'Was the machine working hard? Did it hit its ceiling?',
              },
              {
                step: '4',
                label: 'Zoom into event clusters',
                desc: "Switch to the flow rate panel and zoom into a 5–10 minute window around a cluster. What does the breath shape look like in the lead-up?",
              },
              {
                step: '5',
                label: 'Note FL and RERA patterns',
                desc: 'Even if your AHI looks reasonable, high flow limitation or RERA counts are additional data points beyond the AHI number.',
              },
              {
                step: '6',
                label: 'Bring a screenshot or AirwayLab summary to your clinician',
                desc: 'Your data supports the conversation — your clinician makes the call.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 rounded-xl border border-border/50 p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* When to Talk to Your Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">When to Talk to Your Clinician</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Reading your OSCAR charts is about understanding your data, not about treating yourself.
            If you&apos;re seeing:
          </p>
          <div className="space-y-2">
            {[
              'Consistently elevated AHI across multiple nights',
              'High counts of central apneas',
              'Flow limitation or RERA counts that remain elevated across multiple nights',
              'Unexplained SpO₂ dips',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-xl border border-border/50 p-4">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
          <p>
            ...those are things to bring to your prescribing clinician or sleep technologist, not
            things to self-adjust around. Share your data — both OSCAR screenshots and an{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              AirwayLab summary
            </Link>{' '}
            are easy to attach to a patient portal message.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Read Your CPAP Data in Your Browser</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data to AirwayLab and see your breathing patterns the same way OSCAR
          shows them — free, in your browser, and with your data staying on your device.
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

      {/* Related articles */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              How to Read Your CPAP Data
            </Link>{' '}
            — why AHI isn&apos;t the whole story and what metrics to look at next.
          </p>
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>{' '}
            — what each tool does best and how to use both together.
          </p>
          <p>
            <Link href="/blog/what-is-flow-limitation-cpap" className="text-primary hover:text-primary/80">
              What Is Flow Limitation on CPAP?
            </Link>{' '}
            — understanding the flattened waveform and what it means.
          </p>
        </div>
      </section>
    </article>
  );
}
