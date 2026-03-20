import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Eye,
  Scale,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';

export default function WhyAHIIsLyingPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your CPAP machine congratulates you every morning. AHI: 1.2. Therapy working.
        But you drag yourself out of bed feeling like you slept in a cement mixer. Sound
        familiar? You are not imagining it. And it is not &quot;just stress.&quot;{' '}
        <strong className="text-foreground">
          The metric your entire treatment is built on has a fundamental design flaw
        </strong>
        , and thousands of CPAP users are paying the price.
      </p>

      {/* The Indictment */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI Was Never Designed to Measure Sleep Quality</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Let&apos;s be clear about what AHI actually is. The Apnea-Hypopnea Index counts two things:
            complete breathing stops (apneas) and partial breathing reductions (hypopneas). To count,
            each event must last at least 10 seconds and meet strict criteria -- typically a 3-4% drop
            in blood oxygen or a visible arousal on EEG.
          </p>
          <p>
            That is it. That is the entire scoring system sleep medicine has relied on since the 1990s.
            It was designed for one job: diagnosing obstructive sleep apnea in a lab setting. It was
            never intended as a comprehensive measure of how well your therapy is working, or whether
            your airway is truly open while you sleep.
          </p>
          <p>
            And yet that is exactly how it is used. Your device summarises an entire night into a single
            number. Your sleep physician checks that number once a quarter. Your insurance company uses
            it to decide whether you deserve treatment. A number that, by design, cannot see the majority
            of breathing problems.
          </p>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="text-sm font-semibold text-rose-400">The core problem</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A night with <strong className="text-foreground">hundreds of flow-limited breaths</strong> --
              your airway narrowed, your body straining to pull air through a partially collapsed
              passage -- can produce an AHI of <strong className="text-foreground">zero</strong>. The
              metric says you are fine. Your body knows otherwise.
            </p>
          </div>
        </div>
      </section>

      {/* The Evidence */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Evidence Is Damning</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is not a fringe opinion. The research community has been raising alarms about AHI for
            over a decade. Here is what the evidence shows:
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">AHI fails to predict who gets better</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Multiple studies have found poor correlation between AHI reduction and symptom improvement.
                Patients with an AHI of 30 sometimes feel identical to patients with an AHI of 3.
                The 2016 SAVE trial -- one of the largest randomised controlled trials of PAP therapy --
                showed no reduction in cardiovascular events despite successful AHI suppression in over
                2,600 patients.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">The 10-second minimum is arbitrary</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A breathing disturbance lasting 9.5 seconds is invisible to AHI. One lasting 10.1 seconds
                counts. A 60-second apnea that tanks your oxygen to 70% counts the same as a 10-second
                event with a 3% dip. Equal events. Wildly unequal consequences.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">UARS exists precisely because AHI fails</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href="/glossary#uars" className="text-primary hover:text-primary/80">
                  Upper Airway Resistance Syndrome
                </Link>{' '}
                was defined by Dr. Christian Guilleminault in the 1990s to describe patients with significant
                sleep disruption from airway resistance that AHI could not capture. The fact that an entire
                syndrome had to be invented to describe what AHI misses tells you everything about the
                metric&apos;s limitations.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation drives symptoms directly</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Research from Dr. Avram Gold suggests that inspiratory flow limitation itself -- not just
                the arousals it causes -- can drive daytime symptoms through activation of the limbic
                system and HPA axis. Your body mounts a stress response to the effort of breathing
                through a narrowed airway, even when you never fully &quot;wake up.&quot; AHI does not
                see this. It does not even try.
              </p>
            </div>
          </div>

          <p>
            Even the American Academy of Sleep Medicine (AASM) has acknowledged that AHI has significant
            limitations as a standalone metric. The field is slowly moving toward multi-dimensional
            assessment. Slowly being the operative word.
          </p>
        </div>
      </section>

      {/* What your device hides */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Five Things AHI Cannot See</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your PAP device records detailed breath-by-breath flow waveforms to its SD card every night.
            But the summary screen boils all of that data down to one number. Here is what it throws
            away:
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  1. Flow limitation severity
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The{' '}
                <Link href="/glossary#glasgow-index" className="text-primary hover:text-primary/80">
                  Glasgow Index
                </Link>{' '}
                scores inspiratory flow shapes across 9 components, capturing the full spectrum of airway
                narrowing from subtle flattening to severe obstruction. A high Glasgow score means your
                breaths are distorted -- your airway is fighting you -- even when AHI sees nothing wrong.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  2. Breathing regularity
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sample Entropy measures how chaotic your breathing pattern is. Healthy sleep produces
                rhythmic, predictable breathing. High irregularity signals an unstable airway or
                ventilatory control problem that AHI will never flag because no single breath crosses
                the event threshold.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  3. RERAs (Respiratory Effort-Related Arousals)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sequences of flow-limited breaths that end in a micro-arousal. Your brain wakes just
                enough to restore airflow, then drops back to sleep. This happens dozens of times per
                night in some patients -- each one fragmenting sleep architecture. AHI does not count
                a single one of them.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  4. Negative Effort Dependence
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href="/glossary#ned" className="text-primary hover:text-primary/80">NED</Link>{' '}
                measures whether airflow decreases as respiratory effort increases -- the hallmark of a
                collapsing airway. A high NED value means your airway is actively working against you,
                breath by breath. The per-breath Flatness Index and M-shape detection add further nuance
                that a single AHI number cannot express.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  5. How the night changes over time
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your first half and second half of sleep are physiologically different. REM sleep clusters
                in the second half, and airway tone changes throughout the night. The H1/H2 split in
                flow limitation metrics often reveals that your therapy works fine early but breaks down
                during the critical REM-heavy hours. AHI averages everything into one flat number,
                erasing the story.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Periodicity */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Pattern AHI Cannot Detect</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            There is one more blind spot worth calling out: periodicity. Some patients show cyclical
            patterns of breathing disturbance -- their airflow waxes and wanes on 30 to 100-second
            cycles. This periodic breathing pattern suggests ventilatory instability, a marker of
            loop gain problems that standard AHI scoring ignores entirely.
          </p>
          <p>
            The Periodicity Index (derived via FFT analysis of flow data) can detect these cycles
            automatically. Combined with the other metrics above, it paints a picture of respiratory
            health that no single number can capture. Your device has the data. It just never shows
            you.
          </p>
        </div>
      </section>

      {/* What to do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">So What Do You Actually Do?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            First:{' '}
            <strong className="text-foreground">do not stop PAP therapy.</strong>{' '}
            AHI is a flawed metric, but it is not useless. It catches the big events -- complete
            airway closures and significant partial collapses. Those still matter. The problem is
            not that AHI is measured. The problem is that it is the <em>only</em> thing measured.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Look beyond the summary screen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your PAP machine&apos;s SD card contains detailed flow waveform data from every night --
                far more granular than the summary your app shows you. Tools that analyse this raw data
                can score{' '}
                <Link href="/glossary#flow-limitation" className="text-primary hover:text-primary/80">
                  flow limitation
                </Link>
                , estimate RERAs, measure breathing regularity, and detect periodic patterns that AHI
                will never show.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Track trends, not single nights</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A single night can be noisy. Position, alcohol, allergies, stress -- all affect results.
                What matters is the trend across weeks or months. Is your flow limitation improving or
                worsening? Are your breathing patterns more regular over time? Trend data gives you and
                your clinician a baseline to measure progress against.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Bring data, not complaints</p>
              <p className="mt-1 text-xs text-muted-foreground">
                &quot;I still feel tired&quot; is easy for a clinician to dismiss. A report showing
                elevated Glasgow scores, high FL percentage, and estimated RERAs despite a low AHI is
                not. Objective data changes the conversation from &quot;your numbers look fine&quot; to
                &quot;let&apos;s look at pressure adjustments.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The bigger picture */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">This Is a Systems Problem, Not a Patient Problem</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you have been told your numbers look great while you still feel terrible, understand:
            the system failed you, not the other way around. Sleep medicine has relied on a single metric
            for three decades because it is simple, standardised, and easy to bill against. Not because
            it is sufficient.
          </p>
          <p>
            The research has moved on. The clinical guidelines are slowly catching up. But your device
            firmware and your insurance company&apos;s compliance algorithm have not. Until they do,
            the gap between what AHI says and how you feel will keep widening for a significant
            percentage of treated patients.
          </p>
          <p>
            The good news: the data to close that gap already exists on your SD card. You just need the
            right tools to read it.
          </p>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">References</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            McEvoy et al. (2016). &quot;CPAP for Prevention of Cardiovascular Events in
            Obstructive Sleep Apnea (SAVE Trial).&quot; <em>New England Journal of Medicine</em>,
            375(10), 919-931.
          </p>
          <p>
            Guilleminault et al. (1993). &quot;A cause of excessive daytime sleepiness: The upper
            airway resistance syndrome.&quot; <em>CHEST Journal</em>, 104(3), 781-787.
          </p>
          <p>
            Gold et al. (2003). &quot;The symptoms and signs of upper airway resistance
            syndrome.&quot; <em>CHEST Journal</em>, 123(1), 87-95.
          </p>
          <p>
            Azarbarzin et al. (2019). &quot;The Hypoxic Burden of Sleep Apnoea Predicts
            Cardiovascular Disease-Related Mortality.&quot; <em>European Heart Journal</em>,
            40(14), 1149-1157.
          </p>
          <p>
            Punjabi et al. (2008). &quot;Sleep-disordered breathing and mortality: A prospective
            cohort study.&quot; <em>PLoS Medicine</em>, 5(8), e173.
          </p>

          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
              </Link>{' '}
              -- the research case for multi-dimensional sleep assessment.
            </p>
            <p className="mt-1">
              <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
                Your AHI Is Normal But You&apos;re Still Exhausted
              </Link>{' '}
              -- a practical guide to identifying flow limitation in your own data.
            </p>
            <p className="mt-1">
              <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
                Understanding Flow Limitation
              </Link>{' '}
              -- what flow limitation is, why it matters, and how to detect it.
            </p>
            <p className="mt-1">
              <Link href="/glossary" className="text-primary hover:text-primary/80">
                AirwayLab Glossary
              </Link>{' '}
              -- definitions of all metrics mentioned in this article.
            </p>
          </div>
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
            AirwayLab is an educational tool, not a medical device. The analysis provided is based on
            published research methodologies applied to your PAP device&apos;s flow data, but it is
            not a substitute for polysomnography or clinical evaluation. Always discuss therapy
            changes with your sleep physician. The metrics described here are for educational
            purposes and to support informed conversations with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What AHI Is Hiding</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab runs four research-grade analysis engines on your ResMed SD card data --
          Glasgow Index, FL Score, NED, RERA estimation -- and shows you the breathing patterns
          your device&apos;s summary screen discards. Free, open-source, and 100% private. Your
          data never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Understanding Flow Limitation
          </Link>
        </div>
      </section>
    </article>
  );
}
