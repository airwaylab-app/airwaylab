import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  Info,
  Shield,
} from 'lucide-react';

export default function CPAPDataReportWhatDoctorSees() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If your doctor or insurance company has asked for a &quot;CPAP compliance report&quot; and
        you&apos;ve stared at the numbers wondering what any of it means — you&apos;re not alone.
        Most CPAP users are handed a machine, told to use it, and then asked months later to prove
        they&apos;ve been using it correctly. Nobody explains the numbers.
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This article walks you through exactly what&apos;s in a{' '}
        <strong className="text-foreground">CPAP data report</strong>, what each metric is
        measuring, and what &quot;compliance&quot; actually means in the context of insurance and
        clinical follow-up.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is a
          data-visualization tool, not a medical device. Nothing in this article constitutes medical
          advice. Always discuss your therapy data and any questions about your treatment with your
          prescribing physician or sleep specialist.
        </p>
      </div>

      {/* What Is a CPAP Compliance Report */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a CPAP Compliance Report?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A CPAP compliance report is a summary of how you&apos;ve been using your CPAP or BiPAP
            machine, pulled from the data stored on your device&apos;s SD card or transmitted via
            the manufacturer&apos;s cloud app (like ResMed&apos;s myAir or Philips DreamMapper).
          </p>
          <p>
            The report captures session-level data: when you used the machine, for how long, and
            how the machine behaved while you were asleep. Most devices record this data
            automatically — you don&apos;t need to do anything to generate it.
          </p>
          <p>
            Your doctor uses this data at follow-up appointments to see how therapy is going. Your
            insurance company uses a subset of it to confirm that you&apos;re meeting coverage
            requirements.
          </p>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Key Metrics in Your Report</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Here&apos;s what you&apos;ll actually see, and what each number represents.</p>

          {/* AHI */}
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">AHI (Apnea-Hypopnea Index)</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                AHI is the number of apneas (complete pauses in breathing) and hypopneas (partial
                reductions in airflow) recorded per hour of sleep, as detected by your CPAP device.
              </p>
              <p>
                Your CPAP machine estimates AHI based on the airflow it measures through the mask
                circuit. Device-reported AHI is a machine estimate — not the same as a
                lab-measured AHI from a polysomnography study. The machine is using pressure and
                flow data to infer events, which is useful context but not a clinical diagnosis.
              </p>
              <p>
                Your device reports a <em>residual</em> AHI — the events recorded while CPAP
                therapy was running. A lower residual AHI is the figure your insurer reviews for
                coverage purposes — your clinician can put that number in context.
              </p>
            </div>
          </div>

          {/* Usage Hours */}
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">Usage Hours</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                This is the simplest metric: how many hours per night you actually used the machine.
                Most devices log usage from when air starts flowing to when it stops.
              </p>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-500">Why this matters for insurance</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  US insurance companies and many employer wellness programs typically require at
                  least 4 hours of use per night on at least 70% of nights over a 30-day period.
                  This is the Medicare compliance threshold, and most private insurers follow a
                  similar standard. If usage hours fall below this threshold, coverage for CPAP
                  supplies or replacement equipment may be affected. If your data is borderline,
                  talk to your DME supplier and prescribing physician.
                </p>
              </div>
            </div>
          </div>

          {/* Mask Leak Rate */}
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">Mask Leak Rate</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                Your mask needs to maintain a seal for the device to work as intended.
                &quot;Unintentional leak&quot; (or &quot;large mask leak&quot;) refers to air
                escaping around the mask seal — not the intentional exhalation vents built into
                every CPAP mask.
              </p>
              <p>
                Leak rate is measured in liters per minute (L/min). Your device manual or clinical
                documentation will specify the threshold for your particular model. High leak data
                in your report can prompt your doctor to look at mask fit or recommend a refitting
                appointment.
              </p>
            </div>
          </div>

          {/* Events Per Hour */}
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">Events Per Hour / Event Breakdown</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                Some reports break down residual AHI further — separating obstructive apneas (OA),
                central apneas (CA), hypopneas (H), and flow limitations. BiPAP devices often also
                report RERAs (respiratory effort-related arousals).
              </p>
              <p>
                These breakdowns describe the character of any residual breathing disruptions
                recorded during the session. Interpreting what that breakdown means clinically —
                and whether any follow-up is needed — is a conversation for you and your sleep
                physician.
              </p>
            </div>
          </div>

          {/* Pressure Data */}
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">Pressure Data</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>
                If you&apos;re on a fixed-pressure CPAP, your prescribed pressure is constant and
                won&apos;t vary night to night. If you&apos;re on APAP (auto-adjusting), your
                report will show the pressure range the device used — typically the 95th percentile
                (P95) and median pressure. This gives your doctor a record of how the machine was
                responding on a nightly basis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Compliance */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What &quot;Compliance&quot; Actually Means for Insurance
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The word &quot;compliance&quot; gets used in two ways, and it&apos;s worth keeping them
            separate.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Insurance compliance</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mechanical: did you use the machine enough? The US standard is at least 4 hours of
                use per night, on at least 70% of nights, measured over any 30-consecutive-day
                period. This threshold is the Medicare benchmark, and most private insurers use the
                same or similar standard. Compliance is typically verified 90 days after your
                initial CPAP setup. Ongoing coverage for resupply and equipment renewals can depend
                on meeting this threshold.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Clinical compliance</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A broader term your doctor uses — it refers to the overall picture of how therapy
                is going: AHI trends over time, leak patterns, symptoms, how you feel. It involves
                more than just hours logged.
              </p>
            </div>
          </div>
          <p>
            If you&apos;re worried about your insurance status, the right first call is to your DME
            (durable medical equipment) supplier and your prescribing clinician. They have access
            to your full compliance record and can help you navigate coverage requirements.
          </p>
        </div>
      </section>

      {/* How to Pull Your Own Report */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to Pull Your Own Compliance Report</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            You don&apos;t need to wait for your doctor to access this data. Both major
            manufacturers offer ways to view your own summary.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                ResMed devices (AirSense 10, AirSense 11, AirCurve)
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                <li>
                  Log in to myAir (resmed.com/myair) — usage hours, AHI, and leak data are
                  displayed on your dashboard
                </li>
                <li>
                  For more detailed data, export your SD card and load it into OSCAR or AirwayLab
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Philips Respironics devices (DreamStation, System One)
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                <li>DreamMapper provides a basic cloud dashboard</li>
                <li>
                  For detailed session data, OSCAR (free, open-source) reads Philips SD cards
                </li>
              </ul>
            </div>
          </div>
          <p>
            For the most granular data — flow waveforms, pressure graphs, RERA counts — the SD
            card route gives you the full record of what the machine captured.
          </p>
        </div>
      </section>

      {/* How AirwayLab Shows You This Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab Shows You This Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab brings together your compliance metrics, nightly AHI data, leak trends, and
            event breakdowns into one dashboard — the same underlying data that goes into your
            doctor&apos;s report, formatted so it&apos;s readable without a clinical background.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Usage and AHI trends</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AirwayLab plots your nightly usage hours and AHI across all sessions on the SD
                card. Trends across multiple nights are easier to spot in a chart than in your
                device&apos;s rolling 7-day average.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event type breakdown</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AirwayLab separates obstructive and central events across your sessions. Knowing
                how that ratio changes over time is useful context to bring to a clinician review.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Beyond the compliance report</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The four AirwayLab analysis engines run on your raw flow waveform — not just the
                device-reported events. This gives you access to flow limitation scores, breathing
                regularity analysis, and RERA-related pattern detection that are invisible in your
                nightly compliance summary. All of it runs entirely in your browser; your data
                never leaves your device.
              </p>
            </div>
          </div>
          <p>
            AirwayLab shows you all of this in one dashboard — upload your SD card or ResMed myAir
            data to get started. It&apos;s free, and always will be.
          </p>
        </div>
      </section>

      {/* Before You Interpret */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Before You Interpret Your Numbers</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The data in your report is a record of what the machine measured — not a verdict on how
            you&apos;re doing. A single night with a higher AHI, a flagged leak, or a pressure range
            that looks unfamiliar doesn&apos;t tell you much on its own. Trends over time matter
            more than any individual reading, and context matters most of all.
          </p>
          <p>
            If you see something in your data that concerns you — a spike in events, a persistent
            leak flag, an unusual pressure pattern — bring it to your sleep physician or prescribing
            clinician. They can interpret it alongside your full clinical history and symptoms.
          </p>
          <p>
            AirwayLab helps you <em>see</em> your data clearly. What to do with it is a
            conversation for you and your doctor.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'What is a CPAP compliance report?',
              a: "A CPAP compliance report is a summary of your therapy usage data — how often you used the machine, for how long, and key metrics like AHI and leak rate. It's generated from your device's SD card or cloud app data. Your doctor uses it to review therapy progress; your insurance company uses it to verify coverage requirements.",
            },
            {
              q: 'How many hours do I need to use my CPAP to be compliant?',
              a: 'The US Medicare standard — and the benchmark most private insurers follow — is at least 4 hours of use per night on at least 70% of nights over a 30-day period. If you fall below this threshold, coverage for equipment and supplies may be affected. Your DME supplier can pull your detailed usage record if you need to review your status.',
            },
            {
              q: 'What AHI does my insurance company look at?',
              a: "Insurers typically look at your residual AHI — the events recorded while therapy was running — as a favorable data point in compliance reviews. Your clinician can put your specific number in context and explain what it means for your care.",
            },
            {
              q: 'What does "large mask leak" mean on my CPAP report?',
              a: 'A large mask leak flag means unintentional air escaped around your mask seal beyond the threshold your device uses to flag data-quality concerns. High or persistent leak can reduce the reliability of AHI readings for that session and may prompt your doctor to review mask fit. Your clinician can help assess recurring leak flags in your specific context.',
            },
            {
              q: 'Can I access my own CPAP compliance data?',
              a: "Yes. ResMed users can view a summary in the myAir app, or export their SD card for detailed data. Philips DreamStation users can use DreamMapper for cloud summary data, or OSCAR (free, open-source) for full SD card data. AirwayLab reads ResMed SD card data directly in your browser — no upload required.",
            },
            {
              q: 'What is the difference between CPAP compliance and CPAP effectiveness?',
              a: 'Compliance (for insurance purposes) is largely about usage hours — did you use the machine enough. Clinical effectiveness is a broader judgment that includes AHI trends, leak patterns, and how you actually feel. Compliance is a prerequisite for coverage; effectiveness is what your clinician evaluates at follow-up.',
            },
            {
              q: 'Does AirwayLab show my compliance data?',
              a: "Yes. AirwayLab reads your usage hours, AHI, event breakdowns, leak rate, and pressure data from your ResMed SD card and displays it in one dashboard — the same data that goes into your doctor's compliance report. It also runs four additional analysis engines on your raw flow waveform, surfacing metrics like flow limitation scores and RERA-related patterns that don't appear in standard compliance reports. Everything runs in your browser; your data never leaves your device.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-5">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your CPAP Report in One Dashboard</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab shows you all of this in one dashboard — upload your SD card or ResMed MyAir
          data. It&apos;s free, browser-based, and your data never leaves your device.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-does-cpap-ahi-mean"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Does My AHI Mean?
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/what-does-cpap-ahi-mean"
              className="text-primary hover:text-primary/80"
            >
              What Does My CPAP AHI Number Mean?
            </Link>{' '}
            — a plain-language guide to the metric at the centre of your report.
          </p>
          <p>
            <Link
              href="/blog/cpap-leak-rate-explained"
              className="text-primary hover:text-primary/80"
            >
              CPAP Leak Rate: What It Means and When to Worry
            </Link>{' '}
            — understanding unintentional leak and what the data shows.
          </p>
          <p>
            <Link
              href="/blog/what-are-reras-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              What Are RERAs?
            </Link>{' '}
            — the breathing events your compliance report doesn&apos;t count.
          </p>
          <p>
            <Link
              href="/blog/cpap-compliance-tracking"
              className="text-primary hover:text-primary/80"
            >
              CPAP Compliance Tracking
            </Link>{' '}
            — how to track usage trends and what to do if you&apos;re falling short.
          </p>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a data-visualization tool, not a medical device. The metrics described in this
        article are data recorded by your CPAP device. Nothing on this page constitutes medical
        advice — always discuss your therapy data and any questions about your treatment with your
        prescribing physician or sleep specialist.
      </p>
    </article>
  );
}
