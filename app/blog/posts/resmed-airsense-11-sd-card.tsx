import Link from 'next/link';
import {
  ArrowRight,
  CreditCard,
  FolderOpen,
  HardDrive,
  Lightbulb,
  Monitor,
  RotateCcw,
  Upload,
} from 'lucide-react';

export default function ResmedAirsense11SdCardPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        The ResMed AirSense 11 is the latest generation of ResMed&apos;s CPAP platform. It&apos;s
        sleeker, quieter, and has built-in Bluetooth and cellular connectivity for the myAir app.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        But here&apos;s something most people don&apos;t realise: the myAir app only shows you AHI,
        usage hours, mask fit, and a simplified &ldquo;score.&rdquo; It does not give you access to
        your detailed flow waveform data.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AirSense 11 still has an SD card. And that card still records the detailed data -- flow
        waveforms, pressure, leaks, events -- that lets you see what&apos;s actually happening
        breath by breath.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide shows you how to get that data into AirwayLab.
      </p>

      {/* What you'll need */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What You&apos;ll Need</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <p className="text-sm font-semibold text-foreground">
                Your ResMed AirSense 11 (AutoSet or CPAP)
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-semibold text-foreground">
                A computer (Mac, Windows, or Linux)
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-sm font-semibold text-foreground">
                An SD card reader (your AirSense 11 may use a micro SD card -- see Step 1)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step 1: Find the SD card slot */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 1: Find the SD Card Slot</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {/* Photo placeholder */}
          <div className="flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 px-6 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              Back/bottom of AirSense 11, showing the SD card compartment behind the small panel
            </p>
          </div>
          <p>
            The AirSense 11&apos;s SD card slot is less obvious than the AirSense 10&apos;s. It is
            located on the <strong className="text-foreground">side of the device</strong>, behind a
            small cover panel.
          </p>
          <p>
            On most AirSense 11 models, the SD card slot is on the{' '}
            <strong className="text-foreground">left side</strong> (when facing the machine from
            the front). Look for a small rectangular cover that pops open.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">
              Important difference from AirSense 10
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Some AirSense 11 units ship with a{' '}
              <strong className="text-foreground">micro SD card</strong> inside a full-size adapter.
              When you remove the card, you may find a micro SD card seated inside an adapter. Keep
              the adapter -- your computer&apos;s SD slot needs it.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2: Remove the SD card safely */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 2: Remove the SD Card Safely</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <p>
              <strong className="text-foreground">Power off your AirSense 11.</strong> Unplug it
              from power.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              <strong className="text-foreground">Open the SD card cover</strong> on the side.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              <strong className="text-foreground">Push the card inward gently</strong> until it
              clicks and springs out.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              <strong className="text-foreground">Pull the card out.</strong> If it&apos;s a micro
              SD in an adapter, remove the whole assembly.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Don&apos;t worry</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Removing the card won&apos;t erase your data or change your machine settings. Your
              AirSense 11 stores therapy settings internally.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3: Connect to your computer */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 3: Connect to Your Computer</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Insert the SD card (in its adapter if it&apos;s micro SD) into your computer&apos;s
            card reader. The card appears as a removable drive. Open it to see the folder structure.
          </p>
        </div>
      </section>

      {/* Step 4: Understand what's on the card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Step 4: Understand What&apos;s on the Card
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>The AirSense 11 SD card structure is similar to the AirSense 10:</p>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <pre className="text-xs text-muted-foreground">
              {`SD Card/
├── DATALOG/
│   ├── 20260101/
│   ├── 20260102/
│   └── ...
├── SETTINGS/
├── Identification.tgt
└── STR.edf`}
            </pre>
          </div>
          <p>
            The key folder is <strong className="text-foreground">DATALOG</strong> -- it contains
            your nightly session data in EDF format. Each subfolder is one day.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">AirSense 11 data note</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The AirSense 11 records the same core data as the 10 (flow, pressure, leaks, events),
              though the file format has minor differences. AirwayLab handles both formats. Some
              early AirSense 11 firmware versions had slightly different DATALOG structures, but
              AirwayLab&apos;s parser detects and adapts to these automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Step 5: Upload to AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Upload className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 5: Upload to AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <p>
              Go to{' '}
              <Link href="/analyze" className="text-primary hover:text-primary/80">
                airwaylab.app/analyze
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              Click <strong className="text-foreground">&ldquo;Upload SD Card.&rdquo;</strong>
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>Select the SD card or the DATALOG folder.</p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              AirwayLab detects your AirSense 11 data and runs the analysis. This takes 30-60
              seconds.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Privacy note</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All processing happens in your browser. Your breathing data never leaves your device.
            </p>
          </div>
        </div>
      </section>

      {/* Step 6: What you'll see */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 6: What You&apos;ll See</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>AirwayLab gives you a session-by-session dashboard with:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">AHI and event breakdown</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Apneas, hypopneas, and central events per session.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation analysis</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial airway narrowing that AHI doesn&apos;t count.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Breathing pattern metrics</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Regularity, stability, and periodicity of your breathing.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Leak and pressure trends</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How your mask seal and pressure responded through the night.
              </p>
            </div>
          </div>
          <p>
            This data helps you understand your breathing patterns. Share it with your clinician if
            you&apos;d like their perspective.
          </p>
        </div>
      </section>

      {/* AirSense 11 vs myAir */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AirSense 11 vs myAir: What&apos;s the Difference?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The myAir app gives you a simplified daily score and basic AHI. It&apos;s convenient
            for quick checks.
          </p>
          <p>
            Your SD card data goes much deeper. It contains the raw flow waveform -- the
            breath-by-breath airflow signal -- which is what allows tools like AirwayLab and OSCAR
            to detect flow limitation, breathing pattern instability, and other patterns that myAir
            doesn&apos;t show.
          </p>
          <p>
            They&apos;re complementary. myAir for quick daily check-ins. SD card data for deeper
            analysis when you want to understand what&apos;s happening.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Does the AirSense 11 always come with an SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Most AirSense 11 units ship with a micro SD card pre-installed. If yours didn&apos;t
              come with one, you can insert any micro SD card (formatted FAT32, 2GB or larger).
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              My AirSense 11 connects to myAir. Do I still need the SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you want detailed flow waveform data, yes. myAir receives summary data over
              cellular, not the full waveform data that the SD card stores.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Is AirSense 11 data different from AirSense 10 data?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The core data is the same -- flow, pressure, leaks, events. The file format has minor
              differences, but AirwayLab handles both automatically.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Can I use AirwayLab and myAir at the same time?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Absolutely. They don&apos;t interfere with each other.
            </p>
          </div>
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
            AirwayLab is not a medical device. The analysis provided is informational and
            educational. Always discuss your results with your sleep physician or clinician.
            AirwayLab does not diagnose, treat, or provide clinical recommendations.
          </p>
        </div>
      </section>

      {/* Related articles */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/getting-started" className="text-primary hover:text-primary/80">
              Getting Started Guide
            </Link>{' '}
            -- new to AirwayLab? Start here.
          </p>
          <p>
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              Analyze Your Data
            </Link>{' '}
            -- ready to upload your SD card?
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            -- why the myAir score doesn&apos;t tell the full story.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What myAir Isn&apos;t Showing You</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your AirSense 11 SD card to AirwayLab and get a full breath-by-breath analysis in
          30 seconds. Free, open source, and your data never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Getting Started Guide
          </Link>
        </div>
      </section>
    </article>
  );
}
