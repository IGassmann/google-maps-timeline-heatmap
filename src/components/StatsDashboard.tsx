import type { ProcessedLocation, ProcessingStats } from '../utils/timelineProcessor'

interface StatsDashboardProps {
  locations: ProcessedLocation[]
  stats: ProcessingStats
  isVisible: boolean
  onToggle: () => void
}

function formatDuration(milliseconds: number): string {
  if (milliseconds === 0) return '0 mins'

  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.length > 0 ? parts.join(' ') : '0 mins'
}

export function StatsDashboard({ locations, stats, isVisible, onToggle }: StatsDashboardProps) {
  const totalDuration = locations.reduce((sum, loc) => sum + loc.totalDuration, 0)

  const locationTypes = locations.reduce((acc, loc) => {
    const type = loc.semanticType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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
          <h3 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white mb-4">
            Timeline Statistics
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {locations.length.toLocaleString()}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Locations</p>
              </div>

              <div className="bg-green-500/10 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.validLocations.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">Total Visits</p>
              </div>

              <div className="bg-purple-500/10 p-3 rounded-lg col-span-2">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {formatDuration(totalDuration)}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Total Time</p>
              </div>
            </div>

            {stats.dateRange.start && stats.dateRange.end && (
              <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-lg">
                <h4 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white mb-1">
                  Time Period
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {stats.dateRange.start.toLocaleDateString()} - {stats.dateRange.end.toLocaleDateString()}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {Math.ceil((stats.dateRange.end.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            )}

            <div>
              <h4 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white mb-2">
                Location Types
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(locationTypes)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([type, count]) => (
                    <span key={type} className="inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-xs/5 font-medium bg-zinc-600/10 text-zinc-700 dark:bg-white/5 dark:text-zinc-400">
                      {type.replace(/([A-Z])/g, ' $1').trim()}: {count}
                    </span>
                  ))}
              </div>
            </div>

            <hr role="presentation" className="w-full border-t border-zinc-950/5 dark:border-white/5" />

            <dl className="grid grid-cols-1 text-base/6 sm:grid-cols-[min(50%,--spacing(80))_auto] sm:text-sm/6">
              <dt className="col-start-1 border-t border-zinc-950/5 pt-3 text-zinc-500 first:border-none sm:border-t sm:border-zinc-950/5 sm:py-3 dark:border-white/5 dark:text-zinc-400 sm:dark:border-white/5">
                Avg. visit duration
              </dt>
              <dd className="pt-1 pb-3 text-zinc-950 sm:border-t sm:border-zinc-950/5 sm:py-3 sm:nth-2:border-none dark:text-white dark:sm:border-white/5">
                <strong className="font-medium text-zinc-950 dark:text-white">{formatDuration(locations.length > 0 ? totalDuration / stats.validLocations : 0)}</strong>
              </dd>
              <dt className="col-start-1 border-t border-zinc-950/5 pt-3 text-zinc-500 sm:border-t sm:border-zinc-950/5 sm:py-3 dark:border-white/5 dark:text-zinc-400 sm:dark:border-white/5">
                Invalid entries
              </dt>
              <dd className="pt-1 pb-3 text-zinc-950 sm:border-t sm:border-zinc-950/5 sm:py-3 dark:text-white dark:sm:border-white/5">
                <strong className="font-medium text-zinc-950 dark:text-white">{stats.invalidEntries.toLocaleString()}</strong>
              </dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
