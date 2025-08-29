import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ProcessedLocation } from '../utils/timelineProcessor'

interface HeatmapViewProps {
  locations: ProcessedLocation[]
  onMapLoad?: () => void
}

export function HeatmapView({ locations, onMapLoad }: HeatmapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    console.log('Initializing MapLibre GL map...')
    
    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },
        center: [-98.5, 39.8],
        zoom: 4,
        attributionControl: true
      })

      map.current.on('load', () => {
        console.log('Map loaded successfully')
        setIsMapLoaded(true)
        onMapLoad?.()
      })

      map.current.on('error', (e) => {
        console.error('Map error:', e)
      })

      return () => {
        map.current?.remove()
        map.current = null
      }
    } catch (error) {
      console.error('Failed to initialize map:', error)
    }
  }, [onMapLoad])

  useEffect(() => {
    if (!map.current || !isMapLoaded || locations.length === 0) {
      console.log('Heatmap effect conditions not met:', {
        hasMap: !!map.current,
        isMapLoaded,
        locationsCount: locations.length
      })
      return
    }

    console.log(`Processing ${locations.length} locations for heatmap...`)

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: locations.map(location => ({
        type: 'Feature' as const,
        properties: {
          count: location.count,
          duration: location.totalDuration,
          semanticType: location.semanticType || 'Unknown'
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [location.longitude, location.latitude]
        }
      }))
    }

    console.log('GeoJSON sample:', geojsonData.features.slice(0, 3))

    if (map.current.getSource('timeline-data')) {
      const source = map.current.getSource('timeline-data') as maplibregl.GeoJSONSource
      source.setData(geojsonData)
    } else {
      map.current.addSource('timeline-data', {
        type: 'geojson',
        data: geojsonData
      })

      map.current.addLayer({
        id: 'timeline-heatmap',
        type: 'heatmap',
        source: 'timeline-data',
        maxzoom: 15,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            0, 0,
            10, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            15, 20
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            15, 0
          ]
        }
      })

      map.current.addLayer({
        id: 'timeline-points',
        type: 'circle',
        source: 'timeline-data',
        minzoom: 14,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 4,
            10, 8,
            50, 12
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, '#3182ce',
            10, '#e53e3e',
            50, '#d53f8c'
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8
        }
      })
    }

    if (locations.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      locations.forEach(location => {
        bounds.extend([location.longitude, location.latitude])
      })
      
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 12
      })
    }

  }, [locations, isMapLoaded])

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[500px]"
        style={{ minHeight: '500px' }}
      />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      )}
      {locations.length > 0 && isMapLoaded && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm z-10">
          <div className="font-medium text-gray-900 dark:text-white">
            {locations.length.toLocaleString()} unique locations
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {locations.reduce((sum, loc) => sum + loc.count, 0).toLocaleString()} total visits
          </div>
        </div>
      )}
    </div>
  )
}
