import Link from 'next/link';
import {
  Wind,
  AlertTriangle,
  Shield,
  Gauge,
  TrendingDown,
  Layers,
  Zap,
  Activity,
  SlidersHorizontal,
  Lightbulb,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export default function HowPAPTherapyWorksPost() {
  return (
    <article>
      {/* Opening hook */}
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your sleep doctor said you need a CPAP or BiPAP machine. Maybe you&apos;ve been using one
        for months. You know it blows air into your nose (or mouth) while you sleep. But have you
        ever wondered <strong className="text-foreground">why</strong> that actually works? Why does
        pushing air into your face prevent your airway from collapsing?
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Understanding the mechanics behind PAP therapy isn&apos;t just academic. It helps you make
        sense of your settings, have better conversations with your sleep physician, and understand
        why some people need CPAP while others need BiPAP with pressure support. This guide explains
        everything from first principles, with diagrams, analogies, and zero assumed knowledge.
      </p>

      {/* Section 1: Your Airway Is a Flexible Tube */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Your Airway Is a Flexible Tube</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Let&apos;s start with anatomy. When you breathe, air travels from your nose or mouth,
            through the back of your throat (the{' '}
            <strong className="text-foreground">pharynx</strong>), and down into your lungs via the
            trachea (windpipe).
          </p>
          <p>
            Here&apos;s the critical thing: your trachea is a rigid tube, reinforced with C-shaped
            cartilage rings. It holds its shape no matter what. But the pharynx above it?
            That&apos;s a <strong className="text-foreground">flexible, collapsible tube</strong>{' '}
            made of soft tissue and muscle. When you&apos;re awake, your throat muscles actively hold
            this tube open. During sleep, especially during REM sleep, that muscle tone drops
            significantly. The tube becomes floppy, like a wet paper towel roll.
          </p>
          <p>
            For people with obstructive sleep apnoea or upper airway resistance syndrome, this
            floppy section of the airway narrows or collapses during sleep, partially or completely
            blocking airflow. That&apos;s the entire problem PAP therapy is designed to solve.
          </p>

          {/* Diagram 1: Three Airway States */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
            <svg
              viewBox="0 0 720 280"
              className="w-full"
              role="img"
              aria-label="Three airway states: awake and open, asleep and collapsing, asleep with PAP and splinted open"
            >
              <title>Airway cross-section in three states</title>
              <defs>
                <marker id="aw-arrow-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="#fb7185" />
                </marker>
                <marker id="aw-arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="#60a5fa" />
                </marker>
              </defs>
              <rect x="0" y="0" width="720" height="280" rx="12" fill="#18181b" />

              {/* State labels */}
              <text x="120" y="32" textAnchor="middle" fill="#d4d4d8" fontSize="13" fontWeight="600">Awake</text>
              <text x="360" y="32" textAnchor="middle" fill="#d4d4d8" fontSize="13" fontWeight="600">Asleep (No PAP)</text>
              <text x="600" y="32" textAnchor="middle" fill="#d4d4d8" fontSize="13" fontWeight="600">Asleep (With PAP)</text>

              {/* Dividers */}
              <line x1="240" y1="15" x2="240" y2="265" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="480" y1="15" x2="480" y2="265" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />

              {/* 1. Awake: Open circle with tissue ring */}
              <circle cx="120" cy="130" r="65" fill="none" stroke="#fb923c" strokeWidth="8" opacity="0.3" />
              <circle cx="120" cy="130" r="50" fill="#0a1a0a" stroke="#34d399" strokeWidth="2.5" />
              <text x="120" y="126" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">Airway</text>
              <text x="120" y="140" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">lumen</text>
              <text x="120" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="10">Muscles actively</text>
              <text x="120" y="240" textAnchor="middle" fill="#a1a1aa" fontSize="10">hold airway open</text>
              <text x="120" y="260" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">OPEN</text>

              {/* 2. Asleep (no PAP): Collapsed ellipse */}
              <ellipse cx="360" cy="130" rx="65" ry="65" fill="none" stroke="#fb923c" strokeWidth="8" opacity="0.3" />
              <ellipse cx="360" cy="130" rx="12" ry="48" fill="#1a0a0a" stroke="#fb7185" strokeWidth="2.5" />
              {/* Collapse arrows from sides */}
              <line x1="300" y1="130" x2="340" y2="130" stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#aw-arrow-red)" />
              <line x1="420" y1="130" x2="380" y2="130" stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#aw-arrow-red)" />
              {/* Gravity arrow from top */}
              <line x1="360" y1="55" x2="360" y2="75" stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#aw-arrow-red)" />
              <text x="360" y="50" textAnchor="middle" fill="#fb7185" fontSize="9">Gravity</text>
              <text x="290" y="126" textAnchor="middle" fill="#fb7185" fontSize="8">Tissue</text>
              <text x="430" y="126" textAnchor="middle" fill="#fb7185" fontSize="8">Tissue</text>
              <text x="360" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="10">Relaxed muscles +</text>
              <text x="360" y="240" textAnchor="middle" fill="#a1a1aa" fontSize="10">gravity collapse airway</text>
              <text x="360" y="260" textAnchor="middle" fill="#fb7185" fontSize="10" fontWeight="600">OBSTRUCTED</text>

              {/* 3. Asleep with PAP: Open circle with pressure arrows outward */}
              <circle cx="600" cy="130" r="65" fill="none" stroke="#fb923c" strokeWidth="8" opacity="0.3" />
              <circle cx="600" cy="130" r="50" fill="#0a0a1a" fillOpacity="0.8" stroke="#60a5fa" strokeWidth="2.5" />
              {/* PAP pressure arrows outward */}
              <line x1="600" y1="120" x2="600" y2="75" stroke="#60a5fa" strokeWidth="1.5" markerEnd="url(#aw-arrow-blue)" />
              <line x1="610" y1="130" x2="655" y2="130" stroke="#60a5fa" strokeWidth="1.5" markerEnd="url(#aw-arrow-blue)" />
              <line x1="600" y1="140" x2="600" y2="185" stroke="#60a5fa" strokeWidth="1.5" markerEnd="url(#aw-arrow-blue)" />
              <line x1="590" y1="130" x2="545" y2="130" stroke="#60a5fa" strokeWidth="1.5" markerEnd="url(#aw-arrow-blue)" />
              <text x="600" y="134" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500">PAP</text>
              <text x="600" y="225" textAnchor="middle" fill="#a1a1aa" fontSize="10">Air pressure pushes</text>
              <text x="600" y="240" textAnchor="middle" fill="#a1a1aa" fontSize="10">walls outward</text>
              <text x="600" y="260" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="600">SPLINTED OPEN</text>
            </svg>
          </div>
          <p className="text-center text-xs text-muted-foreground/60">
            Cross-section of the pharynx. The orange ring represents surrounding soft tissue. Left: muscles hold the airway
            open while awake. Centre: during sleep, gravity and relaxed muscles collapse the flexible tube. Right: PAP
            pressure inflates the airway from inside, like a balloon.
          </p>
        </div>
      </section>

      {/* Section 2: The Suction Problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Suction Problem: Why Breathing In Is the Dangerous Part</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here&apos;s something most people don&apos;t realise: breathing in is what makes your
            airway collapse, not breathing out. When you inhale, your diaphragm (the big muscle
            below your lungs) contracts and pulls downward. This creates{' '}
            <strong className="text-foreground">negative pressure</strong> inside your chest, like
            pulling back a syringe plunger. That suction is what draws air in through your nose and
            down into your lungs.
          </p>
          <p>
            The problem? That same suction also pulls on the walls of your pharynx. Remember, the
            pharynx is a flexible tube. Negative pressure inside a flexible tube makes it want to{' '}
            <strong className="text-foreground">collapse inward</strong>, just like sucking too hard
            on a paper straw.
          </p>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="text-sm font-medium text-rose-400">The paper straw analogy</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Take a rigid plastic straw and suck through it. The straw holds its shape and air
              flows freely. Now try sucking through a thin paper straw, or a piece of cooked
              spaghetti. The harder you suck, the more it collapses. That&apos;s exactly what
              happens to a floppy pharynx during inspiration: more effort = more collapse = less
              airflow. In respiratory medicine, this paradox is called{' '}
              <strong className="text-foreground">Negative Effort Dependence (NED)</strong>, and
              it&apos;s one of the hallmarks of an obstructed airway. (You can learn more about how this is measured in{' '}
              <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
                Understanding Flow Limitation
              </Link>.)
            </p>
          </div>

          <p>
            It gets worse. As the airway narrows, air has to flow faster through the remaining
            opening (think of putting your thumb over a garden hose). Faster airflow through a
            narrow passage creates even <em>lower</em> pressure on the walls, a phenomenon called
            the <strong className="text-foreground">Bernoulli effect</strong>. This creates a
            vicious cycle: narrowing leads to faster flow, which leads to lower pressure on the
            walls, which leads to more narrowing. Left unchecked, this cascade ends in full airway
            collapse, an apnoea.
          </p>
          <p>
            This is why snoring tends to get louder before an apnoea event. The vibrating tissue is
            narrowing, airflow is speeding up, and the physics of the situation are pulling toward
            total collapse.
          </p>
        </div>
      </section>

      {/* Section 3: EPAP — The Pneumatic Splint */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">EPAP: Inflating the Tent from Inside</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            EPAP stands for{' '}
            <strong className="text-foreground">Expiratory Positive Airway Pressure</strong>. It is
            the baseline pressure that your machine maintains at all times, including during
            exhalation. On a CPAP machine, EPAP and CPAP are effectively the same thing (there is
            only one pressure). On a BiPAP machine, EPAP is the lower of the two pressure settings.
          </p>
          <p>
            EPAP is the <strong className="text-foreground">foundation of PAP therapy</strong>. Its
            job is deceptively simple: keep positive pressure inside the airway at all times, so
            the airway never has the chance to collapse. Think of it as a pneumatic splint, like
            inflating a tent from inside. The fabric might be floppy on its own, but with positive
            pressure inside, it holds its shape even against wind and gravity.
          </p>

          {/* Diagram 2: Pressure Forces on Airway Wall */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
            <svg
              viewBox="0 0 600 340"
              className="w-full"
              role="img"
              aria-label="Diagram showing pressure forces on the airway wall: tissue pressure and negative inspiratory pressure push inward, PAP pressure pushes outward"
            >
              <title>Pressure balance on the airway wall</title>
              <defs>
                <marker id="pf-arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#fb7185" />
                </marker>
                <marker id="pf-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#60a5fa" />
                </marker>
              </defs>
              <rect x="0" y="0" width="600" height="340" rx="12" fill="#18181b" />

              <text x="300" y="28" textAnchor="middle" fill="#d4d4d8" fontSize="13" fontWeight="600">Forces on the Airway Wall During Inspiration</text>

              {/* Central airway circle */}
              <circle cx="300" cy="160" r="70" fill="#60a5fa" fillOpacity="0.08" stroke="#60a5fa" strokeWidth="2" />
              {/* Outer tissue ring */}
              <circle cx="300" cy="160" r="90" fill="none" stroke="#fb923c" strokeWidth="12" opacity="0.2" />

              {/* INWARD forces (red) — tissue pressure from outside */}
              {/* Top */}
              <line x1="300" y1="45" x2="300" y2="82" stroke="#fb7185" strokeWidth="2" markerEnd="url(#pf-arrow-red)" />
              <text x="300" y="40" textAnchor="middle" fill="#fb7185" fontSize="10">Gravity + tissue weight</text>
              {/* Right */}
              <line x1="420" y1="160" x2="383" y2="160" stroke="#fb7185" strokeWidth="2" markerEnd="url(#pf-arrow-red)" />
              <text x="440" y="150" textAnchor="start" fill="#fb7185" fontSize="10">Tissue</text>
              <text x="440" y="164" textAnchor="start" fill="#fb7185" fontSize="10">pressure</text>
              {/* Left */}
              <line x1="180" y1="160" x2="217" y2="160" stroke="#fb7185" strokeWidth="2" markerEnd="url(#pf-arrow-red)" />
              <text x="160" y="150" textAnchor="end" fill="#fb7185" fontSize="10">Negative</text>
              <text x="160" y="164" textAnchor="end" fill="#fb7185" fontSize="10">inspiratory</text>
              <text x="160" y="178" textAnchor="end" fill="#fb7185" fontSize="10">pressure</text>
              {/* Bottom */}
              <line x1="300" y1="275" x2="300" y2="238" stroke="#fb7185" strokeWidth="2" markerEnd="url(#pf-arrow-red)" />
              <text x="300" y="290" textAnchor="middle" fill="#fb7185" fontSize="10">Suction from diaphragm</text>

              {/* OUTWARD forces (blue) — PAP pressure from inside */}
              <line x1="300" y1="150" x2="300" y2="100" stroke="#60a5fa" strokeWidth="2.5" markerEnd="url(#pf-arrow-blue)" />
              <line x1="310" y1="160" x2="360" y2="160" stroke="#60a5fa" strokeWidth="2.5" markerEnd="url(#pf-arrow-blue)" />
              <line x1="300" y1="170" x2="300" y2="220" stroke="#60a5fa" strokeWidth="2.5" markerEnd="url(#pf-arrow-blue)" />
              <line x1="290" y1="160" x2="240" y2="160" stroke="#60a5fa" strokeWidth="2.5" markerEnd="url(#pf-arrow-blue)" />

              {/* Center label */}
              <text x="300" y="164" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="600">EPAP</text>

              {/* Summary */}
              <rect x="120" y="305" width="360" height="24" rx="6" fill="#34d399" fillOpacity="0.1" />
              <text x="300" y="322" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500">EPAP &gt; collapse forces = airway stays open</text>
            </svg>
          </div>
          <p className="text-center text-xs text-muted-foreground/60">
            Red arrows show forces trying to collapse the airway (gravity, tissue weight, inspiratory suction). Blue arrows show
            EPAP pushing outward from inside. As long as the outward force exceeds the inward forces, the airway stays open.
          </p>

          <p>
            The crucial point:{' '}
            <strong className="text-foreground">
              EPAP doesn&apos;t just help during exhalation. It provides continuous positive
              pressure that counteracts all the forces trying to collapse your airway
            </strong>
            . Without it, every single breath you take during sleep is a battle between your
            inspiratory muscles (pulling inward) and the structural integrity of your pharynx
            (trying to stay open). EPAP changes the equation by adding outward pressure from inside
            the tube.
          </p>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm font-medium text-emerald-400">The key insight</p>
            <p className="mt-1 text-sm text-muted-foreground">
              EPAP doesn&apos;t push air into your lungs. That&apos;s not its job. Its job is to
              keep the airway tube open so that when you breathe in, air can actually flow through
              an unobstructed passage. It&apos;s a splint, not a ventilator. This distinction
              matters when we get to pressure support.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: CPAP — One Pressure */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Gauge className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">CPAP: One Pressure for Everything</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP stands for{' '}
            <strong className="text-foreground">Continuous Positive Airway Pressure</strong>. The
            word &quot;continuous&quot; tells you everything: one pressure level, maintained
            continuously during both inhalation and exhalation. If your CPAP is set to 12 cmH2O,
            you get 12 cmH2O whether you&apos;re breathing in or breathing out.
          </p>
          <p>
            For most people with obstructive sleep apnoea, this is all that&apos;s needed. The
            continuous pressure splints the airway open, preventing collapse. You breathe normally
            against a pressurised airway. Your inspiratory muscles still do the work of pulling air
            in, but now they&apos;re pulling air through an open tube instead of fighting a
            collapsing one.
          </p>
          <p>
            The tradeoff? You&apos;re also <em>exhaling</em> against that same pressure. Many
            people describe it as &quot;breathing out against a wall.&quot; This is uncomfortable
            for some, which is why most CPAP machines offer a comfort feature:
          </p>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">EPR (Expiratory Pressure Relief)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              EPR is a ResMed feature (other brands call it A-Flex, C-Flex, or simply expiratory
              relief). It temporarily drops the pressure by 1, 2, or 3 cmH2O during exhalation,
              making it easier to breathe out. EPR 3 on a CPAP set to 12 means you get 12 cmH2O
              on inhalation but only 9 cmH2O on exhalation. This makes CPAP more comfortable, but
              the lower expiratory pressure can sometimes allow airway narrowing. If you see
              significant flow limitation in your data, reducing EPR is often the first thing a
              sleep physician will suggest.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: When One Pressure Isn't Enough */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingDown className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">When One Pressure Isn&apos;t Enough</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP works well for many people, but not everyone. Some patients need something more,
            and the reasons usually fall into a few categories:
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Persistent flow limitation:</strong> Even with
                CPAP pressure high enough to prevent apnoeas, the airway can still narrow partially.
                This flow limitation means you&apos;re getting air through, but not as much as your
                body needs with each breath. Increasing the CPAP pressure doesn&apos;t always fix
                this because higher pressure during exhalation makes it harder to breathe out.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">High work of breathing:</strong> Some patients
                have to work very hard to pull air in against the continuous pressure and through a
                partially narrowed airway. Their respiratory muscles fatigue, and they
                hypoventilate, moving less air with each breath than they should.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Neuromuscular or chest wall issues:</strong>{' '}
                Conditions like obesity hypoventilation, COPD, or neuromuscular diseases can reduce
                the strength of the breathing muscles themselves. These patients need active
                assistance with ventilation, not just a splint.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Comfort intolerance:</strong> Some people simply
                cannot tolerate exhaling against high pressure. They need a lower expiratory
                pressure (EPAP) but still need high inspiratory pressure to keep the airway open and
                move enough air.
              </span>
            </li>
          </ul>
          <p>
            For all of these situations, the answer is the same:{' '}
            <strong className="text-foreground">use two different pressures</strong>. A lower
            pressure during exhalation (to keep the airway splinted and make exhaling comfortable)
            and a higher pressure during inhalation (to push extra air through and support
            ventilation). That&apos;s BiPAP.
          </p>
        </div>
      </section>

      {/* Section 6: BiPAP — Two Pressures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">BiPAP: Two Pressures, One Goal</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            BiPAP (Bilevel Positive Airway Pressure) delivers two distinct pressure levels that
            alternate with your breathing:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">EPAP (Expiratory)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The <strong className="text-foreground">lower</strong> pressure, active during
                exhalation. This is your airway splint. It keeps the pharynx open at all times,
                exactly like CPAP does. EPAP is the baseline your therapy is built on.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">IPAP (Inspiratory)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The <strong className="text-foreground">higher</strong> pressure, active during
                inhalation. When the machine detects you&apos;re starting to breathe in, it ramps
                up to IPAP. This higher pressure actively pushes air into your lungs, augmenting
                your own breathing effort.
              </p>
            </div>
          </div>
          <p>
            The machine continuously monitors your airflow. When it detects the start of
            inspiration (you begin breathing in), it swings up to IPAP. When it detects expiration
            (you start breathing out), it drops back to EPAP. This happens automatically with
            every breath, typically 12-20 times per minute.
          </p>

          {/* Diagram 3: CPAP vs BiPAP Waveforms */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
            <svg
              viewBox="0 0 700 420"
              className="w-full"
              role="img"
              aria-label="Comparison of CPAP pressure (flat line) versus BiPAP pressure (oscillating between EPAP and IPAP)"
            >
              <title>CPAP vs BiPAP pressure waveforms</title>
              <defs>
                <marker id="wv-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#71717a" />
                </marker>
              </defs>
              <rect x="0" y="0" width="700" height="420" rx="12" fill="#18181b" />

              {/* CPAP section */}
              <text x="80" y="28" fill="#d4d4d8" fontSize="13" fontWeight="600">CPAP</text>
              <text x="145" y="28" fill="#71717a" fontSize="11">(single pressure)</text>

              {/* CPAP Y-axis */}
              <line x1="80" y1="40" x2="80" y2="170" stroke="#3f3f46" strokeWidth="1" />
              {/* CPAP X-axis */}
              <line x1="80" y1="170" x2="650" y2="170" stroke="#3f3f46" strokeWidth="1" />
              {/* Y-axis ticks & labels */}
              <line x1="76" y1="65" x2="80" y2="65" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="69" textAnchor="end" fill="#71717a" fontSize="9">15</text>
              <line x1="76" y1="100" x2="80" y2="100" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="104" textAnchor="end" fill="#71717a" fontSize="9">10</text>
              <line x1="76" y1="135" x2="80" y2="135" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="139" textAnchor="end" fill="#71717a" fontSize="9">5</text>
              <text x="35" y="110" textAnchor="middle" fill="#71717a" fontSize="9" transform="rotate(-90, 35, 110)">cmH2O</text>

              {/* CPAP pressure line at 12 cmH2O */}
              <line x1="80" y1="79" x2="650" y2="79" stroke="#60a5fa" strokeWidth="2.5" />
              <text x="660" y="83" fill="#60a5fa" fontSize="10" fontWeight="500">12</text>

              {/* Breath phase indicators for CPAP */}
              <text x="158" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>
              <text x="253" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">OUT</text>
              <text x="348" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>
              <text x="443" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">OUT</text>
              <text x="538" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>
              <text x="620" y="186" textAnchor="middle" fill="#3f3f46" fontSize="8">OUT</text>

              {/* Separator */}
              <line x1="40" y1="205" x2="660" y2="205" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />

              {/* BiPAP section */}
              <text x="80" y="230" fill="#d4d4d8" fontSize="13" fontWeight="600">BiPAP</text>
              <text x="135" y="230" fill="#71717a" fontSize="11">(two pressures)</text>

              {/* BiPAP Y-axis */}
              <line x1="80" y1="242" x2="80" y2="375" stroke="#3f3f46" strokeWidth="1" />
              {/* BiPAP X-axis */}
              <line x1="80" y1="375" x2="650" y2="375" stroke="#3f3f46" strokeWidth="1" />
              {/* Y-axis ticks & labels */}
              <line x1="76" y1="268" x2="80" y2="268" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="272" textAnchor="end" fill="#71717a" fontSize="9">15</text>
              <line x1="76" y1="304" x2="80" y2="304" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="308" textAnchor="end" fill="#71717a" fontSize="9">10</text>
              <line x1="76" y1="340" x2="80" y2="340" stroke="#3f3f46" strokeWidth="1" />
              <text x="72" y="344" textAnchor="end" fill="#71717a" fontSize="9">5</text>
              <text x="35" y="315" textAnchor="middle" fill="#71717a" fontSize="9" transform="rotate(-90, 35, 315)">cmH2O</text>

              {/* IPAP dashed reference line */}
              <line x1="80" y1="275" x2="650" y2="275" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <text x="660" y="279" fill="#60a5fa" fontSize="9" opacity="0.6">IPAP 16</text>

              {/* EPAP dashed reference line */}
              <line x1="80" y1="333" x2="650" y2="333" stroke="#34d399" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <text x="660" y="337" fill="#34d399" fontSize="9" opacity="0.6">EPAP 8</text>

              {/* BiPAP waveform path — 3 breath cycles */}
              <path
                d="M 80,333 L 110,275 L 205,275 L 235,333 L 300,333 L 330,275 L 425,275 L 455,333 L 520,333 L 550,275 L 630,275 L 650,310"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* PS annotation (double-headed arrow between IPAP and EPAP) */}
              <line x1="510" y1="279" x2="510" y2="329" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="506" y1="283" x2="510" y2="275" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="514" y1="283" x2="510" y2="275" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="506" y1="325" x2="510" y2="333" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="514" y1="325" x2="510" y2="333" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="525" y="300" fill="#fbbf24" fontSize="11" fontWeight="600">PS</text>
              <text x="525" y="313" fill="#fbbf24" fontSize="9">= 8</text>

              {/* Breath phase indicators for BiPAP */}
              <text x="158" y="393" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>
              <text x="268" y="393" textAnchor="middle" fill="#3f3f46" fontSize="8">OUT</text>
              <text x="378" y="393" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>
              <text x="488" y="393" textAnchor="middle" fill="#3f3f46" fontSize="8">OUT</text>
              <text x="590" y="393" textAnchor="middle" fill="#3f3f46" fontSize="8">IN</text>

              {/* X-axis label */}
              <text x="365" y="412" textAnchor="middle" fill="#71717a" fontSize="10">Time</text>
            </svg>
          </div>
          <p className="text-center text-xs text-muted-foreground/60">
            Top: CPAP delivers a constant 12 cmH2O regardless of breath phase. Bottom: BiPAP oscillates between EPAP
            (8 cmH2O during exhalation) and IPAP (16 cmH2O during inhalation). The difference between them is Pressure
            Support (PS = 8). The purple line shows the actual pressure delivered to the patient over time.
          </p>

          <p>
            Notice the key difference: with CPAP, you breathe in and out against the same
            pressure. With BiPAP, the machine works <em>with</em> your breathing rhythm. Lower
            pressure when you breathe out (easier exhalation, but the airway stays splinted), higher
            pressure when you breathe in (actively assisting your inhalation).
          </p>
        </div>
      </section>

      {/* Section 7: Pressure Support */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Pressure Support: The Push That Moves Air</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Pressure Support (PS) is the difference between IPAP and EPAP. If your IPAP is 16 and
            your EPAP is 8, your PS is 8 cmH2O. This number is arguably{' '}
            <strong className="text-foreground">the most important setting on a BiPAP machine</strong>,
            because it determines how much the machine actively helps you breathe.
          </p>
          <p>
            Remember our earlier distinction: EPAP is a splint, it holds the airway open. PS is a{' '}
            <strong className="text-foreground">ventilatory assist</strong>. It actively pushes
            extra air volume into your lungs during each breath. Here&apos;s what that means in
            practice:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">It augments tidal volume</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tidal volume is the amount of air you move with each breath. Without PS, you
                  rely entirely on your respiratory muscles to pull air in. With PS, the machine
                  actively pushes a burst of extra air during inhalation. More air per breath =
                  better gas exchange = more oxygen delivered and more CO2 removed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">It reduces work of breathing</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  On CPAP, your diaphragm does all the work of inhalation, essentially pulling air
                  in against the machine&apos;s pressure. With PS, the machine shares the load. Your
                  muscles still initiate the breath, but the pressure boost does part of the heavy
                  lifting. Less work = less muscle fatigue = more sustainable breathing overnight.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">It pushes through flow limitation</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When the airway is partially narrowed (flow-limited), air has difficulty getting
                  through. The higher IPAP pressure during inhalation creates a bigger pressure
                  gradient, physically pushing more air through the narrowed passage. Think of it
                  like turning up the water pressure when a hose has a kink, more pressure = more
                  flow through the restriction.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">It stays ahead of the negative pressure</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Remember the suction problem? When you inhale, you create negative pressure that
                  wants to collapse the airway. IPAP delivers a burst of positive pressure right
                  when that collapse tendency is highest, essentially &quot;getting ahead&quot; of the
                  negative pressure. Instead of your muscles fighting to suck air through a
                  collapsing tube, the machine pushes air through <em>before</em> collapse can take
                  hold.
                </p>
              </div>
            </div>
          </div>

          {/* Diagram 4: Flow volume with and without PS */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/50">
            <svg
              viewBox="0 0 700 300"
              className="w-full"
              role="img"
              aria-label="Comparison of airflow with and without pressure support, showing increased tidal volume with PS"
            >
              <title>Effect of pressure support on airflow volume</title>
              <rect x="0" y="0" width="700" height="300" rx="12" fill="#18181b" />

              <text x="350" y="28" textAnchor="middle" fill="#d4d4d8" fontSize="13" fontWeight="600">How Pressure Support Increases Airflow Volume</text>

              {/* Left chart: Without PS (CPAP) */}
              <text x="190" y="52" textAnchor="middle" fill="#71717a" fontSize="11">Without PS (CPAP only)</text>

              {/* Left axes */}
              <line x1="60" y1="65" x2="60" y2="200" stroke="#3f3f46" strokeWidth="1" />
              <line x1="60" y1="200" x2="330" y2="200" stroke="#3f3f46" strokeWidth="1" />
              <text x="25" y="135" textAnchor="middle" fill="#71717a" fontSize="9" transform="rotate(-90, 25, 135)">Airflow</text>
              <text x="195" y="215" textAnchor="middle" fill="#71717a" fontSize="9">Time</text>

              {/* Left flow waveform — normal/small, slightly flat-topped */}
              <path
                d="M 75,200 Q 100,200 115,155 Q 130,115 160,105 Q 190,95 200,105 Q 220,120 240,155 Q 260,200 280,200"
                fill="#60a5fa"
                fillOpacity="0.15"
                stroke="#60a5fa"
                strokeWidth="2"
              />
              {/* Volume label */}
              <text x="175" y="165" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500">Volume</text>

              {/* Right chart: With PS (BiPAP) */}
              <text x="510" y="52" textAnchor="middle" fill="#71717a" fontSize="11">With PS (BiPAP)</text>

              {/* Right axes */}
              <line x1="380" y1="65" x2="380" y2="200" stroke="#3f3f46" strokeWidth="1" />
              <line x1="380" y1="200" x2="650" y2="200" stroke="#3f3f46" strokeWidth="1" />
              <text x="345" y="135" textAnchor="middle" fill="#71717a" fontSize="9" transform="rotate(-90, 345, 135)">Airflow</text>
              <text x="515" y="215" textAnchor="middle" fill="#71717a" fontSize="9">Time</text>

              {/* Right flow waveform — larger, rounder (PS-augmented) */}
              <path
                d="M 395,200 Q 420,200 435,135 Q 450,80 480,70 Q 510,60 520,70 Q 540,85 560,135 Q 580,200 600,200"
                fill="#34d399"
                fillOpacity="0.15"
                stroke="#34d399"
                strokeWidth="2"
              />
              {/* Ghost of the smaller waveform for comparison */}
              <path
                d="M 395,200 Q 420,200 435,155 Q 450,115 480,105 Q 510,95 520,105 Q 540,120 560,155 Q 580,200 600,200"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.4"
              />
              {/* Volume label */}
              <text x="498" y="145" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="500">More</text>
              <text x="498" y="158" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="500">volume</text>

              {/* Annotation: PS boost arrow */}
              <line x1="480" y1="100" x2="480" y2="70" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="476" y1="78" x2="480" y2="68" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="484" y1="78" x2="480" y2="68" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="498" y="90" fill="#fbbf24" fontSize="9" fontWeight="500">PS boost</text>

              {/* Legend */}
              <line x1="160" y1="250" x2="185" y2="250" stroke="#60a5fa" strokeWidth="2" />
              <text x="192" y="254" fill="#71717a" fontSize="10">CPAP / EPAP only</text>
              <line x1="340" y1="250" x2="365" y2="250" stroke="#34d399" strokeWidth="2" />
              <text x="372" y="254" fill="#71717a" fontSize="10">With Pressure Support</text>
              <line x1="160" y1="272" x2="185" y2="272" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
              <text x="192" y="276" fill="#71717a" fontSize="10">CPAP baseline (for comparison)</text>
            </svg>
          </div>
          <p className="text-center text-xs text-muted-foreground/60">
            Left: breathing on CPAP, your respiratory muscles do all the work. Right: with pressure support, the machine
            pushes extra air during inhalation (green area), increasing tidal volume. The dashed blue line shows the
            CPAP-equivalent breath for comparison. More volume per breath means better ventilation.
          </p>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
            <p className="text-sm font-medium text-purple-400">The two-job summary</p>
            <p className="mt-1 text-sm text-muted-foreground">
              EPAP holds the door open. Pressure Support pushes you through it. EPAP prevents
              collapse, PS ensures adequate ventilation. On CPAP, one pressure tries to do both
              jobs. On BiPAP, each job gets its own optimised pressure. That&apos;s why BiPAP
              may be better suited for cases where independent pressure control is needed.
            </p>
          </div>
        </div>
      </section>

      {/* Section 8: The Complete Breath Cycle */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Complete Breath Cycle on BiPAP</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here&apos;s what happens during a single breath cycle on a BiPAP machine, step by step:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-sm font-bold text-emerald-400">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Resting at EPAP</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Between breaths, the machine maintains EPAP. The airway is splinted open at
                  baseline pressure. You&apos;re in the exhalation phase of the previous breath,
                  air flows out of your lungs easily because you&apos;re exhaling against the lower
                  pressure.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 font-mono text-sm font-bold text-blue-400">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Inspiration detected</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your diaphragm contracts, starting inhalation. The machine detects this by
                  sensing a change in airflow direction or a small drop in circuit pressure. Within
                  milliseconds, it begins ramping up to IPAP.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 font-mono text-sm font-bold text-blue-400">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">IPAP delivered</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The machine reaches IPAP. The higher pressure does two things simultaneously:
                  it maintains the airway splint (since IPAP is even higher than EPAP, the airway
                  is held open even more firmly), and it creates a pressure gradient that pushes
                  air into your lungs. Your respiratory muscles and the machine are now working
                  together to move air in.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 font-mono text-sm font-bold text-blue-400">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Peak inspiration</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your lungs fill with the augmented tidal volume. Because IPAP is pushing air
                  through, you get more volume per breath than you would on CPAP alone. For
                  someone with flow limitation, the higher pressure forces more air through the
                  narrowed section of the airway.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-sm font-bold text-emerald-400">
                5
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Expiration begins</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your inspiratory muscles relax. The machine detects the start of exhalation and
                  drops back to EPAP. The lower expiratory pressure makes it easy to breathe out,
                  your lungs naturally recoil and push air out against the relatively gentle EPAP.
                  The airway stays splinted open throughout.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-sm font-bold text-emerald-400">
                6
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Cycle repeats</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The machine returns to EPAP and waits for your next inspiration. This entire
                  cycle happens 12-20 times per minute, all night long, perfectly synchronised
                  with your natural breathing rhythm.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: What Your Settings Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Your Settings Actually Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Now that you understand the mechanics, here&apos;s a quick reference for the settings
            you&apos;ll see on your machine or in your data:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">CPAP Pressure</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The single pressure setting on a CPAP machine. Measured in cmH2O (centimetres of
                water pressure). Typical range: 4-20 cmH2O. This is both your splint pressure and
                the pressure you breathe against.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">EPAP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expiratory pressure on a BiPAP. Your airway splint. Set high enough to prevent
                collapse but low enough to exhale comfortably. Typical range: 4-15 cmH2O.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">IPAP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inspiratory pressure on a BiPAP. Always higher than EPAP. The difference (PS)
                determines how much ventilatory assistance you get. Typical range: 8-25 cmH2O.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">PS (Pressure Support)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                IPAP minus EPAP. The &quot;boost&quot; during inhalation. Higher PS = more air
                pushed per breath = more ventilatory support. Typical range: 4-12 cmH2O. Some
                machines let you set PS directly instead of IPAP.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">EPR (Expiratory Pressure Relief)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                CPAP comfort feature. Drops pressure by 1-3 cmH2O during exhalation. Effectively
                gives CPAP a small amount of bilevel behaviour. Setting: 0 (off), 1, 2, or 3.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Auto/Min-Max Pressure</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-titrating machines adjust pressure based on detected events. You set a minimum
                and maximum range, and the machine finds the optimal pressure within that range
                each night. Available for both CPAP (APAP) and BiPAP modes.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Ramp</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A comfort feature that starts at a lower pressure and gradually increases to your
                prescribed pressure over 5-45 minutes, making it easier to fall asleep. The
                tradeoff: lower pressure during ramp means less airway splinting while falling
                asleep.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Trigger Sensitivity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                How sensitive the BiPAP machine is to detecting the start of your breath. Higher
                sensitivity means quicker IPAP delivery but risks false triggers from mask leak.
                Lower sensitivity is more reliable but may feel less responsive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: Why This Matters */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Understanding This Matters for Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding how PAP therapy works isn&apos;t just background knowledge. It directly
            helps you interpret your data and have productive conversations with your sleep
            physician:
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">High flow limitation despite good EPAP?</strong>{' '}
                Your airway is splinted, but air isn&apos;t getting through efficiently. You may
                benefit from BiPAP with pressure support to push through the restriction. This is
                especially relevant for{' '}
                <Link href="/glossary#uars" className="text-primary hover:text-primary/80">UARS</Link>{' '}
                patients who have persistent flow limitation without
                frank apnoeas.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Flow limitation worse during REM?</strong>{' '}
                Muscle tone is at its lowest during REM sleep. The airway is floppiest, and the
                splinting pressure needed is highest. Many auto-titrating machines raise pressure
                during REM, and seeing this pattern in your data helps explain why.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Better numbers in the second half of the night?</strong>{' '}
                Auto-titrating machines learn throughout the night. If your flow limitation improves
                after hour 2-3, the machine may have found the right pressure. Your H1/H2 split
                data can show this.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">High EPR causing flow limitation?</strong>{' '}
                EPR reduces expiratory pressure for comfort, but too much EPR can let the airway
                narrow between breaths. If you see significant flow limitation with EPR 3, try
                reducing to EPR 1 or 2 (with your doctor&apos;s guidance).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Understanding NED scores?</strong>{' '}
                Negative Effort Dependence directly reflects the physics we discussed. A high NED
                score means breathing harder is producing less airflow (the paper straw collapsing).
                This is a direct signal that EPAP may be too low or that PS could help overcome the
                restriction.
              </span>
            </li>
          </ul>
          <p>
            The better you understand the physics, the more actionable your data becomes. You&apos;re
            not just seeing numbers anymore. You&apos;re seeing the story of how air moves (or
            doesn&apos;t move) through your airway, and why.
          </p>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Sullivan et al. (1981). &quot;Reversal of obstructive sleep apnoea by continuous
            positive airway pressure applied through the nares.&quot;{' '}
            <em>The Lancet</em>, 317(8225), 862-865. The original CPAP paper.
          </p>
          <p>
            Schwartz et al. (2010). &quot;Effect of pressure support on upper airway mechanics
            and flow limitation in sleep apnoea patients.&quot;{' '}
            <em>European Respiratory Journal</em>, 36(2), 371-378.
          </p>
          <p>
            Farr&eacute; et al. (2004). &quot;Noninvasive monitoring of respiratory mechanics
            during sleep.&quot; <em>European Respiratory Journal</em>, 24(6), 1052-1060.
          </p>
          <p>
            Piper &amp; Sullivan (1994). &quot;Effects of short-term NIPPV in the treatment of
            patients with severe obstructive sleep apnea and hypercapnia.&quot;{' '}
            <em>Chest</em>, 105(2), 434-440.
          </p>
          <p>
            Berry et al. (2012). &quot;Rules for scoring respiratory events in sleep: update of
            the 2007 AASM Manual.&quot;{' '}
            <em>Journal of Clinical Sleep Medicine</em>, 8(5), 597-619.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-amber-400">Medical disclaimer:</strong> This article is
            educational and does not constitute medical advice. PAP therapy settings should only
            be changed under the guidance of your sleep physician or respiratory therapist. If
            you have concerns about your therapy, discuss them with your clinician.
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
            -- how the Glasgow Index, NED, and WAT analysis detect flow limitation in your data.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            -- the evidence that AHI misses the majority of breathing problems.
          </p>
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>{' '}
            -- how to use AirwayLab alongside OSCAR for a complete view of your therapy data.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to Understand Your PAP Data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab analyses your ResMed SD card data for flow limitation, NED scores, breathing
          regularity, and estimated arousals, all in your browser with nothing uploaded to any server.
          See the physics of your therapy in action.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Learn About Our Methodology
          </Link>
        </div>
      </section>
    </article>
  );
}
