import { Settings2 } from 'lucide-react';
import type { MachineSettings } from '@/lib/types';

interface Props {
  settings: MachineSettings;
}

export function MachineSettingsBar({ settings }: Props) {
  if (settings.settingsSource !== 'extracted') return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/30 bg-card/30 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Settings2 className="h-3 w-3 text-muted-foreground/70" />
        <strong className="text-foreground/80">{settings.papMode}</strong>
      </span>
      <span>
        {settings.papMode === 'CPAP' ? 'Pressure' : 'EPAP/IPAP'}:{' '}
        <strong className="text-foreground">
          {settings.papMode === 'CPAP'
            ? `${settings.epap.toFixed(1)}`
            : `${settings.epap.toFixed(1)} / ${settings.ipap.toFixed(1)}`}{' '}
          cmH₂O
        </strong>
      </span>
      {settings.riseTime != null && (
        <span>
          Rise time: <strong className="text-foreground">{settings.riseTime}</strong>
        </span>
      )}
      {settings.trigger && settings.trigger !== 'unknown' && (
        <span>
          Trigger: <strong className="text-foreground">{settings.trigger}</strong>
        </span>
      )}
      {settings.cycle && settings.cycle !== 'unknown' && (
        <span>
          Cycle: <strong className="text-foreground">{settings.cycle}</strong>
        </span>
      )}
    </div>
  );
}
