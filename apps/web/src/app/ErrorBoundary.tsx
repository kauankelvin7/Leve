import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="entry" role="alert">
        <h1>Não foi possível carregar a interface</h1>
        <p>Verifique sua conexão e tente novamente. Recarregar descarta as alterações temporárias da demonstração.</p>
        <button onClick={() => window.location.reload()}>Recarregar</button>
      </main>;
    }
    return this.props.children;
  }
}
