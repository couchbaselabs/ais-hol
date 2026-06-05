import React from 'react'

/**
 * Catches render errors in any child component tree and shows a fallback UI
 * instead of white-screening the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '1rem',
          borderRadius: '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontFamily: 'monospace',
        }}>
          <strong>Something went wrong in this tab.</strong>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '0.75rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '4px',
              border: '1px solid #fca5a5',
              background: '#fff',
              color: '#991b1b',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
