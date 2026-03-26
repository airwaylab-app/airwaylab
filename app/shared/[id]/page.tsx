import type { Metadata } from 'next';
import Link from 'next/link';
import { Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { SharedViewClient } from '@/components/share/shared-view-client';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { NightResult, MachineSettings } from '@/lib/types';

/**
 * Dynamic OG metadata for shared analysis pages.
 * Shows night date + headline metric in link previews (Discord, Reddit, Slack, etc.)
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = {
    title: 'Shared Analysis | AirwayLab',
    description: 'View a shared PAP therapy analysis with flow limitation scores, Glasgow Index, and RERA detection.',
    robots: { index: false, follow: false },
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return fallback;

  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data } = await supabase
    .from('shared_analyses')
    .select('nights, created_at')
    .eq('id', id)
    .single();

  if (!data) return fallback;

  const nights = rehydrateNights(data.nights);
  if (!nights || nights.length === 0) return fallback;

  const latest = nights[0]!;
  const dateStr = latest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const glasgow = latest.glasgow?.overall?.toFixed(1) ?? '—';
  const fl = latest.wat?.flScore != null ? `${Math.round(latest.wat.flScore)}%` : null;
  const nightCount = nights.length;

  const title = nightCount > 1
    ? `${nightCount} Nights — Glasgow ${glasgow} | AirwayLab`
    : `${dateStr} — Glasgow ${glasgow}${fl ? `, FL ${fl}` : ''} | AirwayLab`;
  const description = `PAP therapy analysis: Glasgow Index ${glasgow}${fl ? `, FL Score ${fl}` : ''}. ${nightCount} night${nightCount > 1 ? 's' : ''} analysed with AirwayLab.`;

  return {
    title,
    description,
    openGraph: { title, description },
    robots: { index: false, follow: false },
  };
}

/**
 * Rehydrate a single night from JSONB.
 * Restores Date objects and migrates missing fields (matches persistence.ts).
 */
function rehydrateNight(raw: Record<string, unknown>): NightResult {
  const ned = (raw.ned ?? {}) as Record<string, unknown>;
  // Migrate settings: add settingsSource if missing (pre-v0.8.0 shares)
  const rawSettings = (raw.settings ?? {}) as Record<string, unknown>;
  if (rawSettings.settingsSource === undefined) {
    rawSettings.settingsSource = 'extracted';
  }
  return {
    ...raw,
    date: new Date(raw.date as string),
    ned: {
      ...ned,
      estimatedArousalIndex: ned.estimatedArousalIndex ?? 0,
      // v0.7.0 field migrations
      hypopneaCount: ned.hypopneaCount ?? 0,
      hypopneaIndex: ned.hypopneaIndex ?? 0,
      hypopneaSource: ned.hypopneaSource ?? 'algorithm',
      hypopneaNedInvisibleCount: ned.hypopneaNedInvisibleCount ?? 0,
      hypopneaNedInvisiblePct: ned.hypopneaNedInvisiblePct ?? 0,
      hypopneaMeanDropPct: ned.hypopneaMeanDropPct ?? 0,
      hypopneaMeanDurationS: ned.hypopneaMeanDurationS ?? 0,
      hypopneaH1Index: ned.hypopneaH1Index ?? 0,
      hypopneaH2Index: ned.hypopneaH2Index ?? 0,
      briefObstructionCount: ned.briefObstructionCount ?? 0,
      briefObstructionIndex: ned.briefObstructionIndex ?? 0,
      briefObstructionH1Index: ned.briefObstructionH1Index ?? 0,
      briefObstructionH2Index: ned.briefObstructionH2Index ?? 0,
      amplitudeCvOverall: ned.amplitudeCvOverall ?? 0,
      amplitudeCvMedianEpoch: ned.amplitudeCvMedianEpoch ?? 0,
      unstableEpochPct: ned.unstableEpochPct ?? 0,
    },
    machineSummary: (raw.machineSummary as NightResult['machineSummary']) ?? null,
    settingsFingerprint: (raw.settingsFingerprint as NightResult['settingsFingerprint']) ?? null,
  } as NightResult;
}

/**
 * Rehydrate nights from JSONB serialisation.
 * Wraps in try/catch — returns null on malformed data so the page
 * can show a graceful error instead of crashing.
 */
function rehydrateNights(raw: unknown): NightResult[] | null {
  try {
    if (!raw || (typeof raw !== 'object')) return null;

    if (!Array.isArray(raw)) {
      return [rehydrateNight(raw as Record<string, unknown>)];
    }

    if (raw.length === 0) return null;

    return raw.map((n: Record<string, unknown>) => rehydrateNight(n));
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return <ExpiredState />;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <ExpiredState />;
  }

  // Fetch the shared analysis
  const { data, error } = await supabase
    .from('shared_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return <ExpiredState />;
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return <ExpiredState expired />;
  }

  // Increment access count (fire and forget)
  supabase
    .from('shared_analyses')
    .update({
      access_count: (data.access_count ?? 0) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .then(() => {
      // intentionally empty — fire and forget
    });

  const nights = rehydrateNights(data.analysis_data);
  if (!nights) {
    return <ExpiredState />;
  }
  const machineInfo = data.machine_info as MachineSettings | null;
  const nightsCount = data.nights_count as number;
  const expiresAt = data.expires_at as string;
  const hasFiles = (data.has_files as boolean) ?? false;
  const filePaths = (data.file_paths as string[]) ?? [];
  const shareUrl =
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://airwaylab.app'}/shared/${id}`;

  return (
    <div className="flex flex-col">
      <SharedViewClient
        nights={nights}
        machineInfo={machineInfo}
        nightsCount={nightsCount}
        expiresAt={expiresAt}
        shareUrl={shareUrl}
        shareId={id}
        hasFiles={hasFiles}
        filePaths={filePaths}
      />

      {/* Privacy footer */}
      <div className="border-t border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-xs text-muted-foreground/60">
            {hasFiles
              ? 'This analysis was shared by the patient. Stored data files expire with the share link (30 days).'
              : 'This analysis was shared by the patient. Only processed results are stored \u2014 raw therapy data was never uploaded.'}
          </p>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

function ExpiredState({ expired = false }: { expired?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
        <Link2 className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">
        {expired
          ? 'This analysis has expired'
          : "This analysis has expired or doesn\u2019t exist"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Share links are available for 30 days after creation.
      </p>
      <Link href="/analyze" className="mt-6">
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Upload Your SD Card
        </Button>
      </Link>
      <p className="mt-4 text-xs text-muted-foreground">
        Want to try AirwayLab? Analyse your PAP data in seconds, right in your
        browser.
      </p>
    </div>
  );
}
