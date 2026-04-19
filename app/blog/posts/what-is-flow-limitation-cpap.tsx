import Link from 'next/link';
import { Activity, AlertTriangle, BarChart3, BookOpen, Info, Waves, Wind } from 'lucide-react';

export default function WhatIsFlowLimitationCPAPPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You&apos;ve done everything right. Your AHI is 1.2. Your mask fits well. You&apos;re
        sleeping eight hours. And yet you still wake up feeling like you didn&apos;t sleep at all.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If that sounds familiar,{' '}
        <strong className="text-foreground">flow limitation</strong> might be what&apos;s missing
        from the picture.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        This article explains what flow limitation is in plain language, what it looks like in your
        breathing data, and why it doesn&apos;t always show up in the headline AHI number that most
        CPAP apps report.
      </p>

      {/* What Is Flow Limitation? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Flow Limitation?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your upper airway &mdash; the passage from your nose and mouth down to your lungs
            &mdash; isn&apos;t a rigid tube. It&apos;s made of soft tissue that can change shape as
            you breathe. During sleep, the muscles that normally keep it open relax.
          </p>
          <p>
            A <strong className="text-foreground">complete obstruction</strong> is what CPAP users
            usually think of: airflow stops, oxygen drops, you partially wake up. That&apos;s an
            apnea, and it gets counted in your AHI.
          </p>
          <p>
            But there&apos;s a subtler version. Sometimes your airway doesn&apos;t close completely
            &mdash; it just <strong className="text-foreground">narrows</strong>. Airflow continues,
            but it&apos;s restricted. The breathing effort increases to compensate, and the quality
            of that breath changes. This is flow limitation: partial upper airway narrowing during
            an otherwise continuous breath.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">The key distinction</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You don&apos;t stop breathing. Your oxygen might not drop noticeably. But the
              increased respiratory effort can fragment sleep in ways that leave you exhausted.
            </p>
          </div>
        </div>
      </section>

      {/* What a Flow Limitation Waveform Looks Like */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What a Flow Limitation Waveform Looks Like
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP machines record your breathing as a continuous signal &mdash; airflow over time,
            measured breath by breath. That signal has a characteristic shape.
          </p>
          <p>
            <strong className="text-foreground">A normal breath</strong> traces a smooth, rounded
            arch on the inspiratory (inhale) side. The peak is clear and the curve tapers gently on
            both sides. If you drew it, it would look roughly like a rounded hill.
          </p>
          <p>
            <strong className="text-foreground">A flow-limited breath</strong> looks different. The
            inspiratory curve flattens at the top. Instead of a smooth arch, you get something
            closer to a plateau &mdash; a rounded top cut off, like a hill with its summit shaved
            flat. This flattened shape is the visual signature of partial obstruction: airflow
            reaches its maximum early, then can&apos;t increase further despite continued
            respiratory effort.
          </p>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
            <p className="text-sm font-medium text-foreground">Degrees of flattening</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The degree of flattening varies. A mildly flattened curve might be subtle. A heavily
              flattened one can look almost like a square wave on top. Sustained runs of flattened
              breaths &mdash; especially ones that coincide with increased effort or brief arousals
              &mdash; are what researchers and clinicians look for when assessing whether flow
              limitation is contributing to poor sleep quality.
            </p>
          </div>
        </div>
      </section>

      {/* Flow Limitation, RERAs, and the Limits of AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Flow Limitation, RERAs, and the Limits of AHI
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here&apos;s the important part:{' '}
            <strong className="text-foreground">
              standard AHI doesn&apos;t count flow limitation directly.
            </strong>
          </p>
          <p>
            AHI (Apnea-Hypopnea Index) counts apneas (complete stops) and hypopneas (partial
            reductions meeting specific criteria). The threshold for a hypopnea typically requires a
            measurable drop in airflow <em>and</em> either an oxygen desaturation or an arousal.
          </p>
          <p>
            Flow limitation often doesn&apos;t meet that bar. The airway is narrowed but not
            collapsed. Oxygen stays stable. The arousal, if it happens, is brief. The event goes
            uncounted.
          </p>
          <p>
            What <em>does</em> capture these events is the{' '}
            <strong className="text-foreground">RERA</strong> &mdash; Respiratory Effort-Related
            Arousal. A RERA is a sequence of breaths showing increasing respiratory effort that ends
            in an arousal, without meeting the criteria for an apnea or hypopnea. RERAs are the
            clinical correlate of flow limitation: the sequence of flattened breaths that your body
            eventually has to break out of.
          </p>
          <p>
            The combined metric <strong className="text-foreground">RDI</strong> (Respiratory
            Disturbance Index) includes RERAs alongside apneas and hypopneas. Some people with an
            AHI of 2 have an RDI of 15 &mdash; mostly RERAs, mostly from flow limitation, none of
            which shows up in the number their CPAP app reports.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-medium text-amber-400">Why this matters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Understanding your flow limitation patterns can give you a more complete picture of
              what your breathing data actually shows on a given night &mdash; beyond what the AHI
              summary captures.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Matters for Your Therapy Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why This Matters for Your Therapy Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Knowing your AHI is a start, not a finish.</p>
          <p>
            If your AHI is low but you&apos;re symptomatic, flow limitation is one of the logical
            next places to look in your data. Not because it tells you what to do &mdash; that
            &apos;s a conversation for your clinician &mdash; but because it tells you what&apos;s{' '}
            <em>there</em>.
          </p>
          <p>
            A few things worth noting when you look at flow limitation patterns in your data:
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Positional clustering</strong> &mdash; flow
                limitation often appears in specific sleep positions, particularly supine (on your
                back). Seeing clusters of flattened waveforms at consistent times can give you
                information about when in the night your airway is most challenged.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Pressure-related patterns</strong> &mdash; flow
                limitation can appear at the beginning of the night when pressure hasn&apos;t yet
                adapted, or during REM when airway muscle tone drops naturally.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Night-to-night variation</strong> &mdash; a
                single night&apos;s data is a snapshot. Patterns across multiple nights give a more
                reliable picture.
              </span>
            </li>
          </ul>
          <p>
            None of this is diagnostic. It&apos;s your data, and understanding what it shows is the
            first step to having an informed conversation with the clinician who&apos;s managing
            your therapy.
          </p>
        </div>
      </section>

      {/* How AirwayLab Shows You Flow Limitation Patterns */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab Shows You Flow Limitation Patterns
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab was built specifically to surface the signals that standard CPAP apps leave
            buried &mdash; and flow limitation is the clearest example of that.
          </p>
          <p>
            When you upload your SD card data, AirwayLab renders your{' '}
            <strong className="text-foreground">full waveform record</strong> &mdash; the
            breath-by-breath airflow signal &mdash; alongside overlaid event markers. Flow
            limitation shows up where it actually lives: in the shape of the curve, not just as an
            event count.
          </p>
          <p>Here&apos;s what you&apos;ll see in the AirwayLab waveform view:</p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">The flow signal panel</strong> renders each
                breath in real time. Normal breaths appear as smooth arches. Flow-limited breaths
                show the characteristic flattening at the inspiratory peak &mdash; visible directly
                in the waveform rather than summarised away.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">The event overlay</strong> marks flagged events
                from your device alongside the raw signal, letting you see the waveform patterns
                alongside what your device logged.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">The session timeline</strong> lets you zoom
                from a full-night view down to individual minutes, so you can navigate to specific
                periods &mdash; the first hour of sleep, a suspected positional shift, a period of
                poor quality &mdash; and inspect the waveform directly.
              </span>
            </li>
          </ul>
          <p>
            Everything runs in your browser. Your data is never uploaded to a server. You load the
            file, AirwayLab processes it locally, and the analysis stays on your device. That
            &apos;s a deliberate choice: your breathing data is personal, and you should control
            where it goes.
          </p>
          <p>
            AirwayLab complements tools like OSCAR &mdash; if you&apos;re already using OSCAR for
            event statistics, AirwayLab adds the waveform layer that OSCAR doesn&apos;t render in
            the same way. Use both.
          </p>
        </div>
      </section>

      {/* A Note on Clinical Context */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">A Note on Clinical Context</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The waveform analysis AirwayLab provides is{' '}
            <strong className="text-foreground">informational</strong>. It shows you what your data
            looks like. It doesn&apos;t diagnose a condition, recommend a therapy change, or replace
            assessment by a qualified clinician.
          </p>
          <p>
            If you&apos;re seeing patterns in your data that concern you &mdash; persistent flow
            limitation, elevated RDI, or symptoms that don&apos;t match your AHI &mdash; the right
            move is to bring that data to your sleep clinician or prescribing physician. AirwayLab
            can help you understand what the data shows well enough to have that conversation
            productively.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-amber-400">Medical disclaimer</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AirwayLab is an informational tool. Nothing on this page or within the application
              constitutes medical advice, diagnosis, or treatment recommendation. Always consult a
              qualified healthcare professional regarding your sleep therapy.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h2 className="text-lg font-bold text-foreground">See Your Flow Limitation Patterns</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ready to look at your own data? Upload your SD card in AirwayLab &mdash; free, in your
            browser, no account required.
          </p>
          <Link
            href="/analyze"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Analyse your CPAP data &rarr;
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Related reading</h2>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>
          </li>
          <li>
            <Link
              href="/blog/oscar-charts-guide"
              className="text-primary hover:text-primary/80"
            >
              Understanding Your OSCAR Charts
            </Link>
          </li>
          <li>
            <span className="text-muted-foreground">
              What Are RERAs and Why They Matter{' '}
              <span className="text-xs text-muted-foreground/60">(coming soon)</span>
            </span>
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-10 border-t border-border/50 pt-8">
        <h2 className="text-lg font-bold">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              What causes flow limitation on CPAP?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Flow limitation occurs when the upper airway partially narrows during sleep,
              restricting airflow without fully closing. Common contributing factors include sleep
              position, REM sleep (when airway muscle tone is lower), and pressure dynamics during
              sleep. Your clinician can help interpret these patterns in the context of your overall
              therapy.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Is flow limitation the same as a hypopnea?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              No. A hypopnea requires airflow to drop by a defined threshold and is associated with
              oxygen desaturation or arousal. Flow limitation can occur without meeting those
              criteria &mdash; the airway is partially narrowed but airflow continues. Many
              flow-limited breaths are not counted in AHI.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              What is a RERA and how does it relate to flow limitation?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A RERA (Respiratory Effort-Related Arousal) is a sequence of increasingly effortful
              breaths &mdash; often showing flow limitation in the waveform &mdash; that ends in a
              brief arousal. RERAs are counted in the RDI (Respiratory Disturbance Index) but not
              in standard AHI.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Can I see flow limitation in my CPAP data?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Yes. CPAP machines record continuous airflow data on the SD card. Tools like
              AirwayLab render this as a waveform, where flow-limited breaths are visible as a
              flattened inspiratory curve rather than the smooth rounded arch of a normal breath.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Does AirwayLab diagnose flow limitation?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              No. AirwayLab is an informational tool that visualises your recorded data. It does
              not provide medical diagnoses or clinical recommendations. If you have concerns about
              patterns in your data, discuss them with your clinician.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
