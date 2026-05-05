import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Inline indicator showing auto-save status next to a page title.
 *
 * Renders subtly so as not to compete with the heading:
 *  - idle    : "Tudo salvo" (very muted) or nothing if `lastSavedAt === null`
 *  - saving  : spinner + "Salvando..."
 *  - saved   : green check + "Salvo há Xs"
 *  - error   : red alert + "Erro ao salvar" + retry button
 */
export function AutoSaveIndicator({ status, lastSavedAt, onRetry, className = '' }) {
  const [, forceTick] = useState(0);

  // Tick every 10s so "Salvo há Xs" stays accurate
  useEffect(() => {
    if (status !== 'saved' && status !== 'idle') return;
    const id = setInterval(() => forceTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, [status, lastSavedAt]);

  const base = `inline-flex items-center gap-1.5 text-xs ${className}`;

  if (status === 'saving') {
    return (
      <span className={`${base} text-muted-foreground`} data-testid="autosave-saving" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" />
        Salvando…
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className={`${base} text-[hsl(var(--success))]`} data-testid="autosave-saved" aria-live="polite">
        <CheckCircle2 className="h-3 w-3" />
        Salvo {timeAgo(lastSavedAt)}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className={`${base} text-[hsl(var(--destructive))]`} data-testid="autosave-error" role="alert">
        <AlertCircle className="h-3 w-3" />
        Erro ao salvar
        {onRetry && (
          <Button
            variant="link"
            size="sm"
            onClick={onRetry}
            className="h-auto p-0 ml-1 text-xs text-[hsl(var(--destructive))] underline"
            data-testid="autosave-retry-btn"
          >
            Tentar novamente
          </Button>
        )}
      </span>
    );
  }

  // idle
  if (lastSavedAt) {
    return (
      <span className={`${base} text-muted-foreground/60`} data-testid="autosave-idle">
        Tudo salvo
      </span>
    );
  }
  return null;
}

function timeAgo(date) {
  if (!date) return '';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (sec < 5) return 'agora';
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  return `há ${h}h`;
}

export default AutoSaveIndicator;
