import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Brain, Info, Layers, Wind } from 'lucide-react';

export default function WhatIsCentralApneaCPAP() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You load your CPAP data and see two numbers sitting side by side in your event summary:{' '}
        <strong className="text-foreground">OA</strong> (obstructive apneas) and{' '}
        <strong className="text-foreground">CA</strong> (central apneas). Most CPAP guides explain
        obstructive events at length and say almost nothing about centrals. This article covers what
        central apnea is on CPAP, how to read central events in your data, and what to make of them.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is not a medical device, and nothing here
          constitutes a diagnosis or treatment recommendation. Always discuss your therapy data and
          any concerns about your event counts with a qualified sleep specialist or physician.
        </p>
      </div>

      {/* What Is a Central Apnea */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a Central Apnea on CPAP?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A central apnea is a pause in breathing that lasts 10 seconds or more where airflow
            stops — but not because the airway is blocked. The breathing drive from the brain
            briefly pauses, and the respiratory muscles stop working as a result. The airway itself
            is open; it is just not receiving the signal to breathe.
          </p>
          <p>
            That is the key distinction. In an{' '}
            <Link
              href="/blog/hypopnea-vs-apnea-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              obstructive apnea
            </Link>
            , the airway physically collapses or is blocked — the brain keeps trying to breathe but
            cannot get air through. In a central apnea, the respiratory drive itself pauses. There
            is no effort against obstruction because the brain has not sent the signal to breathe.
          </p>
          <p>
            The AASM (American Academy of Sleep Medicine) defines a central apnea as an airflow
            cessation of 10 or more seconds with an absent or very low respiratory effort signal.
            That &quot;absent effort&quot; is how central events are distinguished from obstructive
            ones in scored sleep studies. Your CPAP machine uses an algorithm-based version of this
            distinction to categorise the events it records.
          </p>
        </div>
      </section>

      {/* Central vs Obstructive */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Central vs Obstructive: The Key Data Difference
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Both event types show a flat period in the flow waveform where airflow drops to near
            zero. The context around that flat period differs:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Obstructive apnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Airflow stops but respiratory effort continues. The airway is physically blocked.
                CPAP pressure is applied specifically to prevent airway collapse and keep the
                passage open during sleep.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Central apnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Airflow stops AND respiratory effort stops. The airway is clear. ResMed devices use
                the label &quot;clear airway apnea&quot; for this reason — the airway is
                unobstructed during the event, distinguishing it from obstructive apneas.
              </p>
            </div>
          </div>
          <p>
            CPAP pressure is effective at holding the airway open during obstructive events. It
            does not directly address events where the breathing drive pauses — which is why central
            events can remain in data even when obstructive events are well controlled.
          </p>
          <p>
            If you want to understand the broader{' '}
            <Link
              href="/blog/hypopnea-vs-apnea-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              taxonomy of apneas and hypopneas
            </Link>{' '}
            in your data, that article covers the full spectrum of scored events. Your{' '}
            <Link
              href="/blog/ahi-vs-rdi-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              AHI and RDI numbers
            </Link>{' '}
            both combine obstructive and central events into headline counts.
          </p>
        </div>
      </section>

      {/* What Central Events Look Like in Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Central Events Look Like in Your CPAP Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            ResMed machines record central apnea events separately from obstructive ones in the EDF
            data stored on your SD card. When you load your data in OSCAR, you will see distinct
            event markers — labelled <strong className="text-foreground">CA</strong> (central
            apnea) or <strong className="text-foreground">&quot;clear airway&quot;</strong> —
            plotted alongside your OA (obstructive apnea) and H (hypopnea) markers.
          </p>
          <p>
            In the flow waveform, a central apnea appears as a flat period where the trace drops to
            near zero and stays there for the duration of the event. Unlike an obstructive apnea —
            which may show partial airflow attempts as the machine works against a blocked airway —
            a central event is typically a clean, undisturbed flat line. No struggle, no partial
            airflow.
          </p>
          <p>
            In AirwayLab, central apnea counts are surfaced from the same EDF data your machine
            records. You will see your CA count alongside your OA and AHI breakdown in the overview
            dashboard, and you can track how central event counts change across nights using the
            trend view.
          </p>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Note on device labelling</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ResMed uses the term &quot;clear airway apnea&quot; to describe central events in
              their EDF data. OSCAR and AirwayLab both map this to the CA label. The machine
              identifies these events based on the absence of respiratory effort during the event —
              it is the device&apos;s algorithm-based categorisation of what it observed in the
              flow signal, not a clinical diagnosis.
            </p>
          </div>
        </div>
      </section>

      {/* Treatment-Emergent Central Events */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Treatment-Emergent Central Events: A Data Pattern to Know
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Some people&apos;s data shows elevated central event counts during the early weeks of
            CPAP therapy, having been low or absent before treatment began. This data pattern is
            common enough that it has a name:{' '}
            <strong className="text-foreground">treatment-emergent central events</strong>{' '}
            (sometimes called complex sleep apnea in older literature).
          </p>
          <p>
            It is discussed frequently in CPAP forums, and finding elevated CA counts early in
            therapy can be unsettling. In some people&apos;s recorded data, central event counts
            are lower after the first weeks to months of therapy; in others they remain at a steady
            level. The pattern varies.
          </p>
          <p>
            What the data shows and what it means clinically are separate questions. Central event
            data — including trends across nights — is something your sleep physician can assess in
            the context of your individual history and therapy.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Data vs diagnosis:</strong>{' '}
              Treatment-emergent central events are a label for a data pattern, not a clinical
              diagnosis. Whether elevated CA counts are clinically significant — and what, if
              anything, to do about them — is a conversation for you and your sleep physician.
            </p>
          </div>
        </div>
      </section>

      {/* How Many Central Events Per Night */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How Many Central Events Per Night?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A few central apneas scattered across a night is a common finding in CPAP data. Many
            users with otherwise well-controlled obstructive events see a handful of CA events per
            night. Their presence alone is not unusual.
          </p>
          <p>
            If you want to bring your central event data to your sleep physician, AirwayLab&apos;s
            trend view gives you the multi-night CA count chart to take to that conversation.
            Whether any particular pattern is significant depends on individual context only your
            clinician can assess.
          </p>
          <p>
            The central apnea index — CA events per hour of therapy — is the metric most commonly
            used to describe the volume of central events in CPAP data. Higher values are a data
            observation. Whether a given value is clinically significant depends on individual
            context that only your sleep physician can assess.
          </p>
          <p>
            There are no universal thresholds that translate from a CA count to clinical meaning
            without individual context. Your data gives you the count. Your clinician gives you the
            interpretation.
          </p>
        </div>
      </section>

      {/* Reading Central Events in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Reading Central Events in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads CA event data directly from your ResMed EDF files — the same source
            OSCAR uses. All parsing and analysis runs locally in your browser. Your data never
            leaves your device.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event breakdown in overview</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The overview dashboard breaks your total AHI into its components: obstructive
                apneas, central apneas, hypopneas, and (where available) estimated RERAs. You can
                see exactly how much of your total event count is driven by central events versus
                obstructive ones.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Night-by-night trend</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The trend tab shows CA counts across your loaded sessions. If you have several weeks
                of data, you can see whether your central event count is stable, has shifted, or
                varies with changes in your environment or therapy timing.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Central events alongside flow limitation data
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Central apneas and{' '}
                <Link
                  href="/blog/understanding-flow-limitation"
                  className="text-primary hover:text-primary/80"
                >
                  flow limitation
                </Link>{' '}
                are different patterns in the same data.{' '}
                <Link
                  href="/blog/what-are-reras-sleep-apnea"
                  className="text-primary hover:text-primary/80"
                >
                  RERAs
                </Link>{' '}
                and flow limitation patterns are associated with obstructive physiology. Central
                apneas operate through a different mechanism. Both are measured independently in
                your EDF data.
              </p>
            </div>
          </div>
          <p>
            AirwayLab is open source (GPL-3.0), free, and always will be. The analysis code is
            publicly auditable. Your breathing data is yours.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Track Your Central Event Trends in AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Load your ResMed SD card data to see your CA breakdown, how central events compare with
          your obstructive counts, and how the pattern changes across nights.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Understanding Flow Limitation
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/hypopnea-vs-apnea-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              Hypopnea vs Apnea: Understanding the Difference in Your CPAP Data
            </Link>{' '}
            — covers the full event spectrum your AHI counts.
          </p>
          <p>
            <Link
              href="/blog/ahi-vs-rdi-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              AHI vs RDI: What&apos;s the Difference?
            </Link>{' '}
            — how central and obstructive events combine into your AHI and RDI.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation in CPAP Data
            </Link>{' '}
            — the obstructive-side waveform patterns that complement central event data.
          </p>
          <p>
            <Link
              href="/blog/what-are-reras-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              What Are RERAs?
            </Link>{' '}
            — respiratory events that don&apos;t appear in AHI but show up in flow data.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source tool for analysing PAP flow data. Your data never leaves
        your browser. Nothing on this page constitutes medical advice — always discuss your results
        and event data with a qualified sleep physician.
      </p>
    </article>
  );
}
