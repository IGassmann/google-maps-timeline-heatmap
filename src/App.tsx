import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { HeatmapView } from './components/HeatmapView'
import { processTimelineData, type ProcessedLocation, type ProcessingStats, type TimelineEntry } from './utils/timelineProcessor'

function App() {
  const [locations, setLocations] = useState<ProcessedLocation[]>([])
  const [stats, setStats] = useState<ProcessingStats | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = async (data: TimelineEntry[]) => {
    setIsProcessing(true)
    setError('')

    try {
      const result = processTimelineData(data)
      setLocations(result.locations)
      setStats(result.stats)

      if (result.locations.length === 0) {
        setError('No valid location data found in the timeline file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process timeline data')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleReset = () => {
    setLocations([])
    setStats(null)
    setError('')
  }

  return (
    <div className="h-full bg-white dark:bg-zinc-900">
      {locations.length === 0 ? (
        <div className="h-full flex flex-col">
          <header className="border-b border-zinc-950/10 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="text-center">
                <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">
                  Google Maps Timeline Heatmap
                </h1>
                <p className="mt-2 text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                  Visualize your location history with an interactive heatmap
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl">
              <FileUpload
                onFileSelect={handleFileSelect}
                onError={handleError}
              />

              {error && (
                <div className="mt-6 max-w-2xl mx-auto">
                  <div className="rounded-lg bg-red-500/10 p-4 ring-1 ring-red-600/20 dark:ring-red-500/30">
                    <div className="flex">
                      <div className="ml-3">
                        <strong className="font-medium text-red-700 dark:text-red-400 text-sm">
                          Error
                        </strong>
                        <p className="mt-1 text-red-600 dark:text-red-300 text-sm">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="mt-6 max-w-2xl mx-auto text-center">
                  <span className="inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-sm/5 font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    Processing timeline data...
                  </span>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="h-screen w-screen relative">
          <HeatmapView locations={locations} />

          {/* Floating header overlay */}
          <div className="absolute top-4 right-4 rounded-xl bg-white p-4 text-sm shadow-lg ring-1 ring-zinc-950/10 z-20 max-w-sm dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Timeline Heatmap
              </h2>
              <button
                onClick={handleReset}
                className="ml-4 text-xs px-2 py-1 rounded-lg border border-zinc-950/10 text-zinc-950 hover:bg-zinc-950/2.5 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
              >
                New File
              </button>
            </div>
            {stats && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-xs/5 font-medium bg-zinc-600/10 text-zinc-700 dark:bg-white/5 dark:text-zinc-400">
                  {locations.length.toLocaleString()} locations
                </span>
                <span className="inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-xs/5 font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                  {stats.validLocations.toLocaleString()} visits
                </span>
                {stats.dateRange.start && stats.dateRange.end && (
                  <span className="inline-flex items-center gap-x-1.5 rounded-md px-1.5 py-0.5 text-xs/5 font-medium bg-purple-500/15 text-purple-700 dark:text-purple-400">
                    {stats.dateRange.start.getFullYear()} - {stats.dateRange.end.getFullYear()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
