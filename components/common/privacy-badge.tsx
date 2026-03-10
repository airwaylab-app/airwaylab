import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function PrivacyBadge() {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 border-green-800/30 bg-green-950/50 text-green-400"
    >
      <Shield className="h-3 w-3" />
      100% client-side — your data never leaves your device
    </Badge>
  );
}
