import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { HeatmapView } from './components/HeatmapView'
import { processTimelineData, type ProcessedLocation, type ProcessingStats } from './utils/timelineProcessor'

function App() {
  const [locations, setLocations] = useState<ProcessedLocation[]>([])
  const [stats, setStats] = useState<ProcessingStats | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = async (data: any[]) => {
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
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      {locations.length === 0 ? (
        <div className="h-full flex flex-col">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  🗺️ Google Maps Timeline Heatmap
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
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
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex">
                      <div className="text-red-400">⚠️</div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Error
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="mt-6 max-w-2xl mx-auto text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Processing timeline data...
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Timeline Heatmap
                  </h1>
                  {stats && (
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>{locations.length} locations</span>
                      <span>•</span>
                      <span>{stats.validLocations} visits</span>
                      {stats.dateRange.start && stats.dateRange.end && (
                        <>
                          <span>•</span>
                          <span>
                            {stats.dateRange.start.getFullYear()} - {stats.dateRange.end.getFullYear()}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Upload New File
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <HeatmapView locations={locations} />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
