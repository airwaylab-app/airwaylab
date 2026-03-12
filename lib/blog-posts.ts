export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  readTime: string;
  tags: string[];
  ogDescription: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'ifl-symptom-sensitivity',
    title: 'Not Everyone With High Flow Limitation Feels Bad — Here\'s How to Find Out If Yours Matters',
    description:
      'Two people with the same FL% can feel completely different. Individual sensitivity to flow limitation explains the gap. AirwayLab\'s symptom self-report helps you find your own correlation.',
    date: '2026-03-12',
    readTime: '7 min read',
    tags: ['Flow Limitation', 'Symptoms', 'IFL Sensitivity', 'Self-Report'],
    ogDescription:
      'High flow limitation doesn\'t always cause symptoms. Track your own IFL sensitivity with AirwayLab\'s symptom self-report to find out if your FL is driving how you feel.',
  },
  {
    slug: 'hidden-respiratory-events',
    title: 'The Hidden Respiratory Events Your Flow Data Isn\'t Showing You',
    description:
      'Your AHI is normal, your NED looks clean, but your oximetry shows constant arousals. Brief airway obstructions — events too short and too subtle for standard detection — may explain the gap.',
    date: '2026-03-12',
    readTime: '8 min read',
    tags: ['Brief Obstructions', 'Flow Limitation', 'Amplitude', 'UARS'],
    ogDescription:
      'Standard flow analysis misses brief airway obstructions — 1-2 breath events that slip under every detection threshold. Learn how amplitude-based analysis fills the gap between your metrics and your symptoms.',
  },
  {
    slug: 'flow-limitation-and-sleepiness',
    title: 'Does Flow Limitation Drive Sleepiness? What the Evidence Shows',
    description:
      'Your AHI is 2, your arousal index is low, but you\'re exhausted. A growing body of research shows flow limitation itself may drive daytime sleepiness — independent of arousals.',
    date: '2026-03-12',
    readTime: '9 min read',
    tags: ['Flow Limitation', 'Research', 'UARS', 'Sleepiness'],
    ogDescription:
      'Research shows inspiratory flow limitation predicts sleepiness independent of arousals and AHI. Learn what this means for tracking your PAP therapy.',
  },
  {
    slug: 'arousals-vs-flow-limitation',
    title: 'Arousals Don\'t Tell the Whole Story: Why Flow Limitation May Matter More',
    description:
      'Sleep medicine assumed arousals fragment sleep and cause symptoms. But research from Dr. Avram Gold and others suggests the stress response to flow limitation itself is the primary driver.',
    date: '2026-03-12',
    readTime: '9 min read',
    tags: ['Arousals', 'Flow Limitation', 'UARS', 'Research'],
    ogDescription:
      'Arousals may not be the primary driver of sleep-disordered breathing symptoms. Dr. Gold\'s limbic stress response model offers a compelling alternative.',
  },
  {
    slug: 'epworth-sleepiness-scale',
    title: 'Is the Epworth Sleepiness Scale Measuring What You Think?',
    description:
      'You scored normal on the ESS but feel terrible. Recent research by Drs. Gold and Stoohs shows the ESS conflates sleepiness and fatigue — and may be screening out the patients who need help most.',
    date: '2026-03-12',
    readTime: '8 min read',
    tags: ['ESS', 'Fatigue', 'UARS', 'Research'],
    ogDescription:
      'The Epworth Sleepiness Scale conflates sleepiness and fatigue. If your main symptom is exhaustion rather than drowsiness, the ESS may miss your problem entirely.',
  },
  {
    slug: 'what-is-cns-sensitization',
    title: 'Why Your Brain Might Matter More Than Your Airway: Understanding CNS Sensitization in Sleep-Disordered Breathing',
    description:
      'Your flow limitation is mild, but your arousals are through the roof. A growing body of research points to central nervous system sensitization — and your AirwayLab data might already be showing it.',
    date: '2026-03-09',
    readTime: '8 min read',
    tags: ['UARS', 'Sensitization', 'Flow Limitation', 'Arousals', 'Research'],
    ogDescription:
      'Mild flow limitation but sky-high arousals? Research points to CNS sensitization. Learn what this pattern means and how AirwayLab detects it.',
  },
  {
    slug: 'understanding-flow-limitation',
    title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You',
    description:
      'Flow limitation is the subtle breathing restriction your AHI score completely ignores. Learn what it is, why it matters, and how to detect it in your own PAP data.',
    date: '2026-03-06',
    readTime: '8 min read',
    tags: ['Flow Limitation', 'PAP', 'Sleep Apnea'],
    ogDescription:
      'Your AHI might be low, but flow limitation could still be disrupting your sleep. Learn what flow limitation is and why it matters for PAP therapy.',
  },
  {
    slug: 'beyond-ahi',
    title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You',
    description:
      'The Apnea-Hypopnea Index has been the gold standard for decades. But a growing body of research shows it misses critical breathing events. Here\'s what you should be tracking instead.',
    date: '2026-02-20',
    readTime: '10 min read',
    tags: ['AHI', 'Sleep Metrics', 'Research'],
    ogDescription:
      'AHI is the most commonly used metric in sleep medicine, but research shows it misses important breathing patterns. Discover what metrics actually matter.',
  },
  {
    slug: 'pap-data-privacy',
    title: 'Your PAP Data Belongs to You: Privacy in Sleep Medicine',
    description:
      'Every night, your PAP machine collects intimate health data. Where does it go? Who can see it? And what are your rights? A look at privacy in the age of connected sleep devices.',
    date: '2026-02-05',
    readTime: '7 min read',
    tags: ['Privacy', 'Data Rights', 'ResMed'],
    ogDescription:
      'Your PAP device collects detailed health data every night. Learn who has access to it, what your rights are, and how to take control of your sleep data.',
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
