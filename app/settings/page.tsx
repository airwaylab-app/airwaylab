import type { Metadata } from 'next';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = {
  title: 'Settings | AirwayLab',
  description:
    'Customise how AirwayLab displays your results. Configure date, time, and number formats, and set your own alert thresholds.',
  alternates: {
    canonical: 'https://airwaylab.app/settings',
  },
};

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Customise how AirwayLab displays your results. All settings are stored
          in your browser — nothing is sent to a server.
        </p>
      </div>

      <SettingsForm />
    </div>
  );
}
