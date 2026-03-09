import { Crown } from 'lucide-react';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export const revalidate = 3600; // revalidate every hour

interface Supporter {
  display_name: string;
  tier: string;
}

async function getSupporters(): Promise<Supporter[]> {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, tier')
    .eq('show_on_supporters', true)
    .in('tier', ['champion', 'supporter'])
    .order('tier', { ascending: true }) // champions first
    .order('display_name', { ascending: true });

  if (error || !data) return [];

  // M2: Safe field mapping instead of unsafe cast
  return data.map((row) => ({
    display_name: (row.display_name as string) ?? 'Anonymous',
    tier: (row.tier as string) ?? 'supporter',
  }));
}

export default async function SupportersPage() {
  const supporters = await getSupporters();
  const champions = supporters.filter((s) => s.tier === 'champion');
  const supporterTier = supporters.filter((s) => s.tier === 'supporter');

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Our Supporters
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          These people fund AirwayLab&apos;s continued development. Their
          contributions keep the tool free and open-source for everyone.
        </p>
      </div>

      {supporters.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-8 text-center">
          <p className="text-muted-foreground">
            Be the first to appear here! Supporters and Champions who opt in
            will be listed on this page.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {champions.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <h2 className="text-lg font-semibold">Champions</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {champions.map((c, i) => (
                  <div
                    key={`champion-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3"
                  >
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span className="text-sm font-medium">{c.display_name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {supporterTier.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Supporters</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {supporterTier.map((s, i) => (
                  <div
                    key={`supporter-${i}`}
                    className="rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm text-muted-foreground"
                  >
                    {s.display_name}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          Only supporters who opt in are shown. Toggle visibility in your
          account settings.
        </p>
      </div>
    </div>
  );
}
