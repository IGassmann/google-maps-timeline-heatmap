import { lazy, Suspense, useEffect, useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { ShareButton } from './components/ShareButton'
import { Spinner } from './components/Spinner'
import { processTimelineData, type ProcessedLocation, type TimelineEntry } from './utils/timelineProcessor'
import { encodeLocations, decodeLocationsFromHash } from './utils/urlCodec'

const HeatmapView = lazy(() => import('./components/HeatmapView').then(m => ({ default: m.HeatmapView })))

function App() {
  const [locations, setLocations] = useState<ProcessedLocation[]>([])
  const [error, setError] = useState<string>('')
  const [isLoadingHash, setIsLoadingHash] = useState(
    () => window.location.hash.startsWith('#v1,')
  )

  useEffect(() => {
    if (!window.location.hash.startsWith('#v1,')) return

    let cancelled = false

    decodeLocationsFromHash(window.location.hash).then((decoded) => {
      if (cancelled) return
      if (decoded && decoded.length > 0) {
        setLocations(decoded)
      }
      setIsLoadingHash(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleFileSelect = (data: TimelineEntry[]) => {
    setError('')

    try {
      const result = processTimelineData(data)
      setLocations(result)

      if (result.length === 0) {
        setError('No valid location data found in the timeline file')
      } else {
        encodeLocations(result).then((hash) => {
          history.replaceState(null, '', '#' + hash)
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process timeline data')
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleReset = () => {
    setLocations([])
    setError('')
    history.replaceState(null, '', window.location.pathname)
  }

  if (isLoadingHash) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Spinner message="Loading shared heatmap..." />
      </div>
    )
  }

  if (locations.length > 0) {
    return (
      <div className="h-screen w-screen relative">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
            <Spinner message="Loading map..." />
          </div>
        }>
          <HeatmapView locations={locations} />
        </Suspense>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 rounded-full bg-white/90 py-2 pl-4 pr-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Timeline Heatmap</span>
          <ShareButton />
          <button
            onClick={handleReset}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            New File
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Timeline Heatmap
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
          Visualize your Google Maps location history
        </p>

        <div className="mt-10">
          <FileUpload
            onFileSelect={handleFileSelect}
            onError={handleError}
          />
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900">
            {error}
          </div>
        )}

        <p className="mt-10 text-xs text-gray-400 dark:text-zinc-600">
          All processing happens locally in your browser. Your data never leaves your device.
        </p>
      </div>
    </div>
  )
}

export default App
