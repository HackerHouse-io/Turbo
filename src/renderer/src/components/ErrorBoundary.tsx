import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('React Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace', background: '#0a0a0f', height: '100%' }}>
          <h1 style={{ fontSize: 20, marginBottom: 16 }}>Turbo - Renderer Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#e4e4ef' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#8888a0', marginTop: 12 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
