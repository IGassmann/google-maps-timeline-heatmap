import type maplibregl from 'maplibre-gl'
import type { CountryVisit } from '../utils/urlCodec'

const LAYER_IDS = ['country-fill'] as const
const SOURCE_ID = 'countries'

let countriesGeoJsonCache: GeoJSON.FeatureCollection | null = null

export async function apply(map: maplibregl.Map, countryData: CountryVisit[]) {
  if (!countriesGeoJsonCache) {
    const r = await fetch('/countries.geojson')
    countriesGeoJsonCache = await r.json()
  }

  const geojson = structuredClone(countriesGeoJsonCache!)

  const maxCount = Math.max(...countryData.map(c => c.count))
  const logMax = Math.log(maxCount + 1)
  const GAMMA = 1.5
  const intensityMap = new Map(
    countryData.map(c => [c.countryCode, logMax > 0 ? Math.pow(Math.log(c.count + 1) / logMax, GAMMA) : 0])
  )

  for (const feature of geojson.features) {
    const iso = feature.properties?.ISO_A2 as string | undefined
    feature.properties = {
      ...feature.properties,
      intensity: iso ? (intensityMap.get(iso) ?? -1) : -1
    }
  }

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geojson
  })

  map.addLayer({
    id: 'country-fill',
    type: 'fill',
    source: SOURCE_ID,
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'intensity'],
        0,    'rgba(239,246,255,0.6)',
        0.1,  'rgba(219,234,254,0.7)',
        0.2,  'rgba(191,219,254,0.75)',
        0.3,  'rgba(147,197,253,0.8)',
        0.4,  'rgba(96,165,250,0.83)',
        0.5,  'rgba(59,130,246,0.86)',
        0.6,  'rgba(37,99,235,0.89)',
        0.7,  'rgba(29,78,216,0.92)',
        0.8,  'rgba(30,64,175,0.95)',
        0.9,  'rgba(30,58,138,0.97)',
        1,    'rgba(23,37,84,1)'
      ],
      'fill-opacity': [
        'case',
        ['>=', ['get', 'intensity'], 0],
        1,
        0
      ]
    }
  })

  // Fit bounds to visited countries
  const LngLatBounds = map.getBounds().constructor as typeof maplibregl.LngLatBounds
  const bounds = new LngLatBounds()
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
    map.fitBounds(bounds, { padding: 50, maxZoom: 5 })
  }
}

export function remove(map: maplibregl.Map) {
  for (const id of LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
}
