import Link from 'next/link';
import {
  Wind,
  AlertTriangle,
  BrainCircuit,
  BarChart3,
  BookOpen,
  ArrowRight,
  Lightbulb,
  Stethoscope,
} from 'lucide-react';

function BreathShapeDiagram() {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-border/50 bg-muted/20 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Inspiratory flow waveform shape
      </p>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
        {/* Normal breath */}
        <div className="flex flex-1 flex-col items-center gap-3">
          <svg
            viewBox="0 0 120 80"
            className="h-20 w-full max-w-[160px]"
            aria-label="Normal rounded inspiratory flow waveform"
          >
            <path
              d="M10,70 C20,70 30,10 60,10 C90,10 100,70 110,70"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line x1="10" y1="70" x2="110" y2="70" stroke="#4b5563" strokeWidth="1" />
          </svg>
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Normal</span>
            <br />
            Smooth, rounded peak
          </p>
        </div>
        {/* Flow-limited breath */}
        <div className="flex flex-1 flex-col items-center gap-3">
          <svg
            viewBox="0 0 120 80"
            className="h-20 w-full max-w-[160px]"
            aria-label="Flow-limited flattened inspiratory flow waveform"
          >
            <path
              d="M10,70 C20,70 28,22 38,20 L82,20 C92,20 100,70 110,70"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line x1="10" y1="70" x2="110" y2="70" stroke="#4b5563" strokeWidth="1" />
          </svg>
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Flow-limited</span>
            <br />
            Flattened plateau
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs italic text-muted-foreground/70">
        airwaylab.app &mdash; illustrative waveform shapes only, not clinical measurements
      </p>
    </div>
  );
}

