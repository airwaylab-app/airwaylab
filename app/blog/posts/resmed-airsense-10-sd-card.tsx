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

export default function ResmedAirsense10SdCardPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        The ResMed AirSense 10 AutoSet is the most widely used CPAP machine in the world. It records
        detailed breathing data every night -- flow waveforms, pressure changes, leak rates,
        respiratory events -- all saved to a standard SD card.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most people never look at this data. The machine&apos;s screen shows you AHI and usage
        hours, and that&apos;s it. But there&apos;s far more on that card than what the screen tells
        you.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide walks you through getting your AirSense 10 SD card data into AirwayLab, step by
        step. No technical knowledge required.
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
                Your ResMed AirSense 10 (any variant: AutoSet, Elite, or CPAP)
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-semibold text-foreground">
                A computer (Mac, Windows, or Linux -- not a phone or tablet)
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-sm font-semibold text-foreground">
                An SD card reader (if your computer doesn&apos;t have a built-in slot)
              </p>
            </div>
          </div>
          <p className="mt-2">
            That&apos;s it. No software to install, no accounts to create.
          </p>
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
              Side view of AirSense 10, right side, showing the SD card slot beneath the flip-up
              cover
            </p>
          </div>
          <p>
            The SD card slot is on the <strong className="text-foreground">right side</strong> of
            your AirSense 10, near the back. There&apos;s a small flip-up cover (some models have a
            rubber flap) that protects the slot.
          </p>
          <p>
            If you&apos;re looking at the machine from the front, it&apos;s on the left side as you
            face it. The slot holds a standard full-size SD card.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Tip</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you&apos;ve never opened this cover before, it might feel stiff. That&apos;s
              normal. Lift it gently with your fingernail.
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
              <strong className="text-foreground">Power off your AirSense 10.</strong> Unplug it or
              hold the power button. This prevents data corruption.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              <strong className="text-foreground">Open the SD card cover</strong> on the right side.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              <strong className="text-foreground">Push the card in gently</strong> -- you&apos;ll
              feel a click, and the card will spring out slightly.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              <strong className="text-foreground">Pull the card out.</strong> It&apos;s a standard
              SD card (not micro SD), the same type used in cameras.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Don&apos;t worry</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Removing the SD card does not erase your data, reset your settings, or affect your
              machine&apos;s operation. Your therapy settings are stored in the machine&apos;s
              internal memory, not on the card. You can put it back whenever you&apos;re ready.
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
            Insert the SD card into your computer&apos;s SD card reader. If your computer
            doesn&apos;t have one, any USB SD card reader will work -- they cost about $8-10 and are
            available from any electronics shop.
          </p>
          <p>
            Once inserted, the card should appear as a removable drive. On Mac, it shows up in
            Finder. On Windows, in File Explorer.
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
          <p>When you open the SD card, you&apos;ll see a folder structure like this:</p>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <pre className="text-xs text-muted-foreground">
              {`SD Card/
├── DATALOG/
│   ├── 20260101/
│   ├── 20260102/
│   ├── ...
│   └── (one folder per day)
├── SETTINGS/
├── Identification.tgt
└── STR.edf`}
            </pre>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">DATALOG folder</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your nightly session data. Each subfolder contains EDF files with flow waveforms,
                pressure data, leak rates, and event annotations for that night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">STR.edf</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A summary file with daily statistics (AHI, usage hours, leak averages) for every
                night on the card.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">SETTINGS</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your machine&apos;s configuration. AirwayLab reads this to understand your therapy
                mode and pressure settings.
              </p>
            </div>
          </div>
          <p>
            You don&apos;t need to understand EDF files or open individual folders. AirwayLab
            handles all of this automatically.
          </p>
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
              Open{' '}
              <Link href="/analyze" className="text-primary hover:text-primary/80">
                airwaylab.app/analyze
              </Link>{' '}
              in your browser.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              Click <strong className="text-foreground">&ldquo;Upload SD Card&rdquo;</strong>.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              Select the <strong className="text-foreground">entire SD card</strong> or just the{' '}
              <strong className="text-foreground">DATALOG folder</strong>. Either works -- AirwayLab
              finds the right files automatically.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              Wait for analysis. This usually takes 30-60 seconds depending on how many nights of
              data are on the card.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Your data stays in your browser</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing is uploaded to any server. AirwayLab processes everything locally using your
              computer&apos;s processing power.
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
          <p>After analysis, AirwayLab shows you a dashboard with:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Nightly summaries</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                AHI, usage, leak rates, and pressure data for each session.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation scoring</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The percentage of breaths with partial airway narrowing that AHI misses.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Breathing pattern analysis</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Regularity, periodicity, and stability of your breathing across the night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Trend views</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How your therapy metrics change over days and weeks.
              </p>
            </div>
          </div>
          <p>
            This is informational data about your breathing patterns. If you notice anything
            you&apos;d like to understand better, discuss it with your clinician.
          </p>
        </div>
      </section>

      {/* Putting the card back */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Putting the Card Back</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you&apos;re done, eject the card safely from your computer (right-click &gt; Eject
            on Mac, or &ldquo;Safely Remove Hardware&rdquo; on Windows), then slide it back into
            your AirSense 10. It clicks into place.
          </p>
          <p>Your machine continues recording as normal.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              How often should I check my data?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              That&apos;s entirely up to you. Some people check weekly, others monthly. The SD card
              stores months of data, so there&apos;s no rush.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Will removing the SD card affect my therapy?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No. Your AirSense 10 continues to provide therapy without the SD card. It just
              won&apos;t record detailed data until the card is back.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              My SD card is full. What do I do?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The AirSense 10 uses a 4GB SD card. When it fills up, it overwrites the oldest data.
              If you want to keep historical data, copy the DATALOG folder to your computer before
              the card fills up.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Can I use a different SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. Any standard SD card (2GB or larger, FAT32 formatted) works with the AirSense
              10. Format it as FAT32 first.
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
            <Link
              href="/getting-started"
              className="text-primary hover:text-primary/80"
            >
              Getting Started Guide
            </Link>{' '}
            -- new to AirwayLab? Start here.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            -- understand what the metrics mean once you&apos;ve uploaded your data.
          </p>
          <p>
            <Link
              href="/blog/why-ahi-is-lying"
              className="text-primary hover:text-primary/80"
            >
              Why Your AHI Is Lying to You
            </Link>{' '}
            -- why the number on your machine&apos;s screen isn&apos;t the whole story.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to See Your Data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your AirSense 10 SD card to AirwayLab and see your breathing patterns scored and
          visualised in 30 seconds. Free, open source, and your data never leaves your browser.
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
