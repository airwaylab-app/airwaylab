import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  FileBarChart,
  HardDrive,
  Heart,
  Lightbulb,
  MonitorSmartphone,
  Share2,
  Stethoscope,
  Wind,
} from 'lucide-react';

export default function HowToReadCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your PAP machine records thousands of data points every night. Breathing flow, leak rates,
        pressure changes, events per hour. All of it sitting on an SD card, waiting to be read.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        But most people never look at it. And the ones who do? They see a single number: AHI.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Here&apos;s the thing. An AHI of 2 doesn&apos;t mean your therapy is sorted. Millions of
        PAP users have an AHI under 5 and still wake up exhausted. The reason is that AHI only
        counts complete airway closures and significant partial closures. It misses the subtler
        stuff -- flow limitation, breathing pattern instability, respiratory effort-related arousals
        (RERAs) -- that can fragment your sleep just as effectively.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you want to actually understand what&apos;s happening while you sleep, you need to learn
        how to read your CPAP data properly. All of it. Not just the summary screen on your machine.
      </p>

      {/* What Your PAP Machine Actually Records */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Your PAP Machine Actually Records
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Every modern ResMed and Philips machine writes detailed session data to its SD card. The
            exact data varies by model, but typically includes:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Flow waveform data</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The raw airflow signal, measured breath by breath, usually at 25 samples per second.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Pressure data</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The pressure your machine delivered throughout the night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Leak rate</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How much air escaped from your mask seal.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <p className="text-sm font-semibold text-foreground">Events</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Apneas (complete airway closures), hypopneas (partial closures), and sometimes
                central events.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Machine settings</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your prescribed pressure, mode, and response settings.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-sm font-semibold text-foreground">Session timing</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                When you put the mask on, when you took it off, total usage time.
              </p>
            </div>
          </div>
          <p>
            This data is stored in EDF (European Data Format) files. Your machine&apos;s summary
            screen only shows a fraction of what&apos;s in there.
          </p>
        </div>
      </section>

      {/* The AHI Problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            The AHI Problem
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI (Apnea-Hypopnea Index) is the standard metric. It counts the number of apneas and
            hypopneas per hour of sleep. An AHI under 5 is generally considered in the typical range
            for treated PAP users.
          </p>
          <p>But AHI has blind spots:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                When your airway narrows but doesn&apos;t collapse enough to register as an event,
                your AHI stays low while your breathing quality degrades.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">RERAs</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Respiratory effort-related arousals cause brief wake-ups that fragment sleep, but
                most machines don&apos;t count them in AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">
                  Breathing pattern instability
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Periodic breathing, irregular tidal volume, and variable breath timing all affect
                sleep quality without showing up in the AHI count.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">
                  Positional and temporal patterns
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your AHI might average 2 for the whole night but spike to 8 in the first half,
                suggesting something specific is happening in early sleep.
              </p>
            </div>
          </div>
          <p>
            This is why the PAP community has been reading raw data for years. People on forums
            like ApneaBoard and r/SleepApnea learned long ago that AHI alone doesn&apos;t tell the
            full story.
          </p>
        </div>
      </section>

      {/* How to Read Your CPAP Data: Tools and Approaches */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FileBarChart className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Read Your CPAP Data: Tools and Approaches
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            There are several ways to dig into your data. Each has strengths depending on what
            you&apos;re looking for.
          </p>
        </div>

        {/* OSCAR */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">
            OSCAR (Open Source CPAP Analysis Reporter)
          </h3>
          <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              OSCAR is the gold standard for viewing raw PAP data. It&apos;s a desktop application
              that reads your SD card and displays detailed waveforms, event flags, pressure graphs,
              and session summaries. If you want to see every individual breath and manually inspect
              your flow data, OSCAR is the tool for that.
            </p>
            <p>
              OSCAR&apos;s strength is depth. You can zoom into a specific two-minute window and see
              exactly what your airflow looked like during a cluster of events. It&apos;s invaluable
              for understanding what&apos;s happening breath by breath.
            </p>
            <p>
              The tradeoff is that OSCAR shows you everything and leaves interpretation up to you.
              Reading raw waveforms requires time and knowledge. Many people download OSCAR, see the
              dense graphs, and aren&apos;t sure what they&apos;re looking at.
            </p>
          </div>
        </div>

        {/* AirwayLab */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">
            AirwayLab (Browser-Based Analysis)
          </h3>
          <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              AirwayLab takes a different approach. Instead of showing you raw waveforms, it runs
              your flow data through scoring algorithms -- the Glasgow Index for breath shape
              analysis, NED for negative effort dependence, WAT for breathing regularity and
              periodicity -- and presents the results as scored metrics with context.
            </p>
            <p>
              You drag your SD card folder into your browser. AirwayLab parses the EDF files, runs
              all four analysis engines, and gives you a dashboard with traffic-light indicators,
              trend charts, and night-by-night comparisons. Everything runs in your browser. Your
              data never leaves your device.
            </p>
            <p>
              AirwayLab complements OSCAR. OSCAR shows you the raw waveforms. AirwayLab scores and
              interprets the patterns across nights. Many users use both -- OSCAR for deep-dive
              investigation and AirwayLab for the bigger picture.
            </p>
          </div>
        </div>

        {/* Manufacturer Apps */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">
            Your Machine&apos;s App (myAir, DreamMapper)
          </h3>
          <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Manufacturer apps like myAir provide a simplified summary. They&apos;re convenient but
              limited to what the manufacturer chooses to show -- usually AHI, usage hours, leak
              rate, and a compliance score. They don&apos;t expose the raw flow data or any analysis
              beyond basic event counting.
            </p>
          </div>
        </div>
      </section>

      {/* Key Metrics Beyond AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Key Metrics Beyond AHI
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Once you start reading your CPAP data beyond the summary screen, here are the metrics
            that tell you more:
          </p>
        </div>

        {/* Flow Limitation Metrics */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5">
            <Wind className="h-4 w-4 text-blue-400" />
            <h3 className="text-lg font-bold text-foreground">Flow Limitation Metrics</h3>
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Glasgow Index</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Scores the shape of each inspiratory flow curve on a 0 to 9 scale. A normal breath
                has a rounded inspiratory flow shape. As the airway narrows, the shape flattens,
                skews, or develops multiple peaks. The Glasgow Index captures this with nine
                components: skew, spike, flat top, top-heavy, multi-peak, no-pause, inspiratory
                rate, multi-breath, and variable amplitude. Higher scores indicate more distorted
                breath shapes.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">FL Score</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Measures inspiratory flatness on a 0 to 100 scale. Flat-topped inspiratory flow
                curves are a characteristic pattern seen in flow-limited breathing. Higher values
                indicate flatter, more restricted breathing patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Breathing Pattern Metrics */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5">
            <Brain className="h-4 w-4 text-purple-400" />
            <h3 className="text-lg font-bold text-foreground">Breathing Pattern Metrics</h3>
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Regularity (Sample Entropy)</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Quantifies how predictable your minute-by-minute breathing pattern is. Lower entropy
                means more regular breathing. Higher values indicate more variable breathing
                patterns.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Periodicity Index</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Uses frequency analysis to detect cyclical breathing patterns in the 30 to 100
                second range. This is the frequency range associated with periodic breathing
                patterns, where ventilation rises and falls in a repeating wave pattern.
              </p>
            </div>
          </div>
        </div>

        {/* Effort and Arousal Metrics */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
            <h3 className="text-lg font-bold text-foreground">Effort and Arousal Metrics</h3>
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                NED (Negative Effort Dependence)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Measures whether airflow decreases during a breath despite continued effort. High
                NED values indicate that airflow decreases during the breath despite continued
                inspiratory effort.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flatness Index</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The ratio of mean to peak flow within each breath. Lower values mean more peaked,
                less restricted breathing. Higher values indicate flatter, more restricted flow
                profiles.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Estimated Arousal Index (EAI)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Identifies brief spikes in respiratory rate and tidal volume that coincide with
                changes in breathing pattern, even when they don&apos;t trigger a scored event.
              </p>
            </div>
          </div>
        </div>

        {/* Oximetry Metrics */}
        <div className="mt-6">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-red-400" />
            <h3 className="text-lg font-bold text-foreground">
              Oximetry Metrics (If You Have a Pulse Oximeter)
            </h3>
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">ODI-3 and ODI-4</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Oxygen Desaturation Indices counting drops of 3% or 4% from a rolling baseline.
                These correlate with respiratory events but are measured independently from airflow.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Heart rate surges</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Brief increases in heart rate that often accompany respiratory arousals. Counted
                using clinical thresholds (8, 10, 12, and 15 bpm above baseline).
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Coupled events</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                When an oxygen desaturation and a heart rate surge occur within 30 seconds of each
                other, they are counted as a coupled event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reading Your Data: A Practical Example */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Reading Your Data: A Practical Example
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Say you pull your SD card and load your data. Your AHI is{' '}
            <span className="font-mono text-foreground">1.8</span> -- well within the typical
            range. But you&apos;re still tired.
          </p>
          <p>Here&apos;s what deeper analysis might show:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Glasgow Index of{' '}
                  <span className="font-mono">4.2</span>
                </span>{' '}
                -- Your breath shapes are moderately distorted. This is higher than the lower range
                where most unrestricted breathing falls.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">FL Score of{' '}
                  <span className="font-mono">62</span>
                </span>{' '}
                -- Inspiratory flow curves are substantially flattened, as reflected in an elevated
                FL Score. These patterns are not captured by event-based AHI scoring.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Periodicity Index of{' '}
                  <span className="font-mono">0.15</span>
                </span>{' '}
                -- There&apos;s a cyclical component to your breathing in the 30 to 100 second
                range.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">First-half vs second-half split</span> -- Your NED
                values are <span className="font-mono">28%</span> in the first half of the night
                and <span className="font-mono">12%</span> in the second half, showing the pattern
                is concentrated in early sleep.
              </p>
            </div>
          </div>
          <p>
            None of these show up in AHI. But together, they paint a much more detailed picture of
            your breathing patterns -- the kind of information your clinician can interpret alongside
            your clinical history.
          </p>
        </div>
      </section>

      {/* Getting Started */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <MonitorSmartphone className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Getting Started</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Reading your data takes three things:</p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Your SD card</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Remove it from your PAP machine. Most ResMed machines use a standard SD card in a
                  slot on the side or back.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">A card reader</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any USB SD card reader works. Many laptops have built-in slots.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">An analysis tool</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Load your data into OSCAR for raw waveform viewing, AirwayLab for automated
                  scoring and pattern analysis, or both for the complete picture.
                </p>
              </div>
            </div>
          </div>
          <p>
            With AirwayLab, you drag your SD card&apos;s DATALOG folder into the browser window.
            Analysis runs in about 30 seconds for a typical card with weeks of data. No account
            required, no data uploaded, no installation needed. Your results are saved locally and
            persist for 30 days.
          </p>
          <p>
            If you also use a Viatom or Checkme O2 Max pulse oximeter, you can upload that CSV
            alongside your SD card data for combined respiratory and oximetry analysis.
          </p>
        </div>
      </section>

      {/* Sharing Your Results */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Share2 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Sharing Your Results</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your data gives you a detailed picture of your breathing patterns. This information is
            most valuable when shared with your sleep physician or clinician, who can interpret it
            alongside your full clinical context -- your sleep study results, symptoms, medical
            history, and physical examination.
          </p>
          <p>
            The PAP community is also a great resource. Forums like ApneaBoard, r/SleepApnea, and
            r/CPAP have knowledgeable members who&apos;ve been reading their own data for years.
            AirwayLab includes a forum export feature that formats your results for sharing in these
            communities, complete with all relevant metrics and context.
          </p>
        </div>
      </section>

      {/* Your Data Belongs to You */}
      <section className="mt-10">
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            Your Data Belongs to You
          </h2>
          <p>
            Your PAP machine generates detailed information about your breathing every single night.
            That data belongs to you. Reading it, understanding it, and sharing it with your
            clinician is how you become an informed participant in your own care.
          </p>
          <p>
            AHI is a starting point, not the finish line. The real story is in the flow shapes, the
            breathing patterns, the temporal trends across nights and weeks. Learning how to read
            your CPAP data is the first step toward understanding that story.
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
            AirwayLab is not a medical device. The analysis provided is informational and
            educational. Always discuss your results with your sleep physician or clinician.
            AirwayLab does not diagnose, treat, or provide clinical recommendations.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">
          See Your Breathing Patterns Scored and Visualised
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag your SD card folder into AirwayLab and see your breathing patterns scored and
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
