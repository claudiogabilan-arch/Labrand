import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/**
 * Reusable empty state for first-use moments.
 *
 * Visual recipe:
 *  - Generous vertical padding (py-16) to give the message space.
 *  - Icon in a soft secondary-tinted disc (lg, ~64px) — tints work in both light/dark mode
 *    via HSL alpha tokens.
 *  - Heading uses font-heading + text-xl.
 *  - Description is muted, max-w-md, centered.
 *  - One primary CTA + optional secondary (ghost/link).
 *
 * Props:
 *  - icon: React component (Lucide icon)
 *  - title: string
 *  - description: string
 *  - primaryAction: { label, onClick, icon? }
 *  - secondaryAction?: { label, onClick, href? }
 *  - testId?: string
 *  - bordered?: boolean (default true) — wraps in a dashed Card
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  testId = 'empty-state',
  bordered = true,
  className = '',
}) {
  const inner = (
    <div className="flex flex-col items-center text-center px-6 py-16 gap-5" data-testid={testId}>
      {Icon && (
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: 'hsl(var(--secondary) / 0.1)' }}
        >
          <Icon className="w-8 h-8" style={{ color: 'hsl(var(--secondary))' }} />
        </div>
      )}
      <div className="space-y-2 max-w-md">
        <h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              data-testid={`${testId}-primary-action`}
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant="ghost" data-testid={`${testId}-secondary-action`}>
                <a href={secondaryAction.href} target={secondaryAction.external ? '_blank' : undefined} rel="noreferrer">
                  {secondaryAction.label}
                </a>
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={secondaryAction.onClick}
                data-testid={`${testId}-secondary-action`}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );

  if (!bordered) return <div className={className}>{inner}</div>;
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}

export default EmptyState;
