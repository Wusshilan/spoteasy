import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[render]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty-state" style={{ minHeight: '100vh' }}>
        <div className="empty-icon">!</div>
        <h2>页面出了点问题</h2>
        <p>{this.state.error.message || '渲染失败'}</p>
        <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    );
  }
}
