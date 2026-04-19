import Link from 'next/link';
import { ArrowRight, CheckCircle, Globe, Laptop, Lightbulb, Lock, Scale, Users } from 'lucide-react';

export default function FreeCPAPDataAnalysisSoftwarePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been using CPAP or BiPAP therapy for any length of time, you&apos;ve probably
        realised that your device collects a remarkable amount of data every night. AHI, flow
        limitation, leak rates, RERAs &mdash; it&apos;s all there on your SD card or in your
        device&apos;s memory, waiting to be read. The question is: which free CPAP data analysis
        software should you use?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        There&apos;s no single right answer. After spending time with all three main tools &mdash;
        OSCAR, SleepHQ, and AirwayLab &mdash; my honest take is that they each occupy a different
        niche, and the good news is they work better together than any of them works alone.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Here&apos;s a practical comparison of what each one does well, where it has limits, and how
        they fit together for a PAP user who actually wants to understand their therapy data.
      </p>

      {/* Why bother */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why bother analysing your CPAP data at all?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Before comparing tools, a quick word on why this matters. Your device&apos;s own display
            typically shows you a nightly AHI number and maybe a therapy score &mdash; but that&apos;s
            a tiny fraction of what&apos;s recorded.{' '}
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              Understanding your CPAP data
            </Link>{' '}
            means you can see patterns across weeks, see patterns like{' '}
            <Link
              href="/blog/what-is-flow-limitation-cpap"
              className="text-primary hover:text-primary/80"
            >
              flow limitation levels
            </Link>{' '}
            or{' '}
            <Link href="/blog/cpap-leak-rate-meaning" className="text-primary hover:text-primary/80">
              leak rate trends
            </Link>
            , and have much more informed conversations with your clinician.
          </p>
          <p>
            None of these tools replace clinical judgement. All three are data exploration and
            visualisation tools. But having your data in a readable format changes the quality of
            the conversation you can have with your sleep team.
          </p>
        </div>
      </section>

      {/* OSCAR */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Laptop className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">OSCAR</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Platform:</strong> Desktop (Windows, macOS, Linux)</span>
          <span><strong className="text-foreground">Cost:</strong> Free, open source (GPL)</span>
          <span><strong className="text-foreground">Privacy:</strong> Fully local — data never leaves your machine</span>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR (Open Source CPAP Analysis Reporter) is the long-standing community standard for
            CPAP data analysis. It runs on your desktop, reads directly from your SD card, and keeps
            everything local. If you&apos;re on a forum like CPAPtalk or r/CPAP, OSCAR screenshots
            are the shared language &mdash; almost every active PAP user in those communities knows
            their way around an OSCAR chart.
          </p>
          <p>
            OSCAR&apos;s depth is its strength and its learning curve. The chart layout is dense and
            powerful. You can zoom into individual breathing cycles, overlay multiple metrics, and dig
            into the waveform data that most people never see. If you want to understand{' '}
            <Link
              href="/blog/how-to-read-oscar-cpap-charts"
              className="text-primary hover:text-primary/80"
            >
              how to read OSCAR CPAP charts
            </Link>
            , that depth pays off over time.
          </p>
          <p>
            The limitation is friction. Installing OSCAR, getting your SD card into your computer,
            and making sense of the default view takes effort &mdash; especially for new users. On
            mobile, it&apos;s not really an option.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">Summary</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The most powerful free tool available. Essential for serious data analysis. The
              community gold standard.
            </p>
          </div>
        </div>
      </section>

      {/* SleepHQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">SleepHQ</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Platform:</strong> Web (cloud-based)</span>
          <span><strong className="text-foreground">Cost:</strong> Free tier available; premium subscription for full access</span>
          <span><strong className="text-foreground">Privacy:</strong> Data uploaded to SleepHQ servers</span>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            SleepHQ is a web-based platform that takes a different approach: you upload your CPAP
            data to their servers and get back clean, shareable dashboards. The interface is
            polished, the charts are modern, and the clinician-sharing features are genuinely useful
            if your sleep team is open to reviewing data between appointments.
          </p>
          <p>
            The trade-off is privacy. Your therapy data lives on SleepHQ&apos;s infrastructure. That
            works for many people &mdash; the cloud model is how most modern health apps work &mdash;
            but it&apos;s worth understanding before you sign up. The full feature set also requires
            a paid subscription, so the free tier has real constraints.
          </p>
          <p>
            SleepHQ is particularly strong for users who want to share data easily with others. The
            clean PDF exports and shareable links make it the best option if you&apos;re regularly
            discussing therapy with a clinician.
          </p>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-sm font-semibold text-violet-400">Summary</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Best for ease of use and clinician sharing. Data is cloud-hosted. Some features require
              a paid subscription.
            </p>
          </div>
        </div>
      </section>

      {/* AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AirwayLab</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Platform:</strong> Web (browser-based, processes locally)</span>
          <span><strong className="text-foreground">Cost:</strong> Free, and always will be (premium tier supports development)</span>
          <span><strong className="text-foreground">Privacy:</strong> Your data never leaves your browser — 100% client-side</span>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is the newest of the three. It runs in your browser &mdash; no installation
            required &mdash; but unlike SleepHQ, it processes everything locally. Your SD card data
            is{' '}
            <Link
              href="/blog/how-to-export-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              exported
            </Link>{' '}
            and{' '}
            <Link
              href="/blog/how-to-analyze-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              analysed
            </Link>{' '}
            entirely within your browser tab. Nothing is sent to a server. That&apos;s not a
            marketing claim; it&apos;s verifiable because the code is GPL-3.0 open source.
          </p>
          <p>
            The free tier is complete, not a preview. You get full AHI breakdown,{' '}
            <Link
              href="/blog/what-is-flow-limitation-cpap"
              className="text-primary hover:text-primary/80"
            >
              flow limitation visualisation
            </Link>
            ,{' '}
            <Link
              href="/blog/what-are-reras-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              RERA identification
            </Link>
            , leak rate trends, and session history &mdash; everything most PAP users need to
            understand their therapy data. Premium is there for users who want additional features
            and to support ongoing development; it doesn&apos;t gate the core analysis.
          </p>
          <p>
            AirwayLab&apos;s particular focus is on the breathing pattern metrics that matter for
            therapy understanding &mdash; flow limitation waveform analysis, RERA identification, and
            scoring that experienced CPAP users care about. It&apos;s designed for the PAP user
            who&apos;s already read the basics and wants to go deeper.
          </p>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Summary</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Best for privacy-conscious users and for flow limitation and RERA analysis. No
              installation required. Free tier is full-featured.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Quick comparison</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground" />
                <th className="px-4 py-3 text-center font-semibold text-foreground">OSCAR</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">SleepHQ</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Platform</td>
                <td className="px-4 py-2.5 text-center">Desktop (Win/Mac/Linux)</td>
                <td className="px-4 py-2.5 text-center">Web (cloud)</td>
                <td className="px-4 py-2.5 text-center">Web (browser-local)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Installation required</td>
                <td className="px-4 py-2.5 text-center text-amber-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">No</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Data leaves your device</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">No</td>
                <td className="px-4 py-2.5 text-center text-amber-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">No</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Cost</td>
                <td className="px-4 py-2.5 text-center">Free</td>
                <td className="px-4 py-2.5 text-center">Free / Paid</td>
                <td className="px-4 py-2.5 text-center">Free / Paid</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Open source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL)</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Flow limitation analysis</td>
                <td className="px-4 py-2.5 text-center">Yes (advanced)</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Basic</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (visualised)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">RERA identification</td>
                <td className="px-4 py-2.5 text-center">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Limited</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Clinician sharing</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Manual (screenshots)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Built-in</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Coming</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4 font-medium text-foreground">Mobile</td>
                <td className="px-4 py-2.5 text-center text-amber-400">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-foreground">Learning curve</td>
                <td className="px-4 py-2.5 text-center text-amber-400">Steep</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Low</td>
                <td className="px-4 py-2.5 text-center">Low–Medium</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* When each tool shines */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">When each tool shines</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          These tools are more complementary than competitive. Most experienced PAP users end up
          using more than one.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">Use OSCAR when:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>You want the deepest per-night analysis available</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>You&apos;re participating in CPAP forums where OSCAR charts are the shared format</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>You&apos;re comfortable with a desktop application and want the full waveform view</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>You want maximum control over how your data is displayed</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-sm font-semibold text-violet-400">Use SleepHQ when:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>You want to share data directly with a clinician</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>You prefer a polished, modern interface</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>Cloud storage is acceptable for your use case</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>You want mobile-friendly access</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Use AirwayLab when:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>Privacy matters and you don&apos;t want data leaving your device</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>You want to analyse your data immediately from any computer without installing software</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>Flow limitation and RERA patterns are your focus</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>You want an open-source, verifiable tool you can trust</span>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          There&apos;s genuinely no reason not to use all three. Many active PAP users do: OSCAR for
          deep historical analysis and forum discussions, AirwayLab for quick browser-based access
          and privacy, SleepHQ when sharing directly with a clinician.
        </p>
      </section>

      {/* How AirwayLab fits */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab fits into your data toolkit
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab was built specifically for PAP users who wanted a tool that ran in the browser,
            kept data local, and focused on the metrics that matter for therapy understanding &mdash;
            particularly flow limitation and{' '}
            <Link
              href="/blog/what-are-reras-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              RERAs
            </Link>
            , which the device&apos;s built-in display ignores entirely.
          </p>
          <p>
            The goal was never to replace OSCAR. OSCAR has a decade of community development behind
            it and a depth of analysis that&apos;s unmatched for power users. AirwayLab is a
            different tool for a different moment: when you want to check last night&apos;s session
            quickly, when you&apos;re on a machine that doesn&apos;t have OSCAR installed, or when
            you want to share your analysis process with someone who doesn&apos;t want to install
            software.
          </p>
          <p>
            The free-and-always-will-be commitment is real. Core analysis features stay free because
            every PAP user deserves access to their own data in a readable form. Your data is yours.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">
              Important note on all CPAP analysis tools
            </p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            OSCAR, SleepHQ, and AirwayLab are all data exploration and visualisation tools. They
            help you see and understand the information your device records. They do not diagnose
            sleep disorders, and nothing in any analysis output from these tools should be treated
            as a clinical recommendation or substitute for professional medical advice. If your data
            raises questions about your therapy, please discuss them with your prescribing clinician
            or sleep specialist. These tools are designed to help you have better, more informed
            conversations &mdash; not to replace those conversations.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently asked questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Is OSCAR still the best free CPAP analysis software?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              OSCAR remains the most powerful free desktop CPAP analysis tool available, with the
              deepest per-night analysis and strong community support. Browser-based alternatives
              like AirwayLab now offer privacy-first analysis without installation required.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Is SleepHQ free?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SleepHQ has a free tier, but full access requires a paid subscription. Your data is
              stored on SleepHQ&apos;s servers.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Does AirwayLab send my data to a server?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No. AirwayLab processes all analysis in your browser. Your CPAP data never leaves your
              device. This is verifiable because AirwayLab is GPL-3.0 open source.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Can I use OSCAR and AirwayLab together?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. Many PAP users use OSCAR for deep desktop analysis and AirwayLab for quick
              browser-based access and flow limitation visualisation. The tools are designed to
              complement each other.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              What is the best free CPAP data analysis software for privacy?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Both OSCAR and AirwayLab process data locally with no data upload required. OSCAR is a
              desktop application; AirwayLab runs in your browser with no installation needed.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to try AirwayLab?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data now &mdash; no installation, no account required, and no data
          sent to any server. Your browser does all the work.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Try the free analyser <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/how-to-read-cpap-data"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How to read your CPAP data
          </Link>
        </div>
      </section>
    </article>
  );
}
