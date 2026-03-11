import type { Metadata } from 'next';
import Link from 'next/link';
import { Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { SharedViewClient } from '@/components/share/shared-view-client';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { NightResult, MachineSettings } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Shared Analysis | AirwayLab',
  description:
    'View a shared PAP therapy analysis — Glasgow Index scores, flow limitation patterns, and oximetry insights.',
  robots: { index: false, follow: false },
};

/**
 * Rehydrate Date objects from JSONB serialisation.
 * Matches the pattern in lib/persistence.ts.
 */
function rehydrateNights(raw: unknown): NightResult[] {
  if (!Array.isArray(raw)) {
    // Single night stored as object — wrap in array
    const night = raw as Record<string, unknown>;
    return [
      {
        ...night,
        date: new Date(night.date as string),
        ned: {
          ...(night.ned as Record<string, unknown>),
          estimatedArousalIndex:
            (night.ned as Record<string, unknown>).estimatedArousalIndex ?? 0,
        },
      } as NightResult,
    ];
  }

  return raw.map((n: Record<string, unknown>) => ({
    ...n,
    date: new Date(n.date as string),
    ned: {
      ...(n.ned as Record<string, unknown>),
      estimatedArousalIndex:
        (n.ned as Record<string, unknown>).estimatedArousalIndex ?? 0,
    },
  })) as NightResult[];
}

interface PageProps {
  params: { id: string };
}

export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = params;

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
  const machineInfo = data.machine_info as MachineSettings | null;
  const nightsCount = data.nights_count as number;
  const expiresAt = data.expires_at as string;
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
      />

      {/* Privacy footer */}
      <div className="border-t border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-xs text-muted-foreground/60">
            This analysis was shared by the patient. Only processed results are
            stored — raw therapy data was never uploaded.
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
