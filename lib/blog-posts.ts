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
    date: '2025-03-06',
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
    date: '2025-02-20',
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
    date: '2025-02-05',
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
