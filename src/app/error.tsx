'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useLanguage();

  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/5 p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-6 shadow-sm border border-red-200 dark:border-red-900/30">
        <AlertTriangle className="h-10 w-10 shrink-0" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Internal error occurred</h2>
      <p className="text-sm text-muted-foreground max-w-[400px] mb-8 leading-relaxed">
        {error?.message || "Something went wrong while loading this page."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button 
          onClick={reset} 
          variant="default"
          className="gap-2 shrink-0 active:scale-95 transition-all w-full sm:w-auto px-6 h-11 rounded-xl"
        >
          <RefreshCcw className="h-4 w-4 shrink-0" />
          {dict.common.try_again || 'Coba Lagi'}
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/'}
          className="gap-2 shrink-0 active:scale-95 transition-all w-full sm:w-auto px-6 h-11 rounded-xl bg-background"
        >
          <Home className="h-4 w-4 shrink-0" />
          {dict.common.home || 'Kembali Awal'}
        </Button>
      </div>
    </div>
  );
}
