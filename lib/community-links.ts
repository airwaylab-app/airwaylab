// ============================================================
// AirwayLab — Community Link Mapping
// Compliance gate: Head of Compliance must review link targets
// before COMMUNITY_LINKS_ENABLED is set to true.
// See AIR-667 / AIR-664.
// ============================================================

/** Set to true only after Head of Compliance has reviewed all link targets. */
export const COMMUNITY_LINKS_ENABLED = false;

export interface CommunityLink {
  label: string;
  url: string;
  source: 'apneaboard' | 'reddit' | 'wiki' | 'other';
}

export interface PatternLinks {
  /**
   * Hedged summary describing what people commonly explore.
   * Must use: "commonly discussed", "often explored", "some users find"
   * Must NOT use: "you should", "this means", "treatment"
   */
  summary: string;
  links: CommunityLink[];
}

/**
 * Community link mapping keyed by metric pattern ID.
 * These are shown in the "What people explore in this situation" accordion
 * on amber/red metric cards — only when COMMUNITY_LINKS_ENABLED is true.
 *
 * Compliance conditions (AIR-668):
 * 1. Link labels must describe data patterns, not device settings.
 * 2. Introductory text must not name device parameters.
 * 3. No therapy parameter names in labels (EPR, EPAP, IPAP, pressure support,
 *    trigger sensitivity, rise time, cycle sensitivity).
 */
export const COMMUNITY_LINK_MAP: Record<string, PatternLinks> = {
  iflRisk_elevated: {
    summary:
      'Elevated IFL risk is commonly discussed in CPAP communities, often in relation to inspiratory flow shape and upper airway mechanics.',
    links: [
      {
        label: 'Flow limitation patterns — ApneaBoard',
        url: 'https://www.apneaboard.com/forums/',
        source: 'apneaboard',
      },
      {
        label: 'Flow limitation patterns — r/SleepApnea',
        url: 'https://www.reddit.com/r/SleepApnea/',
        source: 'reddit',
      },
    ],
  },
  glasgow_elevated: {
    summary:
      'Elevated Glasgow scores are commonly discussed in PAP therapy communities, often in relation to breath shape and inspiratory waveform patterns.',
    links: [
      {
        label: 'Breath waveform analysis — ApneaBoard',
        url: 'https://www.apneaboard.com/forums/',
        source: 'apneaboard',
      },
      {
        label: 'Breath shape patterns — r/SleepApnea',
        url: 'https://www.reddit.com/r/SleepApnea/',
        source: 'reddit',
      },
    ],
  },
  ned_elevated: {
    summary:
      'High NED values are commonly discussed in PAP therapy communities, often in relation to inspiratory flow shape and effort-dependent breathing patterns.',
    links: [
      {
        label: 'Effort-dependent flow patterns — ApneaBoard',
        url: 'https://www.apneaboard.com/forums/',
        source: 'apneaboard',
      },
      {
        label: 'Effort-dependent patterns — r/SleepApnea',
        url: 'https://www.reddit.com/r/SleepApnea/',
        source: 'reddit',
      },
    ],
  },
  eai_elevated_fl_low: {
    summary:
      'When disruption markers are elevated without flow limitation, factors like sleep position and congestion are commonly explored in PAP therapy communities.',
    links: [
      {
        label: 'Non-flow disruption patterns — ApneaBoard',
        url: 'https://www.apneaboard.com/forums/',
        source: 'apneaboard',
      },
      {
        label: 'Second-half flow changes — r/SleepApnea',
        url: 'https://www.reddit.com/r/SleepApnea/',
        source: 'reddit',
      },
    ],
  },
};
