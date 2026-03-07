import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CountryVisit } from '../utils/urlCodec'
import { Spinner } from './Spinner'

interface ChoroplethViewProps {
  countryData: CountryVisit[]
}

export function ChoroplethView({ countryData }: ChoroplethViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current) return

    const instance = new maplibregl.Map({
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
      center: [0, 20],
      zoom: 1
    })

    map.current = instance

    instance.on('load', () => {
      setIsMapLoaded(true)
    })

    instance.on('error', (e) => {
      console.error('Map error:', e)
    })

    return () => {
      map.current = null
      instance.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current || !isMapLoaded || countryData.length === 0) return

    // Normalize counts to 0–1 using log scale with gamma correction.
    // Gamma > 1 stretches differences between high-visit countries so
    // that e.g. a 20× count difference is clearly visible on the map.
    const maxCount = Math.max(...countryData.map(c => c.count))
    const logMax = Math.log(maxCount + 1)
    const GAMMA = 1.5
    const intensityMap = new Map(
      countryData.map(c => [c.countryCode, logMax > 0 ? Math.pow(Math.log(c.count + 1) / logMax, GAMMA) : 0])
    )

    fetch('/countries.geojson')
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (!map.current) return

        // Inject normalized intensity (0–1) into each feature
        for (const feature of geojson.features) {
          const iso = feature.properties?.ISO_A2 as string | undefined
          feature.properties = {
            ...feature.properties,
            intensity: iso ? (intensityMap.get(iso) ?? -1) : -1
          }
        }

        if (map.current.getSource('countries')) {
          (map.current.getSource('countries') as maplibregl.GeoJSONSource).setData(geojson)
        } else {
          map.current.addSource('countries', {
            type: 'geojson',
            data: geojson
          })

          map.current.addLayer({
            id: 'country-fill',
            type: 'fill',
            source: 'countries',
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0,    'rgba(239,246,255,0.6)',   // blue-50
                0.1,  'rgba(219,234,254,0.7)',   // blue-100
                0.2,  'rgba(191,219,254,0.75)',  // blue-200
                0.3,  'rgba(147,197,253,0.8)',   // blue-300
                0.4,  'rgba(96,165,250,0.83)',   // blue-400
                0.5,  'rgba(59,130,246,0.86)',   // blue-500
                0.6,  'rgba(37,99,235,0.89)',    // blue-600
                0.7,  'rgba(29,78,216,0.92)',    // blue-700
                0.8,  'rgba(30,64,175,0.95)',    // blue-800
                0.9,  'rgba(30,58,138,0.97)',    // blue-900
                1,    'rgba(23,37,84,1)'         // blue-950
              ],
              'fill-opacity': [
                'case',
                ['>=', ['get', 'intensity'], 0],
                1,
                0 // fully transparent for unvisited
              ]
            }
          })

        }

        // Fit bounds to visited countries
        const bounds = new maplibregl.LngLatBounds()
        let hasVisited = false
        for (const feature of geojson.features) {
          if ((feature.properties?.intensity ?? -1) >= 0) {
            hasVisited = true
            const addCoords = (coords: GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][]) => {
              for (const item of coords) {
                if (typeof item[0] === 'number') {
                  bounds.extend(item as [number, number])
                } else {
                  addCoords(item as GeoJSON.Position[][] | GeoJSON.Position[][][])
                }
              }
            }
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
              addCoords((feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates)
            }
          }
        }

        if (hasVisited) {
          map.current!.fitBounds(bounds, { padding: 50, maxZoom: 5 })
        }
      })
  }, [countryData, isMapLoaded])

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[500px]"
      />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
          <Spinner message="Loading map..." />
        </div>
      )}
    </div>
  )
}
