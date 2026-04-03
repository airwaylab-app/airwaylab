import Link from 'next/link';
import {
  Shield,
  Wifi,
  Eye,
  Lock,
  Scale,
  ArrowRight,
  BookOpen,
  ServerOff,
  Smartphone,
} from 'lucide-react';

export default function CPAPDataPrivacyPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Every night, your CPAP machine quietly records some of the most intimate health data
        imaginable: how you breathe, when you stop breathing, how your body responds to
        obstruction, and even patterns that correlate with sleep stages and body position. It&apos;s
        a remarkably detailed physiological diary. But have you ever stopped to ask:{' '}
        <strong className="text-foreground">where does all that data go?</strong>
      </p>

      {/* The Connected CPAP Era */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wifi className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Rise of the Connected CPAP</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Modern CPAP machines from ResMed, Philips, and other manufacturers are increasingly
            connected devices. ResMed&apos;s AirSense 10 and 11 models, for instance, come with
            built-in cellular modems that transmit your sleep data to ResMed&apos;s cloud servers
            every day — automatically, without any action from you.
          </p>
          <p>
            This data feeds into apps like myAir (for patients) and AirView (for clinicians). On
            the surface, this sounds convenient: your sleep physician can monitor your therapy
            remotely, and you get a daily sleep score. But the implications run deeper than most
            users realize.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">What gets transmitted?</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                Usage hours and session times
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                AHI, leak rates, and pressure data
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                Event flags (apneas, hypopneas, flow limitation)
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                Device serial number and settings
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                Your name, date of birth, and prescriber information (via AirView)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Who Has Access */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Who Can See Your Sleep Data?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The data chain is longer than you might expect:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">The device manufacturer</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ResMed, Philips, and others store your data on their cloud infrastructure. Their
                  privacy policies typically allow them to use aggregated or de-identified data for
                  research, product development, and business purposes.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Your DME (equipment provider)</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Durable Medical Equipment companies often have AirView access to monitor your
                  compliance. In the US, this is tied to insurance reimbursement — your equipment
                  provider is essentially reporting your usage to your insurer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Your insurance company</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  In the US, Medicare and most private insurers require proof of CPAP compliance
                  (typically 4+ hours per night, 70% of nights) to continue covering equipment.
                  Your usage data is used to make these determinations.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Your sleep physician</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This is the one party that <em>should</em> have access. But the same data portal
                  they use (AirView) is controlled by the manufacturer, not by you or your
                  healthcare system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Insurance Problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Compliance Monitoring: Health Tool or Surveillance?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The US insurance compliance model creates a unique tension. Patients are told they must
            use their CPAP for a minimum number of hours to keep their equipment. This well-meaning
            policy has unintended consequences:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                Patients may wear the mask while awake to log hours, rather than seeking help for
                discomfort issues
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                The focus shifts from &quot;is the therapy working?&quot; to &quot;are you wearing
                it enough?&quot;
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                Data that should empower patients becomes a tool of surveillance, creating anxiety
                rather than engagement
              </span>
            </li>
          </ul>
          <p>
            Outside the US, the compliance monitoring landscape varies. Many European and Australian
            healthcare systems focus more on clinical outcomes than hourly usage targets. But the
            data collection infrastructure — cloud-connected devices transmitting to manufacturer
            servers — is the same everywhere.
          </p>
        </div>
      </section>

      {/* The Local-First Alternative */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Case for Local-First Analysis</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here&apos;s what many CPAP users don&apos;t know: your machine stores detailed data
            locally on its SD card, independently of any cloud connection. This SD card data is
            actually <em>more</em> detailed than what gets transmitted — it includes full flow
            waveforms, not just summary statistics.
          </p>
          <p>
            This means you can analyze your own data without it ever touching a third-party server.
            No manufacturer cloud, no DME portal, no insurance compliance system. Just your data,
            on your device, under your control.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <ServerOff className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-sm font-semibold text-foreground">No Upload</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Data stays in your browser. Nothing is sent to any server.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <Lock className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-sm font-semibold text-foreground">You Control It</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Close the tab and the data is gone. No accounts, no tracking.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <Shield className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-sm font-semibold text-foreground">Open Source</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The code is public. Anyone can verify what happens with your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Your Rights */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Taking Control of Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Regardless of where you live, there are practical steps you can take:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Use your SD card</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Always keep an SD card in your machine. This gives you a local copy of your data
                  that no one else controls. Pull it periodically and analyze your data yourself.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Consider disabling wireless</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Most machines allow you to turn off cellular/WiFi transmission. The trade-off:
                  you lose remote monitoring convenience, but you gain full control over your data.
                  Discuss this with your physician if insurance compliance is a factor.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Use privacy-respecting analysis tools</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tools that process data locally in your browser — like AirwayLab — let you get
                  insights from your data without creating yet another copy on yet another server.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Know your rights</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Under GDPR (EU), you have the right to access, port, and delete your health data.
                  Under HIPAA (US), you have the right to access your medical records, including
                  CPAP data held by providers. Australia&apos;s Privacy Act provides similar
                  protections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Schwab et al. (2020). &quot;Connected health technology and the rise of digital
            sleep medicine.&quot; <em>Journal of Clinical Sleep Medicine</em>, 16(3), 487-492.
          </p>
          <p>
            Khosla et al. (2018). &quot;Consumer sleep technology: an American Academy of Sleep
            Medicine position statement.&quot; <em>Journal of Clinical Sleep Medicine</em>, 14(5).
          </p>
          <p>
            European Data Protection Board (2020). &quot;Guidelines on the processing of health
            data for scientific research purposes in the context of the COVID-19 outbreak.&quot;
          </p>
        </div>
      </section>

      {/* Related articles */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              Your PAP Data Belongs to You
            </Link>{' '}
            -- a deeper look at who can access your sleep data and your rights.
          </p>
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>{' '}
            -- comparing privacy-first tools for PAP data analysis.
          </p>
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation
            </Link>{' '}
            -- what your data reveals beyond AHI.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyze Your CPAP Data Privately</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab processes your ResMed SD card entirely in your browser. No accounts, no uploads,
          no cloud — just you and your data.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About Our Privacy Approach
          </Link>
        </div>
      </section>
    </article>
  );
}
