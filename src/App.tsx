import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { HeatmapView } from './components/HeatmapView'
import { Heading } from './components/ui/heading'
import { Text, Strong } from './components/ui/text'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
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
                <Heading level={1} className="!text-3xl sm:!text-3xl">
                  Google Maps Timeline Heatmap
                </Heading>
                <Text className="mt-2">
                  Visualize your location history with an interactive heatmap
                </Text>
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
                        <Strong className="!text-red-700 dark:!text-red-400 text-sm">
                          Error
                        </Strong>
                        <Text className="mt-1 !text-red-600 dark:!text-red-300 !text-sm">
                          {error}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="mt-6 max-w-2xl mx-auto text-center">
                  <Badge color="blue">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    Processing timeline data...
                  </Badge>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="h-screen w-screen relative">
          <HeatmapView locations={locations} stats={stats!} />

          {/* Floating header overlay */}
          <div className="absolute top-4 right-4 rounded-xl bg-white p-4 text-sm shadow-lg ring-1 ring-zinc-950/10 z-20 max-w-sm dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex items-center justify-between mb-2">
              <Heading level={2} className="!text-lg sm:!text-lg">
                Timeline Heatmap
              </Heading>
              <Button outline onClick={handleReset} className="ml-4 !text-xs !px-2 !py-1">
                New File
              </Button>
            </div>
            {stats && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="zinc">{locations.length.toLocaleString()} locations</Badge>
                <Badge color="blue">{stats.validLocations.toLocaleString()} visits</Badge>
                {stats.dateRange.start && stats.dateRange.end && (
                  <Badge color="purple">
                    {stats.dateRange.start.getFullYear()} - {stats.dateRange.end.getFullYear()}
                  </Badge>
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
