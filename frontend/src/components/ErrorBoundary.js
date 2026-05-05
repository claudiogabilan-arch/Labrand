import { Component } from 'react';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Top-level error boundary. Class component because that is the only
 * primitive React provides for catching render errors. Wraps the whole
 * Routes tree (and lazy boundaries) so any crash inside a page yields a
 * graceful fallback instead of a white screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Future hook: ship to Sentry/PostHog with `info.componentStack`
    // eslint-disable-next-line no-console
    console.error('App crash:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background" data-testid="error-boundary">
          <div className="text-center max-w-md space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="font-heading text-2xl font-bold">Algo deu errado</h1>
            <p className="text-muted-foreground">
              Encontramos um problema inesperado. A equipe técnica foi notificada.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground font-mono break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={this.handleReset} data-testid="error-reset-btn">Voltar ao Dashboard</Button>
              <Button variant="outline" onClick={() => window.location.reload()} data-testid="error-reload-btn">
                Recarregar
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
