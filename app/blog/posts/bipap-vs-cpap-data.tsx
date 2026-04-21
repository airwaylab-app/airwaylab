import Link from 'next/link';
import { ArrowRight, Activity, BarChart2, BookOpen, HardDrive, Info, Stethoscope } from 'lucide-react';

export default function BiPAPVsCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve recently switched from CPAP to BiPAP &mdash; or you&apos;re trying to make
        sense of a data file that suddenly has twice as many pressure columns &mdash; you&apos;re in
        the right place. BiPAP vs CPAP data isn&apos;t just a cosmetic difference. The underlying
        therapy mechanics are distinct, which means the data tells a different story.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This post walks through what changes in your data, what stays the same, and how tools like
        OSCAR and AirwayLab can help you read it all.
      </p>

      {/* What makes BiPAP data different */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What makes BiPAP data different from CPAP?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP delivers one continuous pressure &mdash; say, 10 cmH&#8322;O &mdash; throughout
            every breath. The machine pushes air at that pressure whether you&apos;re inhaling or
            exhaling.
          </p>
          <p>BiPAP works differently. It has two distinct pressure settings:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">
                  IPAP (Inspiratory Positive Airway Pressure)
                </strong>{' '}
                &mdash; the higher pressure delivered when you inhale
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">
                  EPAP (Expiratory Positive Airway Pressure)
                </strong>{' '}
                &mdash; the lower pressure during exhalation
              </span>
            </li>
          </ul>
          <p>
            The gap between them is called{' '}
            <strong className="text-foreground">pressure support</strong> (PS = IPAP &minus; EPAP).
            If your BiPAP is set to IPAP&nbsp;14&nbsp;/&nbsp;EPAP&nbsp;8, your pressure support is
            6&nbsp;cmH&#8322;O.
          </p>
          <p>
            That support actively assists your breathing effort on every inhale. This is why BiPAP
            data has more to look at &mdash; the machine is logging more interactions with your
            breathing pattern.
          </p>
        </div>
      </section>

      {/* Key metrics */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Key metrics in BiPAP data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Some things look exactly the same as CPAP:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'AHI',
                desc: 'Still your headline number: apneas and hypopneas per hour.',
              },
              {
                label: 'Leak rate',
                desc: 'Unintentional air escaping from the mask or via mouth breathing.',
              },
              {
                label: 'Flow waveform',
                desc: 'The shape of each breath, useful for spotting flow limitation and RERAs.',
              },
              {
                label: 'Snore index',
                desc: 'Vibration-based snore detection (device-dependent).',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-2">What&apos;s new or more prominent in BiPAP data:</p>
          <ul className="ml-4 space-y-2">
            {[
              {
                term: 'IPAP and EPAP traces',
                detail:
                  'Instead of one pressure line you get two, plus a pressure support channel on most modern devices.',
              },
              {
                term: 'Tidal volume',
                detail:
                  'The volume of air per breath (mL). More clinically relevant here because pressure support directly affects it.',
              },
              {
                term: 'Minute ventilation',
                detail:
                  'Breaths per minute \u00d7 tidal volume; shows total breathing work across the session.',
              },
              {
                term: 'Respiratory rate',
                detail: 'Often logged more granularly on BiPAP machines.',
              },
              {
                term: 'Ti (inspiratory time)',
                detail:
                  'How long each inhale lasts; useful for spotting breathing pattern irregularities.',
              },
            ].map(({ term, detail }) => (
              <li key={term} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-foreground">{term}</strong> &mdash; {detail}
                </span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">
              Not all BiPAP machines log all of these. ResMed AirCurve devices export the richest
              data; some older or simpler BiPAP units produce only basic summary statistics.
            </p>
          </div>
        </div>
      </section>

      {/* What the extra data points mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the extra data points mean</h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {/* Pressure support trends */}
          <div>
            <h3 className="text-base font-semibold text-foreground">Pressure support trends</h3>
            <p className="mt-2">
              If your device auto-adjusts IPAP while holding EPAP fixed (as in ASV or BiPAP Auto
              modes), you&apos;ll see IPAP vary across the night. A stable, narrow IPAP trace means
              your breathing was regular; a wide, shifting trace means the machine was working
              harder to compensate for irregular breathing. Neither reading is a diagnosis &mdash;
              it&apos;s context.
            </p>
          </div>
          {/* Tidal volume */}
          <div>
            <h3 className="text-base font-semibold text-foreground">Tidal volume</h3>
            <p className="mt-2">
              A tidal volume in the 400&ndash;600&nbsp;mL range is typical at rest for many adults,
              but what&apos;s relevant for your data depends on your pressure support setting and
              your own respiratory mechanics. In AirwayLab, tidal volume appears as a time-series
              alongside your pressure trace &mdash; useful for spotting nights where volumes ran low
              or unusually high compared to your own baseline.
            </p>
          </div>
          {/* Flow waveform and flow limitation — COMPLIANCE-APPROVED TEXT */}
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Flow waveform and flow limitation
            </h3>
            <p className="mt-2">
              Flow limitation applies to both CPAP and BiPAP, but pressure support makes it more
              visible in the data. A clipped or flattened peak on the inspiratory flow waveform is
              called <em>flow limitation</em> &mdash; a data pattern you may see flagged in OSCAR or
              AirwayLab. Flow limitation scores may vary across sessions depending on pressure
              support settings and other factors. If you notice this pattern in your data,
              that&apos;s a specific observation to bring to your next appointment.
            </p>
          </div>
        </div>
      </section>

      {/* Viewing BiPAP data in OSCAR and AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Viewing BiPAP data in OSCAR and AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div>
            <h3 className="text-base font-semibold text-foreground">OSCAR</h3>
            <p className="mt-2">
              OSCAR handles BiPAP data well and has been the community standard for years. It
              displays IPAP/EPAP pressure graphs, leak rate, flow waveform, tidal volume (where the
              device logs it), and event flags. If you&apos;re familiar with OSCAR for CPAP,
              you&apos;ll find the same interface with additional pressure channels in the session
              view.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">AirwayLab</h3>
            <p className="mt-2">
              AirwayLab reads the same SD card data OSCAR uses and is built to complement it &mdash;
              not replace it. A few things it adds for BiPAP users:
            </p>
            <ul className="ml-4 mt-3 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong className="text-foreground">Pressure support visualisation</strong>{' '}
                  &mdash; see the IPAP/EPAP gap across the full night at a glance
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <Link
                    href="/glossary/flow-limitation"
                    className="text-foreground hover:text-primary"
                  >
                    Flow limitation scoring
                  </Link>{' '}
                  alongside your dual-pressure trace
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  RERAs, breathing pattern irregularities, and AHI, all in your browser with your
                  data staying local
                </span>
              </li>
            </ul>
            <p className="mt-3">
              AirwayLab is free and always will be. It runs entirely in your browser &mdash; your
              data never leaves your device.
            </p>
          </div>
        </div>
      </section>

      {/* When to discuss with your clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to discuss your BiPAP data with your clinician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            BiPAP data is information, not a diagnosis. If you notice patterns that concern you
            &mdash; persistent flow limitation, low tidal volumes, high AHI despite therapy, or
            large nightly pressure auto-adjustments &mdash; those are observations worth bringing to
            your prescribing clinician or sleep specialist.
          </p>
          <p>
            &ldquo;I pulled my SD card data and noticed X&rdquo; is a much more productive starting
            point for a clinical conversation than &ldquo;I don&apos;t think my therapy is
            working.&rdquo; Your data gives a clinician something concrete to look at.
          </p>
          <p>
            AirwayLab can generate a session summary you can print or screenshot to bring to an
            appointment. Always discuss any therapy changes with the clinician who manages your
            prescription.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently asked questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'Can AirwayLab read BiPAP data the same as CPAP data?',
              a: 'Yes. AirwayLab reads the same SD card format OSCAR uses and supports ResMed AirCurve and compatible BiPAP devices.',
            },
            {
              q: 'What is pressure support in BiPAP data?',
              a: 'Pressure support is the difference between IPAP and EPAP — the extra pressure applied to assist each inhale.',
            },
            {
              q: 'Does tidal volume appear in all BiPAP data?',
              a: 'It depends on the device. ResMed AirCurve devices log tidal volume in SD card data; some other BiPAP machines do not export it.',
            },
            {
              q: 'What does a shifting IPAP trace mean in auto BiPAP mode?',
              a: "It means the machine adjusted the inspiratory pressure during the night — typically in response to detected breathing changes. This is information to discuss with your clinician, not a cause for alarm on its own.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to look at your BiPAP data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data on AirwayLab &mdash; no account needed, nothing uploaded, works
          entirely in your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse your BiPAP data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/analyze?sample=bipap"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            See a sample analysis
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-8 rounded-xl border border-border/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <em>
          AirwayLab is an informational tool. Nothing in this article or in AirwayLab&apos;s output
          constitutes medical advice, a clinical diagnosis, or a recommendation to change your
          therapy settings. Always discuss therapy decisions with your prescribing clinician or
          sleep specialist.
        </em>
      </p>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/bipap-data-analysis-aircurve-10"
              className="text-primary hover:text-primary/80"
            >
              BiPAP Data Analysis: How to Read Your AirCurve 10 Data for Free
            </Link>{' '}
            &mdash; step-by-step guide to loading AirCurve EDF files.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            &mdash; full guide to PAP data metrics including AHI and flow limitation.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation in Your PAP Data
            </Link>{' '}
            &mdash; the hidden metric beyond AHI, explained.
          </p>
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Glossary</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/glossary/flow-limitation" className="text-primary hover:text-primary/80">
              Flow limitation
            </Link>{' '}
            &mdash; what it means and how AirwayLab measures it.
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
