import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  HelpCircle,
  Lightbulb,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';

export default function WhatIsUARSPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have ever been told your sleep study was &ldquo;normal&rdquo; or your AHI is fine,
        but you still wake up exhausted every day — you are not imagining it.{' '}
        <strong className="text-foreground">
          Upper Airway Resistance Syndrome (UARS)
        </strong>{' '}
        is a real breathing disorder that standard AHI scoring routinely misses, and understanding
        what is UARS sleep apnea adjacent means understanding why so many PAP users spend years
        chasing a diagnosis that standard metrics cannot see.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide explains what UARS is, how it differs from obstructive sleep apnea (OSA), why
        the standard scoring systems are blind to it, and what your own therapy data might be
        showing you.
      </p>

      {/* Opening medical disclaimer */}
      <blockquote className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Medical disclaimer:</strong> This article is for
        informational and educational purposes only. Nothing here constitutes medical advice, a
        diagnosis, or a treatment recommendation. Always discuss your symptoms and therapy data
        with your prescribing clinician.
      </blockquote>

      {/* What Is UARS */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is UARS?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Upper Airway Resistance Syndrome is a sleep-related breathing disorder in which the
            airway repeatedly narrows during sleep, causing the airway to work harder to move air
            through. That extra effort triggers brief arousals — the brain waking the body just
            enough to restore normal breathing — without causing the full cessation of airflow that
            defines a classic apnea or hypopnea.
          </p>
          <p>
            The condition was first described by Christian Guilleminault and colleagues in the
            1990s. The core finding: people with UARS have normal or near-normal AHI scores yet
            wake repeatedly due to respiratory effort-related arousals (RERAs) and the
            physiological stress of fighting increased airway resistance with every breath.
          </p>
          <p>
            Think of it as your airway putting up resistance — not closing completely, but narrowing
            enough that breathing becomes labored. Your brain, sensing that effort, keeps pulling
            you out of deep sleep to protect the airway. You never get the restorative sleep you
            need, even though on paper nothing dramatic seems to be happening.
          </p>

          <h3 className="pt-2 text-base font-semibold text-foreground sm:text-lg">
            UARS vs OSA: Key Differences
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Feature</th>
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">OSA</th>
                  <th className="py-2 text-left font-semibold text-foreground">UARS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Airway event</td>
                  <td className="py-2 pr-4">Full/partial collapse (apnea/hypopnea)</td>
                  <td className="py-2">Narrowing, increased resistance</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Scored event</td>
                  <td className="py-2 pr-4">Apneas + hypopneas → AHI</td>
                  <td className="py-2">
                    <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
                      RERAs
                    </Link>{' '}
                    (not included in standard AHI)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">AHI result</td>
                  <td className="py-2 pr-4">Usually elevated</td>
                  <td className="py-2">Often normal or low</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Sleep continuity</td>
                  <td className="py-2 pr-4">Disrupted</td>
                  <td className="py-2">Disrupted</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Daytime symptoms</td>
                  <td className="py-2 pr-4">Sleepiness, fatigue</td>
                  <td className="py-2">
                    Fatigue, unrefreshing sleep, often more insomnia-type symptoms
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Demographics</td>
                  <td className="py-2 pr-4">More common in older males, higher BMI</td>
                  <td className="py-2">
                    More common in younger adults, females, thinner body types
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The critical point:{' '}
            <strong className="text-foreground">
              a low AHI does not rule out UARS
            </strong>
            . This is why many people with UARS spend years cycling through sleep studies with
            &ldquo;normal&rdquo; results.
          </p>
        </div>
      </section>

      {/* Why AHI Misses UARS */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why AHI Misses UARS</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The AHI — Apnea-Hypopnea Index — counts apneas and hypopneas per hour of sleep. An
            apnea is a complete stop in airflow. A hypopnea is a partial reduction, usually scored
            when airflow drops by ≥30% for ≥10 seconds with an associated arousal or oxygen
            desaturation.
          </p>
          <p>
            RERAs do not meet either threshold. There is no cessation of airflow, no desaturation.
            The airflow signal stays relatively intact. The only signature is the increased
            respiratory effort itself, which requires sophisticated equipment (esophageal
            manometry, or at minimum careful analysis of nasal pressure and respiratory effort
            belts) to detect reliably.
          </p>
          <p>
            Standard home sleep tests typically cannot detect RERAs at all. Even in-lab
            polysomnography often misses them unless the scoring technologist is specifically
            looking for flow limitation patterns and effort signals.
          </p>
          <p>
            The result is a scoring system that is excellent at detecting moderate-to-severe OSA,
            but genuinely blind to the kind of subtle, effort-driven disruption that defines UARS.
          </p>
          <p>
            If you&apos;ve seen people ask online{' '}
            <Link
              href="/blog/ahi-normal-still-tired"
              className="text-primary hover:text-primary/80"
            >
              &ldquo;why do I still feel tired with CPAP?&rdquo;
            </Link>{' '}
            — untreated or undertreated UARS is one of the most common answers.
          </p>
        </div>
      </section>

      {/* Flow Limitation */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Flow Limitation: The Signature UARS Leaves in Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Even if your sleep study missed UARS, your PAP therapy data may not. PAP machines —
            especially modern auto-titrating devices (APAP/CPAP/BiPAP) — capture a continuous
            record of your breathing waveforms throughout the night. Buried in that data is the
            signature that UARS leaves:{' '}
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              flow limitation
            </Link>
            .
          </p>
          <p>
            A non-flow-limited breath has a smooth, rounded top on the inspiratory waveform. A
            flow-limited breath — where the airway is narrowed and resistance is elevated — shows
            a flattened top, sometimes described as a &ldquo;plateau&rdquo; or &ldquo;mesa&rdquo;
            shape. This flattening happens because the airway is restricting how fast air can move
            in, regardless of how hard the respiratory muscles are working.
          </p>
          <p>Your PAP machine records this. AirwayLab reads it.</p>
          <p>
            When you{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              upload your SD card data and run an analysis
            </Link>
            , AirwayLab calculates a flow limitation index across your night&apos;s recording. You
            can see breath-by-breath whether your waveforms are rounded (non-flow-limited), or
            whether they show the flattened signature of increased resistance. You can also see how
            your{' '}
            <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
              RERAs
            </Link>{' '}
            — respiratory effort-related arousals — cluster across the night, and whether your
            pressure settings are allowing flow limitation to persist.
          </p>
          <p>
            For a deeper technical explanation of how flow limitation is detected and what it
            means, see our guide to{' '}
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              understanding flow limitation in your breathing data
            </Link>{' '}
            and the{' '}
            <Link
              href="/glossary/flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              flow limitation glossary entry
            </Link>
            .
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Seeing flow limitation in
              your data is informational. It is not a self-diagnosis. Discuss what you find with
              your clinician or sleep specialist.
            </p>
          </div>
        </div>
      </section>

      {/* Symptoms */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Symptoms Associated with UARS</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The research literature describes a cluster of symptoms commonly associated with UARS,
            though the condition is not yet universally defined by a single diagnostic standard.
            Commonly described features include:
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Unrefreshing sleep</strong> — waking after a
                full night feeling unrestored
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Fatigue and cognitive fog</strong> — difficulty
                concentrating, mental sluggishness despite adequate sleep duration
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Frequent awakenings</strong> — light sleep,
                difficulty maintaining deep sleep stages
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Insomnia-type symptoms</strong> — paradoxically,
                UARS is often associated with difficulty falling or staying asleep, unlike the
                classic OSA presentation
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Headaches on waking</strong> — sometimes
                attributed to the physiological stress of fragmented breathing
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">
                  Orthostatic intolerance / dysautonomia symptoms
                </strong>{' '}
                — some research links UARS to autonomic dysregulation, including low blood pressure
                symptoms and temperature dysregulation
              </span>
            </li>
          </ul>
          <p>
            The symptom overlap with conditions like chronic fatigue, fibromyalgia, and anxiety is
            significant, which is part of why UARS can take years to identify. Many people with
            UARS have previously been assessed for these conditions without resolution.
          </p>
        </div>
      </section>

      {/* What This Means for PAP Therapy */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What This Means for PAP Therapy</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If UARS is present and being treated with PAP therapy, therapy settings matter
            enormously. Flow limitation can persist at pressures that fully control apneas and
            hypopneas. Your AHI may look excellent on your device readout while flow limitation
            continues throughout the night, fragmenting your sleep.
          </p>
          <p>
            This is why looking beyond summary statistics matters.{' '}
            <Link href="/analyze" className="text-primary hover:text-primary/80">
              Your device data
            </Link>{' '}
            contains breath-by-breath information about what happened during your night. AirwayLab
            shows you:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How much of your sleep had flattened inspiratory waveforms
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">RERA events</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Where effort-related arousals appear in the night
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Pressure trends</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How pressure varied across the night relative to resistance patterns
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Waveform visualization</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                So you can see the shape of individual breaths for yourself
              </p>
            </div>
          </div>
          <p className="rounded-xl border border-border/50 p-3 text-xs text-muted-foreground">
            All of this analysis runs locally in your browser. Your data never leaves your device.
          </p>
          <p>
            What you do with that analysis is a conversation with your clinician — not something to
            act on alone. But having the data, seeing what it actually shows, changes the quality
            of that conversation.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Frequently Asked Questions About UARS
          </h2>
        </div>
        <dl className="mt-4 space-y-6">
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">Is UARS the same as sleep apnea?</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              UARS and obstructive sleep apnea (OSA) are related but distinct conditions. Both
              involve airway narrowing during sleep and disrupted sleep architecture. The key
              difference is the type of event: OSA is defined by apneas and hypopneas (complete or
              near-complete airflow reduction), while UARS is characterized by increased airway
              resistance and respiratory effort-related arousals without the airflow reduction
              threshold being met. Many clinicians consider UARS part of a spectrum of
              sleep-disordered breathing rather than a completely separate category.
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">
              Can someone have a normal sleep study but still have UARS?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Yes. Standard polysomnography and most home sleep tests score AHI (apneas +
              hypopneas per hour). UARS events —{' '}
              <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
                RERAs
              </Link>{' '}
              — are not included in AHI. A person with significant UARS may have an AHI below the
              diagnostic threshold for OSA while experiencing dozens of respiratory-effort arousals
              per hour. Some research suggests in-lab studies with esophageal manometry (measuring
              esophageal pressure as a proxy for respiratory effort) are more sensitive for
              detecting UARS, but this is not standard practice.
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">
              Why do I still feel tired even though my CPAP data looks good?
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              There are several possible reasons, and UARS or residual flow limitation is one of
              them. A low AHI on your device report does not mean your breathing was undisturbed.
              Flow limitation can persist without triggering scored events.{' '}
              <Link
                href="/blog/ahi-normal-still-tired"
                className="text-primary hover:text-primary/80"
              >
                This article explores that question in detail
              </Link>
              . Other causes include suboptimal pressure, pressure setting mismatch, mask leak, or
              sleep disorders not related to airway function. Discuss persistent fatigue with your
              clinical team.
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">Can PAP therapy treat UARS?</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              PAP therapy (CPAP, APAP, or BiPAP) is commonly used by people with UARS. Positive
              airway pressure addresses airway resistance by maintaining open airway patency
              throughout the night, which can reduce the frequency of effort-related arousals. The
              degree to which it resolves flow limitation varies between individuals and depends on
              factors including pressure settings and device type. Your clinician can help interpret
              your full data picture in context.
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">How is UARS diagnosed?</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is an area of active discussion in the sleep medicine community. There is no
              single universally accepted diagnostic standard. In practice, evaluation may involve
              in-lab polysomnography with attention to RERA scoring, clinical history, symptom
              presentation, and sometimes esophageal pressure monitoring. A sleep specialist
              familiar with RERA-based scoring and flow limitation analysis can provide further
              evaluation if UARS is suspected.
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <dt className="font-semibold text-foreground">What is a RERA?</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A Respiratory Effort-Related Arousal is a brief awakening from sleep caused by
              increased respiratory effort against airway resistance, without meeting the criteria
              for a scored apnea or hypopnea. RERAs are the defining event of UARS. Some PAP
              devices attempt to detect and log RERAs; AirwayLab can display RERA data when it is
              present in your device recording. See the{' '}
              <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
                RERA glossary entry
              </Link>{' '}
              for more detail.
            </dd>
          </div>
        </dl>
      </section>

      {/* Putting It Together */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Putting It Together</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            UARS is one of the more underrecognized conditions in sleep medicine — not because it
            is rare, but because the standard tools we use to measure sleep disorders were not
            designed to detect it. If you have been told your sleep is fine but you still wake
            exhausted, if your AHI is well-controlled but fatigue persists, additional context may
            be in the data your device has already collected.
          </p>
          <p>
            AirwayLab exists to help you see that data — to turn a night of therapy into something
            you can actually read and discuss with your clinician. The analysis is informational.
            The conversation it enables is real.
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
            This article is for informational and educational purposes only. AirwayLab is not a
            medical device and does not provide medical advice, diagnoses, or treatment
            recommendations. Always consult with a qualified healthcare provider regarding your
            sleep health and therapy.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What Your PAP Data Is Showing</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data and run an analysis. AirwayLab shows you flow limitation,
          RERA events, and pressure trends — free, open-source, and 100% private. Your data
          never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Upload Your SD Card Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Understanding Flow Limitation
          </Link>
        </div>
      </section>
    </article>
  );
}
