import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ProcessedLocation, ProcessingStats } from '../utils/timelineProcessor'
import { StatsDashboard } from './StatsDashboard'

interface HeatmapViewProps {
  locations: ProcessedLocation[]
  stats: ProcessingStats
  onMapLoad?: () => void
}

export function HeatmapView({ locations, stats, onMapLoad }: HeatmapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

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
        zoom: 4
      })

      map.current.on('load', () => {
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
    if (!map.current || !isMapLoaded || locations.length === 0) return

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
            1, 0.1,
            5, 0.5,
            20, 1,
            100, 2
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.8,
            9, 1.2,
            15, 2
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, 'rgba(0,100,255,0.4)',
            0.3, 'rgba(0,200,255,0.6)',
            0.5, 'rgba(255,255,0,0.8)',
            0.7, 'rgba(255,150,0,0.9)',
            0.9, 'rgba(255,50,0,0.95)',
            1, 'rgba(200,0,0,1)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,
            5, 15,
            10, 25,
            15, 40
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0.9,
            14, 0.6,
            16, 0
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
      
      {/* Statistics Dashboard */}
      {isMapLoaded && locations.length > 0 && (
        <StatsDashboard
          locations={locations}
          stats={stats}
          isVisible={statsVisible}
          onToggle={() => setStatsVisible(!statsVisible)}
        />
      )}
    </div>
  )
}
