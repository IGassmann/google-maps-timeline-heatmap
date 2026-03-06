interface StatsDashboardProps {
  isVisible: boolean
  onToggle: () => void
}

export function StatsDashboard({ isVisible, onToggle }: StatsDashboardProps) {
  return (
    <div className="absolute top-4 left-4 z-20">
      <button
        onClick={onToggle}
        className="mb-2 p-2 rounded-lg shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 bg-white dark:bg-zinc-900 border-transparent text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/10"
        aria-label="Toggle Statistics Dashboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {isVisible && (
        <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-zinc-950/10 w-80 max-w-sm max-h-[80vh] overflow-y-auto dark:bg-zinc-900 dark:ring-white/10">
          <h3 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">
            Timeline Statistics
          </h3>
        </div>
      )}
    </div>
  )
}
