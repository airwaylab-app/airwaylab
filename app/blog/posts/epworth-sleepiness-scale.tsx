import Link from 'next/link';
import {
  ClipboardList,
  AlertTriangle,
  Brain,
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
          <h2 className="text-xl font-bold sm:text-2xl">What the ESS Actually Asks</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Epworth Sleepiness Scale is an 8-question survey that asks you to rate how
            likely you are to doze off in various situations: sitting and reading, watching
            TV, sitting in a meeting, lying down in the afternoon. You rate each from 0
            (no chance of dozing) to 3 (high chance), for a maximum score of 24.
          </p>
          <p>
            A score above 10 is generally considered &quot;excessive sleepiness.&quot;
            Below 10 is &quot;normal.&quot; The ESS has been the standard tool for
            assessing daytime sleepiness in sleep medicine since 1991, and it&apos;s used
            in virtually every sleep clinic in the world.
          </p>
          <p>
            There&apos;s just one problem: it conflates two fundamentally different things.
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

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs text-muted-foreground/60 italic">
        AirwayLab is a free, open-source tool for analyzing PAP flow data. Your data never
        leaves your browser. Nothing on this page constitutes medical advice — always discuss
        your results with a qualified sleep specialist.
      </p>
    </article>
  );
}
