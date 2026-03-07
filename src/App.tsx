import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { FileUpload } from './components/FileUpload'
import { ShareButton } from './components/ShareButton'
import { Spinner } from './components/Spinner'
import { processTimelineData, type ProcessedLocation, type TimelineEntry } from './utils/timelineProcessor'
import { encodeLocations, decodeLocationsFromHash, encodeCountryData, decodeCountryDataFromHash, type CountryVisit } from './utils/urlCodec'
import { aggregateByCountry } from './utils/countryAggregator'

type ViewMode = 'heatmap' | 'choropleth'

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'carto',
      type: 'raster',
      source: 'carto'
    }
  ]
}

function App() {
  const [locations, setLocations] = useState<ProcessedLocation[]>([])
  const [countryData, setCountryData] = useState<CountryVisit[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap')
  const [sharedCountryOnly, setSharedCountryOnly] = useState(false)
  const [error, setError] = useState<string>('')
  const [isLoadingHash, setIsLoadingHash] = useState(
    () => window.location.hash.startsWith('#v1,') || window.location.hash.startsWith('#c1,')
  )

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const activeLayersRef = useRef<'heatmap' | 'choropleth' | null>(null)

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

  const hasData = locations.length > 0 || countryData.length > 0

  // Map creation effect
  useEffect(() => {
    if (!hasData || !mapContainerRef.current) return

    const instance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 1
    })

    mapRef.current = instance

    instance.on('load', () => {
      setIsMapLoaded(true)
    })

    instance.on('error', (e) => {
      console.error('Map error:', e)
    })

    return () => {
      mapRef.current = null
      activeLayersRef.current = null
      setIsMapLoaded(false)
      instance.remove()
    }
  }, [hasData])

  // Layer management effect
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    let cancelled = false

    async function swapLayers() {
      const map = mapRef.current!

      // Remove previous layers
      if (activeLayersRef.current === 'heatmap') {
        const { remove } = await import('./layers/heatmapLayers')
        remove(map)
      } else if (activeLayersRef.current === 'choropleth') {
        const { remove } = await import('./layers/choroplethLayers')
        remove(map)
      }
      activeLayersRef.current = null

      if (cancelled) return

      // Apply new layers
      if (viewMode === 'choropleth' && countryData.length > 0) {
        const { apply } = await import('./layers/choroplethLayers')
        if (cancelled) return
        await apply(map, countryData)
        if (!cancelled) activeLayersRef.current = 'choropleth'
      } else if (viewMode === 'heatmap' && locations.length > 0) {
        const { apply } = await import('./layers/heatmapLayers')
        if (cancelled) return
        apply(map, locations)
        if (!cancelled) activeLayersRef.current = 'heatmap'
      }
    }

    swapLayers()

    return () => { cancelled = true }
  }, [viewMode, locations, countryData, isMapLoaded])

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

  if (hasData) {
    return (
      <div className="h-screen w-screen relative">
        <div
          ref={mapContainerRef}
          className="w-full h-full min-h-[500px]"
        />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
            <Spinner message="Loading map..." />
          </div>
        )}

        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 rounded-full bg-white/90 py-2 pl-2 pr-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
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
