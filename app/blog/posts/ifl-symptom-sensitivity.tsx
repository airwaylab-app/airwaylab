import Link from 'next/link';
import {
  Fingerprint,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Users,
  Star,
} from 'lucide-react';

export default function IFLSymptomSensitivityPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Two people. Same PAP machine, same pressure settings, same 40% flow limitation.
        One wakes up exhausted. The other feels fine. If flow limitation drives symptoms,
        why doesn&apos;t everyone with the same FL% feel the same?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        The answer is <strong className="text-foreground">individual sensitivity</strong>.
        Not everyone responds to flow limitation the same way. And until now, there was no
        way to figure out whether <em>your</em> flow limitation is actually causing{' '}
        <em>your</em> symptoms.
      </p>

      {/* The Problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Missing Piece in Flow Limitation Analysis</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab already measures flow limitation from multiple angles: the Glasgow Index
            scores your overall breathing shape, FL Score quantifies inspiratory flatness, NED
            detects per-breath flow drops, and IFL Symptom Risk combines them into a single
            percentage. These metrics tell you <em>how much</em> flow limitation you have.
          </p>
          <p>
            But they can&apos;t tell you whether that flow limitation is actually causing your
            symptoms. A 45% IFL Risk might mean debilitating fatigue for one person and nothing
            noticeable for another. The metrics measure the airway. They don&apos;t measure the
            person attached to it.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-400">The IFL Sensitivity Hypothesis</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dr. Avram Gold&apos;s research suggests that flow limitation activates a stress
              response via pressure-sensing nerves in the upper airway. But the <em>magnitude</em> of
              that stress response varies between individuals. Some nervous systems react strongly to
              mild airflow restriction. Others tolerate significant flow limitation without noticeable
              symptoms. This individual variation is what makes population-level thresholds unreliable
              for predicting <em>your</em> experience.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Tracking Your Own Correlation</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The only way to know if your flow limitation is driving your symptoms is to track
            both simultaneously and look for patterns. That&apos;s the idea behind AirwayLab&apos;s
            symptom self-report: a simple 1-5 rating of how you feel each morning, stored
            alongside your flow limitation data.
          </p>
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { n: 1, label: 'Terrible', color: 'text-red-400 border-red-500/20 bg-red-500/5' },
              { n: 2, label: 'Poor', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
              { n: 3, label: 'Fair', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' },
              { n: 4, label: 'Good', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
              { n: 5, label: 'Great', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
            ].map(({ n, label, color }) => (
              <div key={n} className={`rounded-xl border p-3 text-center ${color}`}>
                <p className="text-lg font-bold">{n}</p>
                <p className="text-[10px]">{label}</p>
              </div>
            ))}
          </div>
          <p>
            One tap, every morning. No questionnaires, no scales to decode. Just: how do
            you feel today? Over time, the pattern tells you what no single metric can.
          </p>
        </div>
      </section>

      {/* What the Patterns Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Three Patterns That Tell You Something</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When AirwayLab has both your flow data and your symptom rating for a night, it can
            cross-reference them. Three patterns are particularly informative:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-amber-400">High IFL + Feeling Bad</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your flow limitation metrics are correlating with your reported symptoms. This
                pattern may be worth discussing with your clinician, who can evaluate these
                findings in your clinical context.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-blue-400">High IFL + Feeling Fine</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your flow limitation is elevated but you&apos;re not symptomatic. This is genuinely
                useful information. It suggests you may have lower sensitivity to flow limitation,
                which means aggressive pressure increases to chase a &quot;perfect&quot; FL score may
                not improve your quality of life. Not all flow limitation requires intervention.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-blue-400">Low IFL + Feeling Bad</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your flow limitation is minimal but you still feel terrible. This points away from
                flow limitation as the cause of your symptoms. Consider other factors: sleep
                fragmentation from non-respiratory causes, medication side effects, sleep hygiene,
                comorbid conditions, or factors captured in your Night Notes (caffeine, alcohol,
                congestion, stress).
              </p>
            </div>
          </div>
          <p>
            None of these patterns are diagnostic on their own. But tracked over weeks, they
            build a picture of your individual sensitivity that no single-night analysis can
            provide. And they give your clinician concrete data to work with.
          </p>
        </div>
      </section>

      {/* Community Comparison */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How You Compare to Others Like You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Individual tracking is valuable. But context makes it more valuable. When you opt in
            to data contribution, AirwayLab can show you how other people with similar IFL Risk
            levels rate their sleep quality.
          </p>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">What Gets Shared</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your symptom rating (1-5), IFL Risk percentage, a few key metrics (Glasgow, FL Score,
              NED), your pressure range, PAP mode, and device model. No dates, no names, no timestamps,
              no raw waveforms. The data is anonymised with a one-way hash — it cannot be traced back
              to you. If you&apos;re not comfortable sharing, the symptom rating still works entirely
              locally.
            </p>
          </div>
          <p>
            Seeing that 70% of people with your IFL Risk level rate their sleep as Good or Great
            gives you genuinely useful context: maybe your symptoms aren&apos;t coming from flow
            limitation. Seeing that most people in your range feel similarly bad validates your
            experience and gives weight to a conversation with your clinician about pressure
            optimisation.
          </p>
        </div>
      </section>

      {/* Practical Guide */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to Get the Most Out of Symptom Tracking</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Rate consistently</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Rate how you feel within the first hour of waking, before caffeine. The rating is
                  subjective by design — your internal reference point is what matters, not an
                  absolute scale.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Use Night Notes alongside</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Logging caffeine, alcohol, congestion, and stress helps separate FL-driven symptoms
                  from confounders. A bad morning after evening caffeine and high stress tells a
                  different story than a bad morning with clean Night Notes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Look for patterns over 2+ weeks</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Single nights are noisy. Look for trends: does your rating consistently drop on
                  nights with higher IFL Risk? Does it improve when FL metrics are lower? The
                  correlation over time is more informative than any single data point.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                4
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Share with your clinician</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A PDF report or forum export that includes both FL metrics and symptom ratings gives
                  your sleep physician something concrete: not just &quot;I feel tired&quot; but
                  &quot;my IFL Risk averaged 52% and I rated 2/5 on those nights vs. 4/5 when it
                  dropped below 25%.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why This Matters</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The PAP community has spent years chasing optimal flow metrics. Pressure
            titrations, mask changes, positional therapy — all aimed at getting FL numbers
            down. And for many people, that works. But for some, the numbers improve and the
            symptoms don&apos;t. For others, the numbers stay elevated and they feel great.
          </p>
          <p>
            Individual sensitivity explains this gap. And the only way to understand your
            sensitivity is to systematically track both sides of the equation: what your
            airway is doing, and how you actually feel.
          </p>
          <p>
            That&apos;s what AirwayLab&apos;s symptom rating is for. Not a replacement for
            clinical assessment, but a daily data point that, over time, helps you and your
            clinician understand whether your flow limitation is the thing to fix — or whether
            the answer lies elsewhere.
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
            Gold AR, Dipalo F, Gold MS, O&apos;Hearn D. (2003). &quot;The symptoms and
            signs of upper airway resistance syndrome: a link to the functional somatic
            syndromes.&quot; <em>Chest</em>, 123(1):87-95.
          </p>
          <p>
            Mann DL, Staykov E, Georgeson T, Azarbarzin A, Kainulainen S, Redline S,
            Sands SA, Terrill PI. (2024). &quot;Flow Limitation Is Associated with
            Excessive Daytime Sleepiness in Individuals without Moderate or Severe
            Obstructive Sleep Apnea.&quot; <em>Annals of the American Thoracic Society</em>,
            21(8):1186-1193.
          </p>
          <p>
            Stoohs RA, Philip P, Andries D, Finlayson EV, Guilleminault C. (2009).
            &quot;Reaction time performance in upper airway resistance syndrome versus
            obstructive sleep apnea syndrome.&quot; <em>Sleep Medicine</em>, 10(7):
            750-756.
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
            -- what flow limitation is and how the Glasgow Index scores it.
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
      <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">Find Out If Your Flow Limitation Matters</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Upload your ResMed SD card, rate how you feel, and let the pattern emerge over time.
          All analysis runs in your browser — your data never leaves your device.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload Your SD Card
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/flow-limitation-and-sleepiness"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Does Flow Limitation Drive Sleepiness?
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <p className="mt-8 text-[11px] italic text-muted-foreground/60">
        AirwayLab is not a medical device and is not FDA or CE cleared. Symptom ratings are
        subjective self-reports, not clinical assessments. Always discuss results with your
        sleep physician before making therapy changes.
      </p>
    </article>
  );
}
