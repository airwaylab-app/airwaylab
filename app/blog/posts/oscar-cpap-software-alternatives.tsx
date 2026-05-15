import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

export default function OSCARCPAPSoftwareAlternativesPost() {
  return (
    <article>
      {/* Medical disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">Note</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          AirwayLab is a data visualisation tool, not a medical device. Nothing in this article
          constitutes medical advice. Always discuss your therapy data and any therapy decisions
          with your sleep physician or respiratory therapist.
        </p>
      </div>

      <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have spent any time in the CPAP community, you know OSCAR. It is the gold standard
        for detailed data analysis — free, open source, and genuinely powerful. But lately more
        people are searching for OSCAR CPAP software alternatives, and the reasons are
        understandable.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Maybe you are on a Chromebook or iPad. Maybe you want to share a readable summary with your
        doctor without attaching a 47-page export. Maybe you want something that opens without a
        local install. Whatever brought you here — there are real options worth knowing about.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This is not an article about replacing OSCAR. It is about understanding which tools do what
        well, so you can pick the right one (or two) for how you actually work.
      </p>

      {/* Why People Look */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Why People Look for OSCAR Alternatives</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR is a desktop application — and that is a strength. It runs locally, your data
            stays on your machine, and it handles extraordinarily granular data. But desktop-only
            also means:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>No access from a phone or tablet</li>
            <li>No easy link-based sharing</li>
            <li>A steeper learning curve for new users</li>
            <li>Not natively available on ChromeOS or iOS</li>
          </ul>
          <p>
            None of that is a flaw in OSCAR. It is built to do something specific very well. The
            alternatives are not better — they are different tools solving different parts of the
            same problem.
          </p>
        </div>
      </section>

      {/* The Main Alternatives */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          The Main OSCAR CPAP Software Alternatives
        </h2>

        {/* AirwayLab */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
          <h3 className="text-lg font-bold">1. AirwayLab</h3>
          <p className="mt-1 text-sm font-medium text-primary">
            Web-based. Privacy-first. Free.
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              AirwayLab is built for CPAP and BiPAP users who want clean, readable visualisations
              of their therapy data — without installing anything.
            </p>
            <p>
              <strong className="text-foreground">How it works:</strong> You upload your SD card
              data and AirwayLab processes everything locally in your browser. Your data never
              leaves your device. No account is required to get started.
            </p>
            <div>
              <p className="font-medium text-foreground">What it shows:</p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>AHI trends over time</li>
                <li>Flow limitation scores and respiratory effort metrics</li>
                <li>Pressure and leak data</li>
                <li>Breathing event breakdowns by night</li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Where it fits:</strong> AirwayLab is designed to
              complement OSCAR, not replace it. If OSCAR is your workbench for deep analysis,
              AirwayLab is the readable summary you would bring to a clinic appointment or share
              with a family member. The free tier covers the full analysis — free and always will
              be. Premium unlocks longer history exports and additional trend views; it exists to
              support development, not to gate-keep your own data.
            </p>
            <p>
              <strong className="text-foreground">What it does not do:</strong> AirwayLab does not
              have OSCAR&apos;s depth of waveform analysis. If you need to zoom into individual
              breath waveforms at 10ms resolution, OSCAR remains your tool.
            </p>
            <p>
              <strong className="text-foreground">Privacy model:</strong> GPL-3.0 licensed.
              Processing is entirely local — verifiable, not just promised.
            </p>
          </div>
        </div>

        {/* SleepHQ */}
        <div className="mt-4 rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
          <h3 className="text-lg font-bold">2. SleepHQ</h3>
          <p className="mt-1 text-sm font-medium text-primary">
            Cloud-based. Community-focused. Freemium.
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              SleepHQ is a cloud platform that stores and visualises your CPAP data. It is popular
              in the community because it makes sharing easy — you can generate a link and send
              your data to a forum post or your care team.
            </p>
            <p>
              <strong className="text-foreground">How it works:</strong> You upload your data to
              SleepHQ&apos;s servers. It stores your history and gives you trend charts, event
              breakdowns, and a shareable profile.
            </p>
            <div>
              <p className="font-medium text-foreground">What it shows:</p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>Nightly summaries and trend graphs</li>
                <li>AHI, leak, and pressure data</li>
                <li>Shareable links to specific nights</li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Where it fits:</strong> If community engagement
              is your priority — sharing on r/CPAP or similar forums — SleepHQ&apos;s
              link-sharing is genuinely useful. It is also accessible for users who are not
              comfortable with local files.
            </p>
            <p>
              <strong className="text-foreground">What to know:</strong> Your data is uploaded to
              and stored on SleepHQ&apos;s servers. If data privacy matters to you, factor that
              in. Their free tier has storage and history limits.
            </p>
          </div>
        </div>

        {/* ResMed myAir */}
        <div className="mt-4 rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
          <h3 className="text-lg font-bold">3. ResMed myAir</h3>
          <p className="mt-1 text-sm font-medium text-primary">
            Manufacturer app. Automatic sync. Curated data.
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              myAir is ResMed&apos;s companion app for AirSense devices. It syncs automatically
              via cellular from compatible machines — no SD card needed.
            </p>
            <div>
              <p className="font-medium text-foreground">What it shows:</p>
              <ul className="ml-5 mt-2 list-disc space-y-1">
                <li>A nightly myAir score (a simplified composite metric)</li>
                <li>AHI, mask seal, and events per hour</li>
                <li>Usage hours</li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Where it fits:</strong> myAir works best as a
              quick daily check. The simplified score is easy to read but obscures the detail that
              matters for troubleshooting.
            </p>
            <p>
              <strong className="text-foreground">What it does not do:</strong> myAir does not
              show flow limitation data or pressure waveforms. For anything beyond a surface
              summary, you will want one of the tools above.
            </p>
            <p>
              <strong className="text-foreground">Note:</strong> myAir is only available for
              ResMed devices. It does not work with Philips, Fisher &amp; Paykel, or other brands.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Honest Comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground"></th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">OSCAR</th>
                <th className="px-4 py-3 text-left font-semibold text-primary">AirwayLab</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">SleepHQ</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">ResMed myAir</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ['Platform', 'Desktop (Win/Mac/Linux)', 'Web browser', 'Web (cloud)', 'iOS / Android'],
                ['Data storage', 'Local only', 'Local only', 'Cloud (their servers)', 'ResMed servers'],
                ['Cost', 'Free', 'Free + Premium', 'Free tier + paid', 'Free (ResMed only)'],
                ['Device support', 'ResMed, Philips, F&P, more', 'ResMed, Philips, F&P, more', 'ResMed, Philips, F&P, more', 'ResMed only'],
                ['Waveform depth', 'Very high', 'Moderate', 'Moderate', 'Low'],
                ['Readability', 'High (complex)', 'High (clean)', 'Medium', 'High (simplified)'],
                ['Open source', 'Yes (GPL-2.0)', 'Yes (GPL-3.0)', 'No', 'No'],
                ['Requires account', 'No', 'No', 'Yes', 'Yes'],
              ].map(([label, oscar, airwaylab, sleephq, myair]) => (
                <tr key={label} className="border-b border-border/30">
                  <td className="py-3 pr-4 font-medium text-foreground">{label}</td>
                  <td className="px-4 py-3">{oscar}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{airwaylab}</td>
                  <td className="px-4 py-3">{sleephq}</td>
                  <td className="px-4 py-3">{myair}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Which One */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Which One Should You Use?</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>There is no single right answer — and you do not have to pick just one.</p>
          <p>
            Many users run OSCAR for serious troubleshooting and use AirwayLab for a readable
            weekly summary. SleepHQ is worth considering if community sharing is important to you.
            myAir is the path of least resistance for a quick morning check-in if you are on a
            ResMed device.
          </p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <p>
              What none of these tools do — and this is worth being clear about — is tell you what
              to do with your therapy. They show you your data. What that data means for your
              therapy, whether to discuss anything with your care team, and what follow-up may be
              appropriate: those are questions for your sleep physician or respiratory therapist,
              who can interpret your specific history in full clinical context.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Try AirwayLab</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you have been looking for an OSCAR CPAP software alternative that runs in a browser,
            respects your privacy, and does not require an account to get started — AirwayLab is
            worth five minutes.
          </p>
          <p>
            Upload your SD card data and you will have a full analysis in under a minute. Your
            data never leaves your browser.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload your SD card data →
          </Link>
          <Link
            href="/analyze?demo=true"
            className="inline-flex items-center justify-center rounded-xl border border-border/50 bg-card/50 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-card"
          >
            See a sample analysis
          </Link>
        </div>
      </section>

      {/* Medical disclaimer footer */}
      <div className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          AirwayLab is a data visualisation and analytics tool. It is not a medical device and
          does not provide medical advice, diagnoses, or treatment recommendations. Always discuss
          your therapy data and any changes to your treatment plan with your sleep physician or
          qualified healthcare provider.
        </p>
      </div>
    </article>
  );
}
