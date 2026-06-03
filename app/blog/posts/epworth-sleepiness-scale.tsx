import Link from 'next/link';
import {
  ClipboardList,
  AlertTriangle,
  Brain,
  Info,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Scale,
} from 'lucide-react';

export default function EpworthSleepinessScalePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You scored 8 on the Epworth Sleepiness Scale. Your doctor says that&apos;s
        normal. But you can barely get through the afternoon without feeling like
        you&apos;ve been hit by a truck.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If this sounds familiar, the problem might not be with you. It might be with the
        questionnaire.
      </p>

      {/* What the ESS Measures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is the Epworth Sleepiness Scale?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Epworth Sleepiness Scale (ESS) is an 8-question survey that asks how likely you
            are to doze off in everyday situations. You rate each situation from 0 (no chance of
            dozing) to 3 (high chance of dozing), for a total maximum score of 24. It was
            developed by Dr Murray Johns in 1991 and is now used in sleep clinics worldwide.
          </p>
          <p>The eight situations are:</p>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Sitting and reading</li>
            <li>Watching TV</li>
            <li>Sitting inactive in a public place (e.g. a meeting or theatre)</li>
            <li>As a passenger in a car for an hour without a break</li>
            <li>Lying down to rest in the afternoon when circumstances allow</li>
            <li>Sitting and talking to someone</li>
            <li>Sitting quietly after lunch (no alcohol)</li>
            <li>In a car, stopped for a few minutes in traffic</li>
          </ol>

          {/* Score range table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">ESS score</th>
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                <tr>
                  <td className="py-2 pr-4">0–9</td>
                  <td className="py-2">Normal range</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">10–15</td>
                  <td className="py-2">Mild to moderate excessive sleepiness</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">16–24</td>
                  <td className="py-2">Severe excessive sleepiness</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/70 italic">
            Score ranges are widely cited reference points; your sleep physician can help
            interpret your score in the context of your full clinical picture.
          </p>
          <p>
            A score above 10 is generally considered &quot;excessive sleepiness.&quot; Below
            10 is &quot;normal.&quot; There&apos;s just one problem: the scale conflates two
            fundamentally different things.
          </p>
        </div>
      </section>

      {/* Sleepiness vs Fatigue */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Sleepiness Is Not the Same Thing as Fatigue</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            <strong className="text-foreground">Objective sleepiness</strong> is the
            tendency to fall asleep. It can be measured with tools like the Multiple Sleep
            Latency Test (MSLT), which objectively measures how fast you fall asleep in
            controlled conditions. It&apos;s a specific physiological state.
          </p>
          <p>
            <strong className="text-foreground">Fatigue</strong> is the subjective
            experience of exhaustion, lack of energy, or feeling drained. You can be
            profoundly fatigued without being sleepy. Many people with chronic fatigue
            syndrome, fibromyalgia, or UARS describe being utterly exhausted but unable to
            nap, even when given the opportunity.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Objective Sleepiness</p>
              <p className="mt-1 text-xs text-muted-foreground">
                &quot;I will fall asleep if I sit still for 5 minutes.&quot; Measurable on
                MSLT. The brain is actively trying to initiate sleep.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Fatigue</p>
              <p className="mt-1 text-xs text-muted-foreground">
                &quot;I have no energy. Everything feels like effort. But I can&apos;t actually
                fall asleep.&quot; Not measurable on MSLT. The body is in a chronic stress
                or depletion state.
              </p>
            </div>
          </div>
          <p>
            The ESS asks you to rate your likelihood of <em>dozing</em>. If your primary
            symptom is fatigue rather than sleepiness, you&apos;ll score low on the ESS
            even though you&apos;re profoundly impaired. And your doctor will tell you
            you&apos;re fine.
          </p>
        </div>
      </section>

      {/* How doctors use the ESS */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How Doctors Use the ESS</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In clinical practice, the ESS is commonly used in three ways:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Pre-diagnosis screening.</strong> A score
                of 10 or above is often used as one signal — among others — that a patient
                may warrant further investigation for sleep-disordered breathing. It is not
                used in isolation to diagnose any condition.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Monitoring treatment response.</strong>{' '}
                Clinicians may re-administer the ESS after starting PAP therapy to see whether
                reported sleepiness changes. A lower score over time is one data point in a
                broader clinical review.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Research baseline.</strong> Many sleep
                studies enrol participants based partly on their ESS score, making it a
                consistent benchmark across the literature.
              </span>
            </li>
          </ul>
          <p>
            Your sleep physician will look at your ESS score alongside your full history,
            a physical examination, and objective sleep study data — not the ESS score alone.
          </p>
        </div>
      </section>

      {/* Gold & Stoohs Research */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Research That Quantifies This Problem</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Drs. Avram Gold and Riccardo Stoohs recently published a study in{' '}
            <em>Sleep Medicine</em> that directly addresses this issue. Their finding: the
            Epworth Sleepiness Scale measures an uninterpretable mix of objective sleepiness
            and fatigue.
          </p>
          <p>
            This matters because objective sleepiness and fatigue may have different
            underlying mechanisms. Objective sleepiness in OSA correlates with inflammation
            markers (IL-6) and decreased cortisol. Fatigue may be driven by chronic HPA axis
            activation from the stress response to flow limitation, which is a different
            pathway entirely.
          </p>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-sm font-semibold text-purple-400">Why This Matters Clinically</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you&apos;re using the ESS to screen for sleep-disordered breathing, and
              the patient&apos;s primary symptom is fatigue, the ESS will miss them. This is
              particularly relevant for UARS patients, who more commonly present with
              fatigue, insomnia, and somatic symptoms rather than classic &quot;can&apos;t
              stay awake&quot; sleepiness.
            </p>
          </div>
        </div>
      </section>

      {/* What This Means for UARS */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The UARS Blind Spot</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is where the ESS problem and the flow limitation research converge. Dr.
            Gold&apos;s earlier work showed that UARS patients (the mildest end of
            sleep-disordered breathing) actually have a <em>higher</em> prevalence of
            fatigue, insomnia, IBS, and headaches than patients with more severe OSA.
          </p>
          <p>
            If these patients present to a sleep clinic, they&apos;ll fill out the ESS.
            Many will score below 10 because their primary complaint is fatigue, not
            sleepiness. The clinic may conclude they don&apos;t have a significant sleep
            problem. And even if they get a sleep study, their AHI will be low.
          </p>
          <p>
            The result: the patients who may benefit most from recognizing and treating
            flow limitation are the ones most likely to be screened out by the standard
            tools.
          </p>
        </div>
      </section>

      {/* ESS vs STOP-BANG */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            ESS vs STOP-BANG: Different Tools for Different Questions
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A common question: &quot;if I score low on the Epworth, do I also score low on
            STOP-BANG?&quot; Not necessarily — because these questionnaires measure completely
            different things.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Tool</th>
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">What it measures</th>
                  <th className="py-2 text-left font-semibold text-foreground">What it does not measure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">ESS</td>
                  <td className="py-2 pr-4">Subjective daytime sleepiness (how likely you are to doze)</td>
                  <td className="py-2">OSA risk factors; fatigue; breathing events</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">STOP-BANG</td>
                  <td className="py-2 pr-4">Anatomical and lifestyle risk factors for OSA (snoring, BMI, neck circumference, etc.)</td>
                  <td className="py-2">Symptom severity; fatigue vs sleepiness distinction</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            You can have a high STOP-BANG score and a low ESS — particularly if your main
            symptom is fatigue rather than the urge to fall asleep. This is one reason why a
            low ESS does not rule out sleep-disordered breathing. Your clinician can advise
            which tools are appropriate for your specific situation.
          </p>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What You Can Do</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Know the difference.</strong> If your
                main complaint is fatigue or exhaustion rather than the urge to fall asleep,
                a low ESS score does not rule out a sleep-disordered breathing problem. Make
                sure your clinician knows the distinction.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Request objective testing.</strong> The
                MSLT measures objective sleepiness directly. If your ESS is low but you feel
                impaired, objective testing can reveal whether there&apos;s a measurable
                sleep drive issue vs. a fatigue issue.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Look at your breathing data
                directly.</strong> If you&apos;re on PAP therapy, your SD card contains
                breath-by-breath flow data that can reveal flow limitation your ESS score
                will never capture. Tools like AirwayLab can quantify this.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Advocate for yourself.</strong> Bring
                the research to your clinician. The Gold &amp; Stoohs paper provides a
                peer-reviewed basis for questioning ESS-only screening in patients whose
                symptoms are primarily fatigue.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">What is a normal Epworth Sleepiness Scale score?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A score of 0–9 is in the normal range. A score of 10 or above is in the excessive
              sleepiness range. Your sleep physician can put your score in context with your
              other symptoms and test results.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">What does an ESS score of 10 mean?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A score of 10 sits at the boundary between normal and mild-to-moderate excessive
              sleepiness. It is one data point — not a diagnosis. Discuss with your sleep
              physician what it means alongside your other symptoms.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">What does an ESS score of 16 or above mean?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A score of 16–24 is in the severe excessive sleepiness range. This is a signal to
              discuss further evaluation with your sleep specialist or GP.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">Can I have sleep apnea with a low Epworth score?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. A low ESS does not rule out sleep-disordered breathing. The ESS measures
              subjective sleepiness — but many people whose primary complaint is fatigue (rather
              than the urge to doze off) score low on the ESS even when their breathing data
              shows significant flow limitation or RERAs. A sleep study or objective data review
              gives a more complete picture.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">What is the difference between the ESS and STOP-BANG?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The ESS measures how sleepy you feel during the day. STOP-BANG assesses risk
              factors for obstructive sleep apnea (snoring, BMI, neck size, age, etc.). They
              measure different things and are often used together in a clinical assessment.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">How many questions does the Epworth Sleepiness Scale have?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The ESS has 8 questions. Each is rated 0–3, giving a maximum score of 24.
            </p>
          </div>
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
            Gold AR, Stoohs RA. (2025). &quot;Objective versus subjective excessive
            daytime sleepiness in OSA: Quantifying the impact of fatigue.&quot;{' '}
            <em>Sleep Medicine</em>.
          </p>
          <p>
            Johns MW. (1991). &quot;A new method for measuring daytime sleepiness: the
            Epworth Sleepiness Scale.&quot; <em>Sleep</em>, 14(6):540-545.
          </p>
          <p>
            Gold AR, Dipalo F, Gold MS, O&apos;Hearn D. (2003). &quot;The symptoms and
            signs of upper airway resistance syndrome: a link to the functional somatic
            syndromes.&quot; <em>Chest</em>, 123(1):87-95.
          </p>
          <p>
            Vgontzas AN, Bixler EO, Chrousos GP. (2006). &quot;Obesity-related
            sleepiness and fatigue: the role of the stress system and cytokines.&quot;{' '}
            <em>Annals of the New York Academy of Sciences</em>, 1083:329-344.
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
            -- how to detect flow limitation in your PAP data with the Glasgow Index and NED.
          </p>
          <p>
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              AHI Normal But Still Exhausted?
            </Link>{' '}
            -- why a low AHI alone may not capture the full picture.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Look Beyond the Questionnaire</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to measure flow limitation directly from your
          breathing data. Your FL Score, Glasgow Index, and NED don&apos;t care what you
          scored on the ESS. Free, open-source, and 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/flow-limitation-and-sleepiness"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Does Flow Limitation Drive Sleepiness?
          </Link>
        </div>
      </section>

      {/* YMYL disclosure — verbatim AIR-1611 */}
      <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        This article is for educational and informational purposes only. It has not been
        reviewed by a licensed clinician and is not a substitute for professional medical
        advice. Consult your sleep specialist or healthcare provider before making any
        changes to your therapy.
      </p>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs text-muted-foreground/60 italic">
        AirwayLab is a free, open-source tool for analyzing PAP flow data. Your data never
        leaves your browser. Nothing on this page constitutes medical advice — always discuss
        your results with a qualified sleep specialist.
      </p>
    </article>
  );
}
