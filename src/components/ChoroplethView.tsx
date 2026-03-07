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

    const visitMap = new Map(countryData.map(c => [c.countryCode, c.count]))

    fetch('/countries.geojson')
      .then(r => r.json())
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (!map.current) return

        // Inject visitCount into each feature
        for (const feature of geojson.features) {
          const iso = feature.properties?.ISO_A2 as string | undefined
          feature.properties = {
            ...feature.properties,
            visitCount: iso ? (visitMap.get(iso) ?? 0) : 0
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
                'case',
                ['>', ['get', 'visitCount'], 0],
                [
                  'interpolate',
                  ['linear'],
                  ['ln', ['max', ['get', 'visitCount'], 1]],
                  0, 'rgba(219,234,254,0.7)',     // blue-100
                  2, 'rgba(147,197,253,0.8)',     // blue-300
                  4, 'rgba(59,130,246,0.85)',     // blue-500
                  6, 'rgba(37,99,235,0.9)',       // blue-600
                  8, 'rgba(30,58,138,1)'          // blue-900
                ],
                'rgba(229,231,235,0.4)' // gray-200 for unvisited
              ]
            }
          })

          map.current.addLayer({
            id: 'country-border',
            type: 'line',
            source: 'countries',
            paint: {
              'line-color': 'rgba(156,163,175,0.6)', // gray-400
              'line-width': 0.5
            }
          })
        }

        // Fit bounds to visited countries
        const bounds = new maplibregl.LngLatBounds()
        let hasVisited = false
        for (const feature of geojson.features) {
          if ((feature.properties?.visitCount ?? 0) > 0) {
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
