import Link from 'next/link';
import {
  Brain,
  AlertTriangle,
  Activity,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function ArousalsVsFlowLimitationPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Sleep medicine has operated on a straightforward assumption for decades: arousals
        fragment sleep, fragmented sleep causes daytime symptoms. Reduce arousals, feel
        better. But a growing body of research is challenging this model at its
        foundation.
      </p>

      {/* The Standard Model */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Arousal-Fragmentation Model</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The textbook explanation for why sleep-disordered breathing causes daytime
            symptoms goes like this: your airway obstructs, your brain detects the problem,
            your brain wakes you up briefly (an arousal), you start breathing again, and
            then you fall back asleep. Repeat this dozens or hundreds of times a night, and
            you never get the sustained deep sleep your body needs.
          </p>
          <p>
            In this model, the arousal is the pivot point. It&apos;s the thing that breaks
            your sleep. Fewer arousals is one metric clinicians track.
          </p>
          <p>
            This model works well for severe obstructive sleep apnea. But at the milder end
            of the spectrum, it starts to break down.
          </p>
        </div>
      </section>

      {/* Where It Breaks Down */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Three Problems With the Arousal Model</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">1. AHI Doesn&apos;t Correlate With Symptoms</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dr. Avram Gold&apos;s research found no significant correlation between AHI
                and self-reported sleepiness or fatigue in patients with sleep-disordered
                breathing. Since most apneas and hypopneas terminate in an arousal, you
                should see a strong correlation if arousals are the primary symptom driver.
                The absence of that correlation undermines the entire model.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">2. Low-Arousal Patients Still Have Symptoms</p>
              <p className="mt-1 text-xs text-muted-foreground">
                People with low RERA indexes and low arousal indexes still present with
                classic UARS symptoms and improve with PAP therapy. If arousals were the
                necessary mechanism, these patients should feel fine. They don&apos;t.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">3. Flow Limitation Associated With Symptoms After Controlling for Arousals</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The 2024 Mann et al. study found that inspiratory flow limitation predicted
                excessive daytime sleepiness in people with AHI below 15, and this
                association held after controlling for arousal index. The arousals
                aren&apos;t doing the explanatory work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Alternative */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Limbic Stress Response Model</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Dr. Gold proposes a different mechanism entirely. In his model, the stress
            response in the limbic system to inspiratory flow limitation, and the resultant
            HPA axis activation via the amygdala-hypothalamus connection, is what drives
            symptoms.
          </p>
          <p>
            The upper airway contains pressure-sensing nerves that feed directly into the
            limbic system. When the airway narrows during inspiration, these nerves detect
            the increased resistance and trigger a subcortical stress response. This
            happens below the level of cortical arousal. Your brain doesn&apos;t need to
            &quot;wake up&quot; for your body to mount a full stress response.
          </p>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-sm font-semibold text-purple-400">The Mechanism</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inspiratory flow limitation activates pressure sensors in the upper airway.
              These signals reach the limbic system (specifically the amygdala), which
              activates the HPA axis via the hypothalamus. The result: cortisol release,
              sympathetic activation, and a chronic stress state that produces fatigue,
              sleepiness, and the constellation of somatic symptoms seen in UARS patients.
            </p>
          </div>
          <p>
            In this model, arousals are a secondary phenomenon. Some people develop more
            arousals once they become sensitized to flow limitation, but the arousals are
            not the primary cause of their symptoms. The stress response is.
          </p>
        </div>
      </section>

      {/* Supporting Evidence */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Evidence Shows</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Multiple lines of evidence support the idea that flow limitation, not arousals,
            is the primary driver:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Sleep Heart Health Study (1999):</strong>{' '}
                Snoring predicted daytime sleepiness in AHI &lt;5 individuals. RERAs did not
                explain this association.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Gold et al.:</strong> No correlation
                between AHI or %SpO2 &lt;90% and self-reported sleepiness or fatigue in
                OSA patients, despite most events ending in arousals.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Mann et al. (2024):</strong> Flow
                limitation predicted EDS in AHI &lt;15 patients, and the association held
                after controlling for arousal index.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Psychomotor vigilance:</strong> Increased
                flow limitation predicted more reaction time lapses on the PVT. AHI did not.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* What This Means For You */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What This Means for You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you&apos;re tracking your PAP therapy data, this research changes what you
            should be paying attention to:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Don&apos;t dismiss flow limitation
                because your arousal metrics look fine.</strong> The research suggests flow
                limitation can drive symptoms even without frequent arousals.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">A high arousal index is a useful
                signal, but not the whole picture.</strong> It tells you your nervous system
                is reacting to something. A low arousal index does not mean your breathing
                is problem-free.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Focus on reducing flow limitation
                directly.</strong> If the stress response to restricted airflow is the
                primary driver, then therapy optimization should target the airway
                restriction, not just the event count. Discuss your flow limitation data
                with your clinician.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">This is evolving science.</strong> Dr.
                Gold&apos;s model is peer-reviewed and gaining traction, but it has not been
                adopted as clinical consensus. It&apos;s a framework worth understanding,
                not a settled conclusion.
              </span>
            </li>
          </ul>
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
            Gold AR, Dipalo F, Gold MS, O&apos;Hearn D. (2003). &quot;The symptoms and
            signs of upper airway resistance syndrome: a link to the functional somatic
            syndromes.&quot; <em>Chest</em>, 123(1):87-95.
          </p>
          <p>
            Gold AR, Dipalo F, Gold MS, Broderick J. (2004). &quot;Inspiratory airflow
            dynamics during sleep in women with fibromyalgia.&quot; <em>Sleep</em>,
            27(3):459-66.
          </p>
          <p>
            Gottlieb DJ, Yao Q, Redline S, Ali T, Mahowald MW. (1999). &quot;Does snoring
            predict sleepiness independently of apnea and hypopnea frequency?&quot;{' '}
            <em>American Journal of Respiratory and Critical Care Medicine</em>,
            159(4):1351-1354.
          </p>
          <p>
            Mann DL, Staykov E, Georgeson T, et al. (2024). &quot;Flow Limitation Is
            Associated with Excessive Daytime Sleepiness in Individuals without Moderate
            or Severe Obstructive Sleep Apnea.&quot; <em>Annals of the American Thoracic
            Society</em>, 21(8):1186-1193.
          </p>
          <p>
            Gold AR, Stoohs RA. (2025). &quot;Objective versus subjective excessive
            daytime sleepiness in OSA: Quantifying the impact of fatigue.&quot;{' '}
            <em>Sleep Medicine</em>.
          </p>
        </div>
      </section>

      {/* Related articles */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation
            </Link>{' '}
            -- what flow limitation is, how the Glasgow Index scores it, and how to detect it in your data.
          </p>
          <p>
            <Link href="/blog/flow-limitation-and-sleepiness" className="text-primary hover:text-primary/80">
              Does Flow Limitation Drive Sleepiness?
            </Link>{' '}
            -- the evidence that flow limitation causes daytime symptoms independent of arousals.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            -- how AHI misses the majority of breathing problems.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Both Sides of the Equation</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to see flow limitation metrics (Glasgow Index, FL
          Score, NED) alongside your Respiratory Disruption Index. AirwayLab runs entirely in
          your browser. Free, open-source, and 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-is-cns-sensitization"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: CNS Sensitization
          </Link>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs text-muted-foreground/60 italic">
        AirwayLab is a free, open-source tool for analyzing PAP flow data. Your data never
        leaves your browser. Nothing on this page constitutes medical advice — always discuss
        your results with a qualified sleep specialist.
      </p>
    </article>
  );
}
