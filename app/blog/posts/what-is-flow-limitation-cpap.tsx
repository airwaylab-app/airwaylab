import Link from 'next/link';
import { AlertTriangle, Info } from 'lucide-react';

export default function WhatIsFlowLimitationCPAP() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have opened your CPAP data and noticed a metric labelled{' '}
        <strong className="text-foreground">flow limitation</strong>, you are not alone in wondering
        what it means. Flow limitation is one of the more nuanced signals your device records — it
        sits below the threshold of a scored apnea or hypopnea, yet it can tell you a lot about
        what is happening in your airway overnight.
      </p>

      {/* What does flow limitation mean */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          What does flow limitation mean in CPAP data?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Flow limitation describes a characteristic <strong className="text-foreground">flattening of the inspiratory airflow curve</strong> — the shape of the breath waveform as you inhale. In a healthy, unobstructed breath, the inspiratory curve forms a smooth arc. When the upper airway is partially narrowed, that curve flattens at the top: airflow reaches a plateau and cannot increase further, even as your respiratory effort continues.
          </p>
          <p>
            Your CPAP device records this flattening as a flow limitation index. ResMed AirSense devices, for example, score each two-second window on a 0 / 0.5 / 1.0 scale. Tools like AirwayLab calculate a continuous per-breath score from the raw waveform stored on your SD card.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <p className="text-sm text-muted-foreground">
                Flow limitation is a metric your CPAP device records. What it means for your therapy is a conversation to have with your care team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it differs from apneas */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          How is flow limitation different from apneas and hypopneas?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The three terms describe different degrees of airway obstruction:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apnea</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete cessation of airflow for at least 10 seconds. The airway is fully blocked or there is no respiratory effort (central apnea).
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopnea</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A significant reduction in airflow — typically defined as a drop of 30–50% or more — that meets a scoring threshold and is usually associated with an arousal or oxygen desaturation.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A subtler restriction that does not meet either scoring threshold. It shows up as a flattened waveform rather than a fully scored event. It does not count toward your AHI but may still reflect partial airway narrowing throughout the night.
              </p>
            </div>
          </div>
          <p>
            Because flow limitation is not counted in AHI, it is possible to have a{' '}
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:underline">
              normal AHI and still experience significant airway narrowing
            </Link>{' '}
            that shows up as elevated flow limitation.
          </p>
        </div>
      </section>

      {/* What causes it */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          What causes flow limitation during sleep?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Flow limitation is typically caused by <strong className="text-foreground">partial narrowing of the upper airway</strong> during sleep. Several factors can contribute:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-2">
            <li>Anatomy — jaw position, tongue size, soft palate shape</li>
            <li>Sleeping position — supine positions can allow the tongue to fall back</li>
            <li>Nasal congestion — increased nasal resistance forces a narrower airway</li>
            <li>Muscle relaxation — throat muscles relax during sleep and may not fully maintain airway patency</li>
          </ul>
          <p>
            Flow limitation is also associated with upper airway resistance syndrome (UARS) in some patients, though that determination is a clinical one requiring evaluation by a healthcare provider.
          </p>
        </div>
      </section>

      {/* What events look like */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          What do flow limitation events look like on a CPAP graph?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In tools like OSCAR, the FL channel appears as a stepped trace cycling between 0, 0.5, and 1.0. In AirwayLab, the FL Score is displayed as a continuous per-breath value from 0–100, derived from the shape of the raw inspiratory waveform on your SD card.
          </p>
          <p>
            On the raw flow signal, a flow-limited breath has a distinctive squared-off top: instead of a smooth bell curve, the inspiratory portion flattens and stays at a plateau before the exhale begins. Clusters of these flattened breaths often occur in runs before a brief arousal or position change resets the airway.
          </p>
          <p>
            For more detail on the 0 / 0.5 / 1.0 scoring scale, see{' '}
            <Link href="/blog/cpap-flow-limitation-score-0-5-meaning" className="text-primary hover:underline">
              CPAP Flow Limitation Score Explained
            </Link>
            .
          </p>
        </div>
      </section>

      {/* How many are normal */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          How many flow limitation events are considered normal?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            There is no universally accepted clinical threshold for a &ldquo;normal&rdquo; flow limitation index. Different devices calculate and report it differently, and clinical guidelines for flow limitation as a standalone metric are not as established as they are for AHI.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-muted-foreground">
                The significance of your specific flow limitation readings should be discussed with your healthcare provider. AirwayLab is an informational data viewer and does not provide clinical interpretation or therapy recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UARS */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          Is flow limitation the same as upper airway resistance?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            They are related but not identical. Upper airway resistance describes the physical property of the airway — how much it resists airflow. Flow limitation is a measurable consequence of that resistance: when resistance is high enough, inspiratory airflow plateaus and the waveform flattens.
          </p>
          <p>
            Upper airway resistance syndrome (UARS) is a clinical diagnosis based on polysomnography findings, not a metric your home CPAP device can diagnose. Some patients with UARS show elevated flow limitation on their device data, but a home CPAP report is not equivalent to a clinical sleep study.
          </p>
        </div>
      </section>

      {/* AirwayLab CTA */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          Can you see flow limitation events in AirwayLab?
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Yes. AirwayLab reads CPAP SD card data directly in your browser — no upload, no account required — and displays flow limitation events alongside AHI, leak rate, pressure, and other therapy metrics.
          </p>
          <p>
            For ResMed AirSense devices, AirwayLab shows both the device&apos;s categorical FL channel and its own continuous per-breath FL Score calculated from the raw EDF waveform. Your data never leaves your device.
          </p>
          <p>
            To get started,{' '}
            <Link href="/" className="text-primary hover:underline">
              open AirwayLab
            </Link>{' '}
            and load your SD card to see your own flow limitation data.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="mt-12 rounded-xl border border-border/40 bg-muted/30 p-5 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is not a medical
          device. Information on this page is for educational purposes only. Consult your healthcare
          provider for clinical guidance about your CPAP therapy.
        </p>
      </div>
    </article>
  );
}
