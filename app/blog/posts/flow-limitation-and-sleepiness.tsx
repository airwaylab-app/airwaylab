import Link from 'next/link';
import {
  Wind,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Brain,
} from 'lucide-react';

export default function FlowLimitationAndSleepinessPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AHI is 2. Your arousal index is low. Your sleep study looks normal. So why
        are you exhausted?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        A growing body of evidence suggests the answer may be simpler than anyone
        expected: <strong className="text-foreground">inspiratory flow limitation itself
        drives daytime sleepiness</strong>, independent of arousals, independent of AHI,
        and independent of oxygen desaturation.
      </p>

      {/* The Assumption */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Assumption Sleep Medicine Built On</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            For decades, the causal chain in sleep medicine has looked like this: airway
            obstruction causes arousals, arousals fragment sleep, fragmented sleep causes
            daytime symptoms. Treat the obstruction, reduce the arousals, fix the symptoms.
          </p>
          <p>
            This model works well for moderate-to-severe obstructive sleep apnea. But it
            falls apart for the millions of people with subtle breathing disruption who are
            still symptomatic. If arousals are the bottleneck, why do some people with very
            few arousals feel terrible? And why do some people with high arousal indexes
            feel fine?
          </p>
        </div>
      </section>

      {/* The SHHS Evidence */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Sleep Heart Health Study Found</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Sleep Heart Health Study, one of the largest community-based sleep
            studies ever conducted, showed something remarkable back in 1999. Among
            participants with AHI below 5 (essentially &quot;normal&quot; by clinical
            standards), snoring was a significant predictor of self-reported daytime
            sleepiness.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">The Striking Finding</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The difference in sleepiness between snorers and non-snorers in the AHI &lt;5
              group was <em>larger</em> than the difference between mild and severe OSA. Snoring
              is a direct marker of inspiratory flow limitation. And RERAs (respiratory
              effort-related arousals) did not explain this association.
            </p>
          </div>
          <p>
            In other words: the vibration of the airway during restricted breathing
            predicted sleepiness better than the severity of full-blown sleep apnea. And
            arousals were not the mechanism.
          </p>
        </div>
      </section>

      {/* Mann et al. */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Flow Limitation Predicts Sleepiness After Controlling for Arousals</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A 2024 study by Mann et al., published in the <em>Annals of the American
            Thoracic Society</em>, provided the most direct evidence yet. The researchers
            analyzed 772 individuals from the MESA sleep cohort, all with AHI below 15.
          </p>
          <p>
            They measured the frequency of inspiratory flow limitation directly from nasal
            airflow signals during polysomnography. The result: a twofold increase in flow
            limitation frequency was associated with a twofold increase in the risk of
            excessive daytime sleepiness.
          </p>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">The Critical Detail</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This association held after controlling for arousal index. Flow limitation
              predicted sleepiness independently of how many times the brain woke up during
              the night. Arousals were not the mediator.
            </p>
          </div>
          <p>
            A separate study found that increased flow limitation also predicted worse
            performance on the psychomotor vigilance task (a measure of reaction time and
            sustained attention), while AHI did not. The airway restriction itself, not the
            downstream events it triggers, appears to be what impairs daytime function.
          </p>
        </div>
      </section>

      {/* Gold's Theory */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Would Flow Limitation Itself Cause Symptoms?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Dr. Avram Gold, a pulmonary and critical care physician at Stony Brook
            University, has proposed a mechanism. In his model, inspiratory flow limitation
            activates a stress response in the limbic system via pressure-sensing nerves in
            the upper airway. This triggers the HPA axis (the body&apos;s central stress
            response system) through the amygdala-hypothalamus connection.
          </p>
          <p>
            The key insight: it&apos;s the <em>stress response to restricted airflow</em> that
            drives symptoms, not the cortical arousals that may or may not accompany it.
            The brain doesn&apos;t need to fully wake up for the body to mount a stress
            response to breathing difficulty.
          </p>
          <p>
            Gold&apos;s own research found no correlation between AHI and self-reported
            sleepiness or fatigue in patients with sleep-disordered breathing. Since most
            apneas and hypopneas terminate in an arousal, you would expect a strong
            correlation if arousals were the primary symptom driver. The absence of that
            correlation is telling.
          </p>
        </div>
      </section>

      {/* What This Means */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What This Means for Tracking Your Therapy</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If flow limitation itself is a primary driver of symptoms, then the metrics
            that matter most are the ones that measure flow limitation directly, not just
            the downstream events it sometimes causes.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">FL Score and Glasgow Index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                These measure the degree and prevalence of flow limitation directly from
                your breathing waveforms. In the context of this research, they may be
                closer to the primary driver of your symptoms than arousal-based metrics.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">NED and Flatness Index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Per-breath measures of how much your airway restricts airflow during
                inspiration. A high NED or flatness index means the airway is partially
                narrowing during each breath, regardless of whether that triggers an arousal.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Respiratory Disruption Index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Still useful as a marker of your nervous system&apos;s response to breathing
                difficulty, but not necessarily the explanation for your symptoms. An elevated
                RDI tells you your brain is reacting to something. A low RDI does not mean
                nothing is wrong.
              </p>
            </div>
          </div>
          <p>
            The practical takeaway: if your flow limitation metrics are elevated, that
            matters, even if your arousal metrics look fine. The absence of arousals does
            not mean the absence of a problem. Discuss your flow limitation data with your
            clinician.
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
            Gottlieb DJ, Yao Q, Redline S, Ali T, Mahowald MW. (1999). &quot;Does snoring
            predict sleepiness independently of apnea and hypopnea frequency?&quot;{' '}
            <em>American Journal of Respiratory and Critical Care Medicine</em>,
            159(4):1351-1354.
          </p>
          <p>
            Mann DL, Staykov E, Georgeson T, Azarbarzin A, Kainulainen S, Redline S,
            Sands SA, Terrill PI. (2024). &quot;Flow Limitation Is Associated with
            Excessive Daytime Sleepiness in Individuals without Moderate or Severe
            Obstructive Sleep Apnea.&quot; <em>Annals of the American Thoracic Society</em>,
            21(8):1186-1193.
          </p>
          <p>
            Gold AR, Dipalo F, Gold MS, O&apos;Hearn D. (2003). &quot;The symptoms and
            signs of upper airway resistance syndrome: a link to the functional somatic
            syndromes.&quot; <em>Chest</em>, 123(1):87-95.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Measure Your Flow Limitation Directly</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to see your FL Score, Glasgow Index, NED, and
          Respiratory Disruption Index side by side. AirwayLab runs entirely in your browser.
          Free, open-source, and 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/arousals-vs-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Arousals Don&apos;t Tell the Whole Story
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