export default function LowAHIStillTiredFlowLimitationRERAsPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your PAP machine gave you an AHI of 1.2. The app said it was a great night. You woke up
        exhausted anyway. If that pattern is familiar, you&apos;re not imagining it &mdash; and
        the explanation is almost certainly hiding in two things AHI was never designed to
        measure:{' '}
        <strong className="text-foreground">flow limitation</strong> and{' '}
        <strong className="text-foreground">RERAs</strong>.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        This article explains what these events are, why they don&apos;t show up in your AHI,
        how they fragment sleep without you knowing, and how tools like AirwayLab can surface
        them from the data already on your SD card.
      </p>

      {/* Section 1: What AHI Counts */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AHI Counts (and What It Ignores)</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Apnea-Hypopnea Index counts two types of events per hour of recorded sleep:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Apneas:</strong> complete cessation of
                airflow for at least 10 seconds
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Hypopneas:</strong> airflow reduction of 30%
                or more for at least 10 seconds, typically with a significant oxygen drop
              </span>
            </li>
          </ul>
          <p>
            Everything below those thresholds is invisible to AHI. Partial airway narrowing that
            restricts but does not block flow, brief arousals from sub-threshold breathing effort
            &mdash; none of it appears in the number your machine reports.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-medium text-amber-400">Why AHI was designed this way</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AHI was developed to capture the most severe airway events associated with oxygen
              desaturation and cardiac risk. It does that job well. It was not designed to
              capture every source of sleep fragmentation, particularly sub-threshold events that
              affect sleep architecture without causing desaturation.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Flow Limitation */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Flow Limitation: The Event AHI Was Not Built to See
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            During normal sleep, air moves through your upper airway in a smooth, rounded arc
            with each breath. When the airway partially narrows, that arc changes shape: the top
            flattens out into a plateau instead of a peak. Air still flows &mdash; the airway
            hasn&apos;t closed &mdash; but it&apos;s restricted.
          </p>
          <p>
            That shape change is <strong className="text-foreground">flow limitation</strong>.
            Your body responds to the extra breathing effort even when the airway restriction
            isn&apos;t severe enough to register as a hypopnea.
          </p>
          <BreathShapeDiagram />
          <p>
            Your ResMed SD card records breath-by-breath flow waveform data in EDF files. Tools
            like AirwayLab can score each breath for the degree of flattening using the{' '}
            <Link href="/blog/what-is-glasgow-index-cpap" className="text-primary hover:text-primary/80">
              Glasgow Index
            </Link>{' '}
            (breath shape scoring) and the{' '}
            <Link href="/glossary#fl-score" className="text-primary hover:text-primary/80">
              FL Score
            </Link>{' '}
            (percentage of breaths with significant flattening). These metrics make breath-shape patterns visible across entire sessions.
          </p>
        </div>
      </section>

      {/* Section 3: RERAs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            RERAs: When Flow Limitation Breaks Your Sleep
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A <strong className="text-foreground">Respiratory Effort-Related Arousal (RERA)</strong>{' '}
            is what happens at the end of a sequence of flow-limited breaths. After several
            seconds of restricted airflow, the increasing breathing effort crosses a threshold
            and triggers a brief arousal &mdash; a micro-waking that restores normal airflow and
            lets you settle back into sleep, often without conscious awareness.
          </p>
          <p>
            The difference between flow limitation and a RERA:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Flow limitation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The continuous partial narrowing event. Multiple consecutive flow-limited breaths
                build respiratory effort.
              </p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-sm font-semibold text-purple-400">RERA</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The brief arousal that terminates a bout of flow limitation. It resets normal
                airflow but fragments sleep architecture in the process.
              </p>
            </div>
          </div>
          <p>
            When RERAs occur frequently, the condition is sometimes called{' '}
            <strong className="text-foreground">Upper Airway Resistance Syndrome (UARS)</strong>.
            UARS is characterised by normal or near-normal AHI alongside significant sleep
            fragmentation from sub-threshold respiratory events. AHI alone cannot detect it.
          </p>
        </div>
      </section>

      {/* Section 4: Why They Leave You Exhausted */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why Flow Limitation and RERAs Leave You Exhausted
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The fatigue mechanism operates through three overlapping pathways:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Sleep architecture fragmentation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each RERA pulls you briefly toward lighter sleep or wakefulness. Frequent RERAs
                prevent the deep, consolidated sleep stages where physical and cognitive
                restoration occurs.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Autonomic nervous system activation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each arousal triggers a sympathetic stress response &mdash; a brief increase in
                heart rate and blood pressure. Repeated activation across a night accumulates
                physiological load even when you feel like you slept through it.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Cumulative respiratory effort</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hours of working against a partially narrowed airway is physically tiring,
                independent of sleep fragmentation. Your respiratory muscles have been working
                harder all night.
              </p>
            </div>
          </div>
          <p className="text-xs italic text-muted-foreground/80">
            These are descriptions of physiological patterns, not diagnostic criteria. Whether
            these patterns are contributing to your symptoms is a question for your clinician.
          </p>
        </div>
      </section>

      {/* Section 5: How to Find Them */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-green-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Find Flow Limitation and RERAs in Your PAP Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your ResMed SD card contains EDF files with full breath-by-breath waveform data.
            This is the same data that research tools use to calculate flow limitation metrics.
            AirwayLab analyses these files in your browser and computes:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-semibold text-green-400">Glasgow Index</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scores each breath&apos;s shape on 9 components (0–1 each) for an overall
                score from 0 (normal) to 9 (severely flow-limited). Session averages show trends over time.
              </p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-semibold text-green-400">FL Score</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The percentage of breaths in a session with clinically significant flow
                limitation. Lower values are typical of less flattened breath shapes; elevated values indicate more breath-shape flattening across the session.
              </p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-sm font-semibold text-green-400">NED + estimated RERA</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Normalised Event Density and an estimated RERA count derived from flow waveform
                analysis, giving a picture of respiratory event patterns beyond AHI.
              </p>
            </div>
          </div>
          <p>
            None of this requires uploading your data. AirwayLab processes everything locally in
            your browser using Web Workers. Your breathing data never leaves your device.
          </p>
        </div>
      </section>

      {/* Section 6: What You Can Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What You Can Do With This Information
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding your flow limitation and RERA patterns lets you do several useful
            things:
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
              <span>
                <strong className="text-foreground">Track trends over time.</strong> A Glasgow
                Index or FL Score that has been gradually increasing is a pattern worth
                tracking — your clinician can help interpret these findings in context.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
              <span>
                <strong className="text-foreground">Investigate H2 positional effects.</strong>{' '}
                Some users find flow limitation scores differ substantially between the first and
                second halves of the night, which can reflect positional or REM-related factors.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
              <span>
                <strong className="text-foreground">Correlate with symptoms.</strong> Nights with
                elevated flow limitation scores alongside poor subjective sleep quality give your
                clinician richer data to work with than AHI alone.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
              <span>
                <strong className="text-foreground">Share with your clinician.</strong>{' '}
                AirwayLab&apos;s session reports include flow limitation metrics alongside AHI
                data, giving your sleep specialist a fuller picture to discuss.
              </span>
            </li>
          </ul>
          <p className="text-xs italic text-muted-foreground/80">
            These are informational uses of your data. They do not substitute for clinical
            evaluation or advice about your therapy.
          </p>
        </div>
      </section>

      {/* Section 7: When to Discuss With Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to Discuss With Your Sleep Physician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Patterns in your data worth bringing to a clinical appointment include:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                Persistently low AHI alongside unresolved fatigue, morning headaches, or
                unrefreshing sleep
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                Elevated Glasgow Index or FL Score that has remained elevated or is trending upward
                over weeks
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>High estimated RERA counts alongside subjective sleep fragmentation</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                A large gap between H1 and H2 flow limitation scores that may reflect positional
                factors
              </span>
            </li>
          </ul>
          <p>
            Bring your AirwayLab session data to the appointment. Having objective metrics to
            point to gives your clinician more to work with than symptom description alone.
          </p>
        </div>
      </section>

      {/* Further Reading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation in PAP Therapy
            </Link>{' '}
            &mdash; a deep dive into what the Glasgow Index and FL Score actually measure.
          </p>
          <p className="mt-1">
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>{' '}
            &mdash; the research case for looking past the headline number.
          </p>
          <p className="mt-1">
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              Your AHI Is Normal But You&apos;re Still Exhausted
            </Link>{' '}
            &mdash; a practical guide to investigating persistent fatigue with PAP data.
          </p>
          <p className="mt-1">
            <Link href="/blog/arousals-vs-flow-limitation" className="text-primary hover:text-primary/80">
              Arousals vs Flow Limitation: What&apos;s Actually Waking You Up?
            </Link>{' '}
            &mdash; understanding the relationship between respiratory effort and sleep
            fragmentation.
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="mt-10 rounded-xl border border-border/30 bg-muted/10 p-5">
        <p className="text-xs leading-relaxed text-muted-foreground/70">
          <strong className="text-muted-foreground">Medical disclaimer:</strong> AirwayLab helps
          you understand your PAP data, but it is not a diagnostic tool and does not provide
          medical advice. The metrics described here are informational and intended to support
          conversations with your clinician &mdash; not to replace clinical evaluation. Always
          discuss your breathing data, symptoms, and therapy with a qualified sleep specialist.
        </p>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What AHI Is Hiding in Your Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your PAP machine already records flow waveform data. AirwayLab makes flow limitation
          and RERA patterns visible &mdash; for free, in your browser, with nothing uploaded.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Learn About Flow Limitation
          </Link>
        </div>
      </section>

      {/* Watermark / legal footer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source analysis tool. It is not a medical device and does not
        provide medical advice, diagnosis, or treatment recommendations. All analysis is
        informational &mdash; always discuss your breathing data and therapy with a qualified
        sleep specialist. Your data never leaves your browser.
      </p>
    </article>
  );
}
