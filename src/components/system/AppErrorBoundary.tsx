import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReload?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught React render error', error, info);
  }

  private readonly onReload = (): void => {
    (this.props.onReload ?? (() => window.location.reload()))();
  };

  private readonly onGoHome = (): void => {
    (this.props.onGoHome ?? (() => window.location.assign('/')))();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        aria-labelledby="app-error-heading"
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          justifyContent: 'center',
          margin: '0 auto',
          maxWidth: '560px',
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 id="app-error-heading" style={{ margin: 0 }}>
          應用程式發生錯誤
        </h1>
        <p style={{ margin: 0 }}>請重新載入頁面，或返回首頁後再試一次。</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <button type="button" onClick={this.onReload}>
            重新載入
          </button>
          <button type="button" onClick={this.onGoHome}>
            回首頁
          </button>
        </div>
      </main>
    );
  }
}
