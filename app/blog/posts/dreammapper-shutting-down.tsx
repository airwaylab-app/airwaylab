import Link from 'next/link';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Database,
  Download,
  Layers,
  Lightbulb,
} from 'lucide-react';

export default function DreamMapperShuttingDownPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been using DreamMapper to monitor your Philips Respironics CPAP therapy
        data, you may have already seen the notices: the app is being discontinued. This page
        covers what&apos;s happening, what it means for your data, and what alternatives exist.
      </p>

      {/* What Was DreamMapper */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Was DreamMapper?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            DreamMapper was Philips Respironics&apos; patient-facing app for viewing CPAP therapy
            data from compatible DreamStation devices. It let users see summary statistics — AHI,
            leak rate, usage hours — and share data with their care team.
          </p>
          <p>
            The app was available on iOS, Android, and via a web portal. For many Respironics
            users it was the primary way to keep a record of their therapy data outside of a
            clinic visit.
          </p>
        </div>
      </section>

      {/* Why Is It Shutting Down */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Is It Shutting Down?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Philips has not publicly detailed all the reasons behind the DreamMapper
            discontinuation. The shutdown is separate from (though chronologically related to) the
            2021 DreamStation recall, which involved foam degradation issues in certain devices.
            DreamMapper&apos;s discontinuation is a product lifecycle decision, not a safety recall.
          </p>
          <p>
            Philips has indicated users should migrate to the EncoreAnywhere platform for
            clinician-facing data access, though patient-direct access options have become more
            limited.
          </p>
        </div>
      </section>

      {/* What Happens to Your Existing Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Happens to Your Existing Data?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is the most pressing question. Your data situation depends on where it&apos;s
            been stored:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">On your SD card</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                If your DreamStation uses an SD card, all your therapy data is stored there too
                — in EDF format. This data is yours. It doesn&apos;t depend on DreamMapper. You
                can read it with third-party tools whether DreamMapper exists or not.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">
                  In the DreamMapper cloud
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Session summaries and trend data synced to DreamMapper&apos;s servers may not be
                exportable in a machine-readable format after shutdown. If you have data in
                DreamMapper that you want to keep, export it before the shutdown date using the
                app&apos;s built-in export options while they&apos;re still available.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  On your device&apos;s internal memory
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Some DreamStation models store limited data in device memory. Your equipment
                provider or Philips support can advise on how to access it.
              </p>
            </div>
          </div>
          <p>
            If you&apos;re not sure where your data lives, the safest step is to pull your SD
            card, copy its contents to your computer, and keep that backup regardless of which
            software you use going forward.
          </p>
        </div>
      </section>

      {/* Alternatives to DreamMapper */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Alternatives to DreamMapper</h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {/* Respironics sub-section */}
          <div>
            <h3 className="text-base font-semibold text-foreground">
              For Respironics / DreamStation Users
            </h3>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">OSCAR</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open-Source CPAP Analysis Reporter is the community standard for detailed
                  Respironics data analysis. It&apos;s free, GPL-licensed, runs on Windows,
                  macOS, and Linux, and reads DreamStation SD card data directly. For users who
                  want granular access to their therapy data, OSCAR is the primary recommendation
                  from the CPAP user community. See our guide:{' '}
                  <Link
                    href="/blog/how-to-read-oscar-cpap-charts"
                    className="text-primary hover:text-primary/80"
                  >
                    How to Read OSCAR CPAP Charts
                  </Link>
                  .
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">EncoreAnywhere</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Philips&apos; clinician-portal replacement. It&apos;s designed for care teams
                  rather than patients, but your provider may give you access.
                </p>
              </div>
            </div>
          </div>

          {/* ResMed sub-section */}
          <div>
            <h3 className="text-base font-semibold text-foreground">For ResMed Users</h3>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">myAir</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ResMed&apos;s official app. It provides daily summaries and a simple score,
                  synced via the machine&apos;s built-in cellular connection (no SD card required
                  on supported models).
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">AirView</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ResMed&apos;s clinical portal. Your care team may use this to review your data
                  remotely.
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">AirwayLab</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reads ResMed SD card data (EDF format) directly in your browser — no account,
                  no upload to any server. You get detailed analysis including breath-shape
                  scores, flow limitation metrics, and oximetry data if you have a compatible
                  pulse oximeter. It&apos;s open-source and GPL-3.0 licensed. See:{' '}
                  <Link
                    href="/blog/oscar-alternatives-web-cpap-2026"
                    className="text-primary hover:text-primary/80"
                  >
                    OSCAR Alternatives for Web-Based CPAP Analysis
                  </Link>
                  .
                </p>
              </div>
              <div className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">
                  OSCAR (ResMed data too)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  OSCAR also reads ResMed data and remains the standard tool for detailed offline
                  analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Export */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Download className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Export Your DreamMapper Data Before Shutdown
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <ol className="ml-4 space-y-3 list-decimal">
            <li>Open DreamMapper (app or web)</li>
            <li>Navigate to your usage history or reports section</li>
            <li>
              Look for an export or download option — typically PDF reports or CSV data
            </li>
            <li>Save copies to your local device and a backup location</li>
            <li>Note the exact date range covered by your export</li>
          </ol>
          <p>
            Do this as soon as possible. Once the service shuts down, server-side data may
            become inaccessible.
          </p>
        </div>
      </section>

      {/* What to Keep */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What to Keep Regardless of Platform
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                A copy of your SD card data — the raw EDF files are your most complete record
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>Any PDF reports from your clinic visits</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>Your prescription and device settings documentation</span>
            </li>
          </ul>
          <p>
            Your therapy data is most useful when it&apos;s accessible. Cloud-only records
            create dependency on a single provider&apos;s continued operation — as
            DreamMapper&apos;s shutdown illustrates.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is a data-visualization tool, not a medical device. This article provides
            informational guidance on data access and platform alternatives. It does not
            constitute advice about your therapy setup or device choices. Consult your sleep
            clinician or equipment provider for decisions about your therapy.
          </p>
        </div>
      </section>
    </article>
  );
}
