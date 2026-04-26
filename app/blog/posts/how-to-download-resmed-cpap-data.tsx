import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronRight,
  FolderOpen,
  HardDrive,
  Info,
  Smartphone,
  Stethoscope,
  XCircle,
} from 'lucide-react';

export default function HowToDownloadResMedCPAPData() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your ResMed device records detailed breathing data every single night — flow waveforms,
        pressure adjustments, leak rates, and event timestamps. But when you check the myAir app
        each morning, you see a simplified score.{' '}
        <strong className="text-foreground">
          The full data is still there, on the SD card inside your machine.
        </strong>{' '}
        This guide shows you exactly how to access it, whether you have an AirSense 10 or an
        AirSense 11.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is not a medical device, and nothing here
          constitutes a diagnosis or treatment recommendation. Always discuss your therapy data and
          any concerns with a qualified sleep specialist or clinician.
        </p>
      </div>

      {/* What Your ResMed Device Actually Records */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Your ResMed Device Actually Records
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            ResMed devices record two distinct layers of data simultaneously. One goes to myAir.
            The other stays on the SD card.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Summary data (myAir / cloud)</p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                  <span>Usage hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                  <span>Headline AHI (apnea-hypopnea index)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                  <span>Mask fit / leak rate score</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                  <span>myAir daily &ldquo;score&rdquo;</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                Detailed data (SD card / EDF files)
              </p>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>Continuous flow waveform (breath-by-breath)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>Pressure changes throughout the night</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>Detailed leak rate over time</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>Individual event timestamps (apneas, hypopneas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>SpO₂ and heart rate (if oximetry sensor present)</span>
                </li>
              </ul>
            </div>
          </div>
          <p>
            The EDF files on the SD card are the same files that OSCAR, SleepHQ, and AirwayLab use
            for detailed analysis. myAir only shows you the summary layer.
          </p>
        </div>
      </section>

      {/* What myAir Shows — and What It Doesn't */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What myAir Shows &mdash; and What It Doesn&apos;t
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="mb-3 text-xs font-semibold text-emerald-400">myAir shows</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Usage duration each session</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Nightly AHI score</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Mask fit percentage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>Overall daily score</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="mb-3 text-xs font-semibold text-rose-400">myAir does not show</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>Raw flow waveform data</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>Flow limitation percentage or patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>RERA-type breathing events</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>Access to your EDF files</span>
                </li>
              </ul>
            </div>
          </div>
          <p>
            myAir is a convenient compliance monitoring tool. Detailed analysis of breathing
            patterns &mdash; including flow limitation, breathing regularity, and event timing
            &mdash; requires access to the SD card data. Your clinician can help interpret the full
            picture from the detailed data.
          </p>
        </div>
      </section>

      {/* AirSense 10: How to Download */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AirSense 10: How to Download Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <p>
              <strong className="text-foreground">Power off your AirSense 10.</strong> Unplug the
              machine from power.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              <strong className="text-foreground">Locate the SD card slot</strong> on the right
              side of the machine (when facing it from the front). There is a small rubber cover
              protecting the slot.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              <strong className="text-foreground">Remove the SD card.</strong> Press the card
              inward gently until it clicks, then let it spring out. Pull it free.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              <strong className="text-foreground">Insert the SD card into your computer.</strong>{' '}
              Use a built-in SD slot or a USB SD card reader. The card appears as a removable drive.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              5
            </span>
            <p>
              <strong className="text-foreground">Open the DATALOG folder</strong> on the card.
              This folder contains your session data in EDF format, organised by date.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-emerald-400" />
              <p className="text-xs font-semibold text-foreground">Tip</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Removing the SD card does not erase your data or reset your machine settings. Your
              AirSense 10 stores therapy settings internally. It is safe to remove and reinsert
              the card at any time when the machine is powered off.
            </p>
          </div>
        </div>
      </section>

      {/* AirSense 11: How to Download */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AirSense 11: How to Download Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <p>
              <strong className="text-foreground">Power off your AirSense 11.</strong> Unplug the
              machine from power.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p>
              <strong className="text-foreground">Find the SD card slot</strong> on the left side
              of the machine, behind a small cover panel. The AirSense 11 uses a{' '}
              <strong className="text-foreground">micro SD card</strong>, often seated inside a
              full-size adapter.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <p>
              <strong className="text-foreground">Remove the card.</strong> Press gently until it
              clicks and springs out. If a micro SD is inside an adapter, remove the whole
              assembly.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <p>
              <strong className="text-foreground">Insert into your computer.</strong> If you have a
              micro SD in an adapter, insert the adapter into your computer&apos;s standard SD
              slot. The card appears as a removable drive.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-border/50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              5
            </span>
            <p>
              <strong className="text-foreground">Open the DATALOG folder.</strong> The folder
              structure is the same as the AirSense 10: date-organised subfolders containing EDF
              session files.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              <p className="text-xs font-semibold text-foreground">AirSense 11 note</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Some AirSense 11 units ship without a pre-installed SD card. If your machine has no
              card, insert any Class 10 micro SD (8 GB or larger, formatted FAT32). The device
              will begin recording detailed session data from the next therapy session.
            </p>
          </div>
        </div>
      </section>

      {/* What's on the SD Card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What&apos;s on the SD Card</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you open the SD card on your computer, you will see a folder structure like this:
          </p>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <pre className="text-xs text-muted-foreground">
              {`SD Card/
├── DATALOG/
│   ├── 20260101/
│   │   ├── BRP.edf        ← continuous flow waveform
│   │   ├── EVE.edf        ← event log (apneas, hypopneas)
│   │   └── SAD.edf        ← SpO₂/HR data (if sensor present)
│   ├── 20260102/
│   └── ...
├── SETTINGS/
├── Identification.tgt     ← device model info
└── STR.edf                ← machine settings`}
            </pre>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">BRP.edf</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The most important file. BRP stands for Breathing. This EDF file contains the
                continuous flow waveform — the breath-by-breath airflow signal recorded at 25 Hz.
                It is what tools like AirwayLab use to detect flow limitation patterns, RERA-type
                events, and breathing regularity metrics.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">EVE.edf</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The event log: timestamped apnea, hypopnea, and other event records from the
                device&apos;s own detection algorithms. This is what your AHI is calculated from.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">SAD.edf</p>
              <p className="mt-1 text-xs text-muted-foreground">
                SpO₂ and heart rate data from an attached oximeter. Present only if you are using
                a compatible ResMed oximeter. Not all users will have this file.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beyond myAir: Tools That Show More */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Beyond myAir: Tools That Show More</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Once you have access to your SD card data, two main tools can open it for detailed
            analysis:
          </p>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-5">
              <p className="text-sm font-semibold text-foreground">OSCAR</p>
              <p className="mt-2 text-xs text-muted-foreground">
                A free, open-source desktop application for Windows, Mac, and Linux. OSCAR reads
                your EDF files and displays charts for flow, pressure, leak rate, and events. It
                requires installation and runs entirely on your computer — no data leaves your
                device. A solid choice for users who prefer a desktop tool.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                See also:{' '}
                <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
                  OSCAR Alternative: Browser-Based CPAP Analysis
                </Link>
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground">AirwayLab</p>
              <p className="mt-2 text-xs text-muted-foreground">
                A browser-based analysis tool. Drag your DATALOG folder into AirwayLab and your
                data loads immediately — no installation, no account, and no data upload required.
                All processing runs in your browser. AirwayLab adds four analysis engines on top
                of basic CPAP charts: the Glasgow Index (breath shape scoring), WAT (breathing
                regularity and periodicity), NED (flow limitation and estimated RERA patterns), and
                an oximetry pipeline with 17 metrics.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                See how it compares:{' '}
                <Link
                  href="/blog/resmed-sd-card-browser-analysis"
                  className="text-primary hover:text-primary/80"
                >
                  Analysing Your ResMed SD Card in the Browser
                </Link>
              </p>
            </div>
          </div>
          <p>
            Both tools are complementary to myAir, not a replacement for it. myAir handles daily
            compliance tracking and syncing with your sleep clinic. These tools give you the
            detailed view when you want to understand what&apos;s happening breath by breath. Your
            clinician can help interpret the findings from either tool.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              How do I download data from my ResMed AirSense 10?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Power off the machine, remove the SD card from the right side panel, insert it into
              your computer, and open the DATALOG folder. The .edf files inside contain your full
              therapy data. Analysis tools like OSCAR and AirwayLab can read these files directly.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Does ResMed AirSense 11 have an SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. The AirSense 11 uses a micro SD card rather than a standard SD card. Some units
              shipped without a card pre-installed &mdash; you can insert a Class 10 micro SD (8 GB
              or larger) and the device will begin recording detailed data from the next session.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              What does myAir not show you?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              myAir shows usage hours, headline AHI, and leak rate. It does not provide raw flow
              waveforms, flow limitation data, RERA patterns, or access to your EDF files. Detailed
              analysis of breathing patterns requires tools that read the SD card data directly.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              How do I read EDF files from my ResMed CPAP?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              EDF (European Data Format) files from a ResMed SD card can be read by OSCAR
              (desktop) or AirwayLab (browser-based, no install). You do not need to convert or
              open the files manually &mdash; just point the tool at your DATALOG folder.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              What is the DATALOG folder on my ResMed SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              DATALOG is the main folder on your ResMed SD card containing your therapy session
              files. Inside it are subfolders organised by date, each containing .edf files &mdash;
              including BRP.edf (the continuous flow waveform) and, if applicable, SAD.edf
              (SpO₂ data).
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Can I read my ResMed CPAP data without installing software?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. AirwayLab runs entirely in your browser &mdash; drag your DATALOG folder in and
              your data loads immediately. No installation, no account, and no upload required.
            </p>
          </div>
        </div>
      </section>

      {/* Related articles */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Related Articles</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/how-to-export-understand-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Export and Understand Your CPAP Data
            </Link>{' '}
            &mdash; a broader guide covering all major CPAP brands, not just ResMed.
          </p>
          <p className="mt-1">
            <Link
              href="/blog/resmed-sd-card-browser-analysis"
              className="text-primary hover:text-primary/80"
            >
              Analysing Your ResMed SD Card in the Browser
            </Link>{' '}
            &mdash; what AirwayLab extracts from your DATALOG files and how.
          </p>
          <p className="mt-1">
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation in CPAP Data
            </Link>{' '}
            &mdash; the breathing pattern your flow waveform reveals beyond AHI.
          </p>
          <p className="mt-1">
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              OSCAR Alternative: Browser-Based CPAP Analysis
            </Link>{' '}
            &mdash; comparing OSCAR and AirwayLab for ResMed data analysis.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is an educational tool, not a medical device. The analysis provided is based
            on published research methodologies applied to your PAP device&apos;s flow data, but it
            is not a substitute for polysomnography or clinical evaluation. Always discuss your
            therapy data with your sleep physician. The metrics described here are for educational
            purposes and to support informed conversations with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyse Your ResMed Data Now</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your DATALOG folder to AirwayLab for instant browser-based analysis. No
          installation, no account, and your data never leaves your device.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/how-to-export-understand-cpap-data"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How to Export CPAP Data
          </Link>
        </div>
      </section>
    </article>
  );
}
