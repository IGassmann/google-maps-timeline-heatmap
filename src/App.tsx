import { lazy, Suspense, useEffect, useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { ShareButton } from './components/ShareButton'
import { Spinner } from './components/Spinner'
import { processTimelineData, type ProcessedLocation, type TimelineEntry } from './utils/timelineProcessor'
import { encodeLocations, decodeLocationsFromHash, encodeCountryData, decodeCountryDataFromHash, type CountryVisit } from './utils/urlCodec'
import { aggregateByCountry } from './utils/countryAggregator'

const HeatmapView = lazy(() => import('./components/HeatmapView').then(m => ({ default: m.HeatmapView })))
const ChoroplethView = lazy(() => import('./components/ChoroplethView').then(m => ({ default: m.ChoroplethView })))

type ViewMode = 'heatmap' | 'choropleth'

function App() {
  const [locations, setLocations] = useState<ProcessedLocation[]>([])
  const [countryData, setCountryData] = useState<CountryVisit[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap')
  const [sharedCountryOnly, setSharedCountryOnly] = useState(false)
  const [error, setError] = useState<string>('')
  const [isLoadingHash, setIsLoadingHash] = useState(
    () => window.location.hash.startsWith('#v1,') || window.location.hash.startsWith('#c1,')
  )

  // Decode hash on initial load (for shared URLs)
  useEffect(() => {
    const hash = window.location.hash

    if (hash.startsWith('#c1,')) {
      let cancelled = false
      decodeCountryDataFromHash(hash).then((decoded) => {
        if (cancelled) return
        if (decoded && decoded.length > 0) {
          setCountryData(decoded)
          setViewMode('choropleth')
          setSharedCountryOnly(true)
        }
        setIsLoadingHash(false)
        history.replaceState(null, '', window.location.pathname)
      })
      return () => { cancelled = true }
    }

    if (hash.startsWith('#v1,')) {
      let cancelled = false
      decodeLocationsFromHash(hash).then((decoded) => {
        if (cancelled) return
        if (decoded && decoded.length > 0) {
          setLocations(decoded)
        }
        setIsLoadingHash(false)
        history.replaceState(null, '', window.location.pathname)
      })
      return () => { cancelled = true }
    }
  }, [])

  const handleFileSelect = (data: TimelineEntry[]) => {
    setError('')

    try {
      const result = processTimelineData(data)
      setLocations(result)
      setCountryData([])
      setViewMode('heatmap')
      setSharedCountryOnly(false)

      if (result.length === 0) {
        setError('No valid location data found in the timeline file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process timeline data')
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleToggleView = async (mode: ViewMode) => {
    if (mode === viewMode) return

    if (mode === 'choropleth' && countryData.length === 0 && locations.length > 0) {
      const aggregated = await aggregateByCountry(locations)
      setCountryData(aggregated)
    }

    setViewMode(mode)
  }

  const handleShare = async () => {
    let hash: string
    if (viewMode === 'choropleth') {
      hash = await encodeCountryData(countryData)
    } else {
      hash = await encodeLocations(locations)
      const decoded = await decodeLocationsFromHash(hash)
      if (decoded && decoded.length > 0) {
        setLocations(decoded)
      }
    }
    return window.location.origin + window.location.pathname + '#' + hash
  }

  const handleReset = () => {
    setLocations([])
    setCountryData([])
    setViewMode('heatmap')
    setSharedCountryOnly(false)
    setError('')
  }

  if (isLoadingHash) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Spinner message="Loading shared map..." />
      </div>
    )
  }

  const hasData = locations.length > 0 || countryData.length > 0

  if (hasData) {
    return (
      <div className="h-screen w-screen relative">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
            <Spinner message="Loading map..." />
          </div>
        }>
          {viewMode === 'choropleth'
            ? <ChoroplethView countryData={countryData} />
            : <HeatmapView locations={locations} />
          }
        </Suspense>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 rounded-full bg-white/90 py-2 pl-4 pr-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Timeline Heatmap</span>

          {!sharedCountryOnly && (
            <div className="flex rounded-full bg-gray-100 p-0.5 dark:bg-zinc-800">
              <button
                onClick={() => handleToggleView('heatmap')}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => handleToggleView('choropleth')}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  viewMode === 'choropleth'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                Countries
              </button>
            </div>
          )}

          <ShareButton onShare={handleShare} />
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
          All processing happens locally in your browser. Your data never leaves your device unless you choose to share it in a low-resolution format.
        </p>
      </div>
    </div>
  )
}

export default App
