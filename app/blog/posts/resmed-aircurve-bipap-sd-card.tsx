import Link from 'next/link';
import {
  ArrowRight,
  CreditCard,
  FolderOpen,
  HardDrive,
  Lightbulb,
  Monitor,
  Upload,
  Wind,
} from 'lucide-react';

export default function ResmedAircurveBipapSdCardPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;re on bilevel (BiPAP) therapy with a ResMed AirCurve, your machine records the
        same detailed session data as the AirSense CPAP models -- plus additional pressure data
        specific to bilevel therapy.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        The AirCurve records both your IPAP (inspiratory pressure) and EPAP (expiratory pressure),
        pressure support levels, and the same breath-by-breath flow waveforms. All of this lives on
        the SD card.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide covers both the AirCurve 10 and AirCurve 11 series (VAuto, ST, ASV, and CS
        models).
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
                Your ResMed AirCurve 10 or AirCurve 11
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
                An SD card reader (if your computer doesn&apos;t have a built-in slot)
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
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div>
            <h3 className="text-base font-bold text-foreground">AirCurve 10</h3>
            {/* Photo placeholder */}
            <div className="mt-3 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 px-6 py-10 text-center">
              <p className="text-xs text-muted-foreground">
                Rear view of AirCurve 10 showing the SD card slot on the back panel, near the base
              </p>
            </div>
            <p className="mt-3">
              The AirCurve 10&apos;s SD card slot is on the{' '}
              <strong className="text-foreground">back of the machine</strong>, near the bottom.
              It&apos;s a bit harder to spot than on the AirSense 10 (which has it on the side).
              Look for a small cover or rubber flap near the power connection. It uses a standard
              full-size SD card.
            </p>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">AirCurve 11</h3>
            {/* Photo placeholder */}
            <div className="mt-3 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 px-6 py-10 text-center">
              <p className="text-xs text-muted-foreground">
                Side view of AirCurve 11 showing the SD card slot location
              </p>
            </div>
            <p className="mt-3">
              The AirCurve 11 follows a similar layout to the AirSense 11 -- the SD card slot is on
              the <strong className="text-foreground">side of the device</strong> behind a small
              panel. It may contain a micro SD card in a full-size adapter.
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
              <strong className="text-foreground">Power off your AirCurve.</strong> Unplug it from
              power.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              <strong className="text-foreground">Locate and open the SD card cover.</strong>
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              <strong className="text-foreground">Push the card inward gently</strong> to release
              it.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              <strong className="text-foreground">Pull the card out.</strong>
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Important for BiPAP users</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your bilevel settings (IPAP, EPAP, backup rate for ST/ASV modes) are stored in the
              machine&apos;s internal memory, not on the SD card. Removing the card does not change
              your therapy settings.
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
        <div className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Insert the SD card into your computer&apos;s card reader. The card appears as a
            removable drive.
          </p>
        </div>
      </section>

      {/* Step 4: What's on the card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 4: What&apos;s on the Card</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>The AirCurve folder structure mirrors the AirSense series:</p>
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
            The <strong className="text-foreground">DATALOG folder</strong> contains your nightly
            EDF files. For bilevel machines, these files include:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  Flow waveform data (same as CPAP models)
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  IPAP and EPAP pressure channels (instead of a single pressure channel)
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Pressure support data</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <p className="text-sm font-semibold text-foreground">
                  Respiratory events (apneas, hypopneas, central events)
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">
                  For ASV/CS models: target ventilation and minute ventilation data
                </p>
              </div>
            </div>
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
            <p>Select the SD card or DATALOG folder.</p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>AirwayLab auto-detects your AirCurve model and runs the analysis.</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Privacy</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All processing happens in your browser. Your data stays on your device.
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
          <p>AirwayLab&apos;s dashboard for bilevel data shows:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">AHI and event breakdown</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Including central events (relevant for ASV users).
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation scoring</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial airway narrowing detection across all breath shapes.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Pressure support analysis</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                IPAP/EPAP levels through the night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Breathing pattern metrics</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Regularity and stability of your breathing.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <p className="text-sm font-semibold text-foreground">Leak trends</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Mask seal performance over time.</p>
            </div>
          </div>
          <p>
            Bilevel users often have more complex therapy needs. The detailed breathing data from
            your SD card gives you and your clinician more information to work with than AHI alone.
          </p>
        </div>
      </section>

      {/* BiPAP-specific notes */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">BiPAP-Specific Notes</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">VAuto users</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Your machine adjusts EPAP automatically and varies pressure support. The SD card
              captures these adjustments breath by breath, so you can see exactly how the machine
              responded through the night.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              ST (Spontaneous-Timed) users
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              The data includes backup breath triggers. You can see when the machine initiated a
              breath versus when you did.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              ASV (Adaptive Servo-Ventilation) users
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              ASV data includes target ventilation and the machine&apos;s servo response. This is
              particularly useful data to share with your sleep specialist.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              I&apos;m on BiPAP. Is AirwayLab still useful for me?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. AirwayLab&apos;s flow limitation and breathing pattern analysis works with
              bilevel data. The core analysis -- detecting partial airway narrowing and breathing
              instability -- applies regardless of whether you&apos;re on CPAP or BiPAP.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Does AirwayLab show IPAP/EPAP separately?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. Bilevel sessions display both pressure channels so you can see how your machine
              adjusted throughout the night.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              My AirCurve has an older firmware. Will my data work?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              AirwayLab supports EDF files from all AirCurve 10 and AirCurve 11 firmware versions.
              If you run into an issue with a specific firmware version, let us know on the
              community page.
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
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>{' '}
            -- what flow limitation is and why it matters for bilevel users.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyse Your BiPAP Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your AirCurve SD card to AirwayLab and see your bilevel therapy data analysed in
          detail. Free, open source, and your data never leaves your browser.
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
