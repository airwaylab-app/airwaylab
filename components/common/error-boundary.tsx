'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RotateCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Shown in the error card heading */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        context: this.props.context ?? 'component',
        componentStack: info.componentStack,
      },
    });
    console.error(
      `[AirwayLab] Error in ${this.props.context ?? 'component'}:`,
      error,
      info.componentStack
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const ctx = this.props.context ?? 'this section';

      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Something went wrong in {ctx}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                An unexpected error occurred while rendering. This doesn&apos;t
                affect your data — try reloading the section below.
              </p>
              {this.state.error && (
                <pre className="mt-3 max-h-24 overflow-auto rounded-md border border-border/50 bg-background/50 p-2 font-mono text-[11px] text-red-400">
                  {this.state.error.message}
                </pre>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" /> Try Again
                </Button>
                <a
                  href="https://github.com/airwaylab-app/airwaylab/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Bug className="h-3 w-3" /> Report Issue
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
