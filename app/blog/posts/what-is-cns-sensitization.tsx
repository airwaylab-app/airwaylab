import Link from 'next/link';
import {
  AlertTriangle,
  Brain,
  Activity,
  Lightbulb,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function CNSSensitizationPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You&apos;ve been on CPAP or BiPAP for months. Your AHI is under 5. Your doctor says
        you&apos;re treated. But you&apos;re still exhausted, still waking up multiple times a
        night, still dragging through every day.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If this sounds familiar, you&apos;re not alone — and there may be a reason your data
        tells a confusing story.
      </p>

      {/* The Mismatch */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            The Mismatch That Doesn&apos;t Make Sense
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Most sleep-disordered breathing follows a predictable logic: more severe airway
            obstruction causes more arousals, which causes more daytime symptoms. Treat the
            obstruction, reduce the arousals, feel better.
          </p>
          <p>
            But some people show a pattern that breaks this logic entirely. Their flow limitation
            is mild — maybe a Glasgow Index of 1 or 2. Their airway isn&apos;t collapsing
            dramatically. Yet their estimated arousal index is sky-high: 40, 60, even over 100
            events per hour. Their brain is reacting as though something catastrophic is happening,
            even though the breathing disruption is minor.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-400">The Key Pattern</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Low Glasgow Index (mild flow limitation) paired with a high Estimated Arousal Index
              (frequent arousals). If you&apos;ve seen this in your AirwayLab data, you&apos;re
              looking at a pattern researchers have been studying for over two decades.
            </p>
          </div>
        </div>
      </section>

      {/* The Sensitization Theory */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Sensitization Theory</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Dr. Avram Gold, a pulmonary and critical care physician at Stony Brook University,
            has spent much of his career investigating why some people with relatively mild
            breathing disruption develop severe, life-altering symptoms.
          </p>
          <p>
            His research, published in journals including <em>Chest</em> (2003) and{' '}
            <em>Sleep</em> (2004), proposes that the problem isn&apos;t the breathing disruption
            itself — it&apos;s the brain&apos;s response to it.
          </p>
          <p>
            The olfactory nerve, which runs through the nasal passages, doesn&apos;t just detect
            smells. It also senses changes in air pressure. This nerve connects directly to the
            limbic system — the part of the brain that governs the stress response, emotions, and
            the fight-or-flight reaction.
          </p>
          <p>
            In Gold&apos;s model, a period of significant stress — an infection, trauma, surgery,
            or a major life event — activates the body&apos;s stress response system (the HPA
            axis). In people who already have some degree of sleep-disordered breathing (even very
            mild), this activation can sensitize the limbic system to perceive each subtle
            reduction in airflow as danger.
          </p>
          <p>
            Once this sensitization takes hold, the brain begins triggering arousal responses —
            not because the airway obstruction is severe, but because the nervous system has
            learned to treat even minor flow limitation as an emergency. The result is fragmented
            sleep, unrefreshing rest, and a constellation of daytime symptoms that feel wildly
            disproportionate to what the breathing data shows.
          </p>
        </div>
      </section>

      {/* UARS, CFS, Fibromyalgia */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why This Matters for UARS, CFS, and Fibromyalgia
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Gold&apos;s published work found that patients with UARS — the mildest end of the
            sleep-disordered breathing spectrum — actually had a <em>higher</em> prevalence of
            certain symptoms compared to patients with more severe obstructive sleep apnea.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-400">2003 Study (Chest)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sleep-onset insomnia, headaches, irritable bowel syndrome, and alpha-delta sleep
                all became more common as the severity of airway obstruction{' '}
                <em>decreased</em>.
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-400">2004 Study (Sleep)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Women diagnosed with fibromyalgia showed inspiratory airflow patterns during sleep
                that were essentially identical to those of women with UARS.
              </p>
            </div>
          </div>
          <p>
            This is counterintuitive, and it&apos;s exactly what makes the sensitization model
            compelling: the symptoms aren&apos;t proportional to the breathing problem.
            They&apos;re proportional to the brain&apos;s reaction to it.
          </p>
          <p>
            This line of research has gained renewed interest in the ME/CFS, fibromyalgia, and
            POTS communities, where patients are increasingly recognizing that their symptoms may
            be connected to subtle sleep-disordered breathing that conventional sleep studies miss
            entirely.
          </p>
        </div>
      </section>

      {/* What AirwayLab Can Show You */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Can Show You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab already calculates the two key metrics on both sides of this equation:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">The Glasgow Index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures flow limitation severity by analyzing the shape of your inspiratory
                airflow across nine components — including skew, variable amplitude, and
                multi-peak patterns. A low Glasgow Index means your airway is relatively stable,
                with minimal obstruction.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  The Estimated Arousal Index (EAI)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures how frequently your breathing pattern shows signs of arousal — sudden
                changes in respiratory rate and tidal volume that suggest your brain is repeatedly
                interrupting sleep.
              </p>
            </div>
          </div>
          <p>
            When these two metrics tell different stories — mild flow limitation but extreme
            arousal frequency — you may be looking at the sensitization pattern. Your airway
            isn&apos;t the main problem. Your brain&apos;s response to your airway is.
          </p>
          <p>
            This isn&apos;t something OSCAR or your PAP machine&apos;s built-in software can
            show you. AHI doesn&apos;t capture it. Even RERA scoring only tells you part of the
            story. The relationship <em>between</em> the severity of your flow limitation and the
            magnitude of your arousal response is what makes this pattern visible — and that
            requires analyzing both simultaneously.
          </p>
        </div>
      </section>

      {/* What This Doesn't Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">What This Doesn&apos;t Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                This is an area of <strong className="text-foreground">active research</strong>,
                not established clinical consensus. While Gold&apos;s work is peer-reviewed and
                the theory is gaining traction, it hasn&apos;t been adopted as a standard
                diagnostic framework.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                AirwayLab&apos;s detection of this pattern is{' '}
                <strong className="text-foreground">experimental</strong>. We surface the
                mismatch because we believe the data is valuable — but we are not diagnosing
                sensitization.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>
                The EAI is an <em>estimate</em> derived from flow data, not from EEG. A true
                arousal index requires brain wave monitoring during a polysomnogram. The EAI is a
                useful proxy, but it&apos;s not a direct measurement.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What You Can Do</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If your AirwayLab data shows this mismatch pattern, here are some concrete steps:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">
                  Discuss it with your sleep specialist.
                </strong>{' '}
                Bring your AirwayLab report. Point to the gap between your Glasgow Index and your
                EAI. Ask whether a sensitization component might be contributing to your residual
                symptoms.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">
                  Request a thorough in-lab polysomnography
                </strong>{' '}
                if you haven&apos;t had one recently. Home sleep tests typically don&apos;t
                capture RERAs or the subtle flow limitation patterns that characterize UARS.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Look beyond the airway.</strong> If CNS
                sensitization is part of the picture, purely respiratory interventions may not
                resolve your symptoms on their own. Some patients benefit from approaches that
                address the nervous system component — though this is highly individual and
                should be guided by a clinician.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Track your trends.</strong> AirwayLab&apos;s
                multi-night view lets you see whether the mismatch is consistent or variable. If
                your EAI is always high regardless of what your Glasgow does, that&apos;s a
                meaningful pattern worth sharing with your doctor.
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
            Gold AR, Dipalo F, Gold MS, O&apos;Hearn D. (2003). &quot;The symptoms and signs
            of upper airway resistance syndrome: a link to the functional somatic
            syndromes.&quot; <em>Chest</em>, 123(1):87-95.
          </p>
          <p>
            Gold AR, Dipalo F, Gold MS, Broderick J. (2004). &quot;Inspiratory airflow dynamics
            during sleep in women with fibromyalgia.&quot; <em>Sleep</em>, 27(3):459-66.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See If Your Data Shows This Pattern</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to see your Glasgow Index alongside your Estimated Arousal
          Index. AirwayLab will flag the mismatch automatically if it&apos;s present. Free,
          open-source, and 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/beyond-ahi"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Beyond AHI
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
