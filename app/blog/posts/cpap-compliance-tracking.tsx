import Link from 'next/link';
import { ArrowRight, CheckCircle, HelpCircle, Monitor, Shield, Wifi } from 'lucide-react';

export default function CPAPComplianceTracking() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve recently been prescribed CPAP therapy, you&apos;ve probably heard the word{' '}
        <em>compliance</em> more than once &mdash; from your equipment supplier, your sleep
        specialist, or your insurance company. Here&apos;s what it actually means, how it&apos;s
        tracked, and how you can see your own data.
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold text-amber-400">Medical disclaimer</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          AirwayLab is an informational tool only. Nothing in this article constitutes medical
          advice, diagnostic guidance, or a recommendation to change your therapy settings. Always
          discuss treatment decisions with your qualified healthcare provider.
        </p>
      </div>

      {/* What is CPAP compliance */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What is CPAP compliance?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP compliance refers to how consistently you use your therapy device. The term comes
            primarily from the insurance and clinical world: payers and providers use it to confirm
            that a patient is actually using the equipment they&apos;re being reimbursed for, and
            that therapy is getting enough nightly use to be clinically meaningful.
          </p>
          <p>
            In plain terms: compliance is a record of how many hours you run your machine each
            night.
          </p>
        </div>
      </section>

      {/* Standard requirements */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What are the standard CPAP compliance requirements?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The most commonly cited benchmark in the United States is{' '}
            <strong className="text-foreground">
              4 hours per night for at least 70% of nights
            </strong>{' '}
            over a 30-day period. This threshold comes from CMS (the Centers for Medicare &amp;
            Medicaid Services) and has been widely adopted by private insurers.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">Important caveats</p>
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">Requirements vary by insurer.</strong> Your
                specific plan may have different thresholds or review windows. Always check your
                policy documents or ask your supplier directly.
              </li>
              <li>
                <strong className="text-foreground">Country matters.</strong> The 4hr/70% rule is a
                US-centric benchmark. Requirements in Australia, the UK, Canada, and elsewhere
                differ.
              </li>
              <li>
                <strong className="text-foreground">Initial trial periods are common.</strong> Many
                US insurers require a compliance check at 31&ndash;90 days before they confirm
                ongoing coverage of your device.
              </li>
            </ul>
          </div>
          <p>
            This is general information &mdash; your insurer or clinician is the right source for
            guidance specific to your situation.
          </p>
        </div>
      </section>

      {/* How compliance is tracked */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wifi className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How is CPAP compliance tracked?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your machine logs usage data automatically. How that data gets to your provider or
            insurer depends on your equipment:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Machine display',
                desc: 'Most modern CPAP/BiPAP devices show last-night and 7-day usage summaries directly on screen.',
                color: 'blue',
              },
              {
                label: 'SD card / USB',
                desc: 'Detailed session data is stored locally. You or your provider can read it with software like OSCAR or AirwayLab.',
                color: 'emerald',
              },
              {
                label: 'Built-in wireless modem',
                desc: 'Many newer devices (e.g. AirSense, DreamStation) transmit nightly data automatically to manufacturer cloud portals. Your prescribing provider and/or DME supplier may have access.',
                color: 'violet',
              },
            ].map(({ label, desc, color }) => (
              <div
                key={label}
                className={`rounded-xl border border-${color}-500/20 bg-${color}-500/5 p-4`}
              >
                <p className={`text-sm font-semibold text-${color}-400`}>{label}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            The wireless modem path is typically how formal compliance monitoring works for
            insurance purposes &mdash; the data flows to the provider portal without any action on
            your part.
          </p>
        </div>
      </section>

      {/* Can I see my own data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Can I see my own compliance data?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Yes. Your usage data belongs to you, and several tools let you read it:
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">Machine display</strong> &mdash; a quick glance
              at nightly hours
            </li>
            <li>
              <strong className="text-foreground">OSCAR</strong> &mdash; free, open-source desktop
              software that gives you deep access to your SD card data
            </li>
            <li>
              <strong className="text-foreground">AirwayLab</strong> &mdash; a browser-based tool
              that reads your SD card data locally in your browser, with no uploads. Your data never
              leaves your device. It shows session length alongside AHI, flow limitation, leak rate,
              and other metrics so you can see the full picture, not just hours.
            </li>
          </ul>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Note:</strong> AirwayLab is not a compliance
              monitoring tool for insurance purposes &mdash; it doesn&apos;t report to insurers or
              providers. It&apos;s a way for you to understand your own therapy data.
            </p>
          </div>
        </div>
      </section>

      {/* What is a compliance score */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What is a sleep apnea compliance score?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Some provider portals and DME suppliers summarise compliance as a percentage &mdash;
            often called a <strong className="text-foreground">compliance score</strong> or{' '}
            <strong className="text-foreground">usage score</strong>. It&apos;s typically the
            percentage of nights in a reporting window that met the minimum hours threshold
            (commonly &ge;4 hours).
          </p>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Example</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              If you used your device for 4+ hours on 22 out of 30 nights, that&apos;s a 73%
              compliance score &mdash; just over the common 70% threshold.
            </p>
          </div>
          <p>
            The exact calculation varies by platform. If your insurer or provider uses a specific
            compliance score, ask them how they define and calculate it.
          </p>
        </div>
      </section>

      {/* What if not meeting compliance */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What if I&apos;m not meeting my compliance target?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            First: this is worth discussing with your prescribing clinician, not just your insurer.
            Compliance numbers are a signal, not the whole story.
          </p>
          <p>
            That said, the PAP community commonly discusses several factors that can affect nightly
            usage hours:
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">Mask fit and comfort</strong> &mdash; leaks,
              pressure points, or discomfort are common early reasons people cut sessions short
            </li>
            <li>
              <strong className="text-foreground">Pressure settings</strong> &mdash; some users find
              their prescribed pressure uncomfortable, particularly on exhalation; settings like EPR
              (ResMed) or Flex (Philips) adjust exhalation pressure, which some users report affects
              their comfort
            </li>
            <li>
              <strong className="text-foreground">Aerophagia (swallowed air)</strong> &mdash; can
              cause bloating or discomfort, especially at higher pressures
            </li>
            <li>
              <strong className="text-foreground">Claustrophobia or anxiety</strong> &mdash; not
              uncommon with full-face masks
            </li>
          </ul>
          <p>
            Tools like AirwayLab let you see your session data alongside events like flow
            limitations and mask leaks, which can be useful context when talking to your clinician
            or titration specialist.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-bold sm:text-xl">View your usage data</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Curious what your CPAP compliance hours and therapy data actually look like? AirwayLab
          works in your browser, reads your SD card locally, and requires no account for core
          features.
        </p>
        <Link
          href="/analyze"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open AirwayLab <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </article>
  );
}
