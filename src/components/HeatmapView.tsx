import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ProcessedLocation } from '../utils/timelineProcessor'

interface HeatmapViewProps {
  locations: ProcessedLocation[]
}

export function HeatmapView({ locations }: HeatmapViewProps) {
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
  }, [])

  useEffect(() => {
    if (!map.current || !isMapLoaded || locations.length === 0) return

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: locations.map(location => ({
        type: 'Feature' as const,
        properties: {
          count: location.count,
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
          // Gradient across Tailwind colors: cyan → sky → blue → indigo → violet → fuchsia → pink → rose
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.05, 'rgba(103,232,249,0.4)',   // cyan-300
            0.15, 'rgba(56,189,248,0.6)',     // sky-400
            0.3, 'rgba(59,130,246,0.75)',     // blue-500
            0.45, 'rgba(99,102,241,0.83)',    // indigo-500
            0.6, 'rgba(124,58,237,0.9)',      // violet-600
            0.75, 'rgba(192,38,211,0.94)',    // fuchsia-600
            0.9, 'rgba(219,39,119,0.97)',     // pink-600
            1, 'rgba(159,18,57,1)'            // rose-800
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
            1, '#67e8f9',   // cyan-300
            10, '#6366f1',  // indigo-500
            50, '#9f1239'   // rose-800
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8
        }
      })
    }

    const bounds = new maplibregl.LngLatBounds()
    locations.forEach(location => {
      bounds.extend([location.longitude, location.latitude])
    })

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12
    })

  }, [locations, isMapLoaded])

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[500px]"
      />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
