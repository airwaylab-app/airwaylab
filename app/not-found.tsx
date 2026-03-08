import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, BarChart3 } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <p className="font-mono text-6xl font-bold text-muted-foreground/30">
          404
        </p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link href="/">
            <Button variant="default" className="gap-2">
              <Home className="h-3.5 w-3.5" /> Home
            </Button>
          </Link>
          <Link href="/analyze?demo">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-3.5 w-3.5" /> Try the Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
