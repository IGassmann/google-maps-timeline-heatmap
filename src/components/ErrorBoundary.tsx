import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-12 dark:bg-zinc-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              An unexpected error occurred. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
