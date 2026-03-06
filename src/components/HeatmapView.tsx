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

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
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
        maxzoom: 16,
        paint: {
          // Log-scale weight: compresses extreme visit counts (1–1700+)
          // so outliers don't drown out the rest of the map.
          // ln(1)=0 → 0.1, ln(5)≈1.6 → 0.35, ln(20)≈3 → 0.6,
          // ln(100)≈4.6 → 0.85, ln(500)≈6.2 → 1.1, ln(1800)≈7.5 → 1.3
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['ln', ['max', ['get', 'count'], 1]],
            0, 0.1,
            1.6, 0.35,
            3, 0.6,
            4.6, 0.85,
            6.2, 1.1,
            7.5, 1.3
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.3,
            5, 0.5,
            9, 1,
            14, 1.8
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.05, 'rgba(255,220,70,0.4)',
            0.15, 'rgba(255,190,40,0.6)',
            0.3, 'rgba(255,140,20,0.75)',
            0.45, 'rgba(245,90,10,0.83)',
            0.6, 'rgba(220,40,10,0.9)',
            0.75, 'rgba(190,15,40,0.94)',
            0.9, 'rgba(170,0,90,0.97)',
            1, 'rgba(140,0,120,1)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 4,
            4, 8,
            8, 18,
            12, 35,
            16, 50
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0.9,
            14, 0.65,
            17, 0
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
            1, '#f6ad35',
            10, '#e53e3e',
            50, '#8c0078'
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
    </div>
  )
}
