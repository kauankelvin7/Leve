import { Component, type ReactNode } from 'react';
import { StatusPage } from '../components/ui/StatusPage';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <StatusPage status={500} onAction={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
