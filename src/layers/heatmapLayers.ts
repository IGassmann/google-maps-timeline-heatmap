import type maplibregl from 'maplibre-gl'
import type { ProcessedLocation } from '../utils/timelineProcessor'

const LAYER_IDS = ['timeline-heatmap', 'timeline-points'] as const
const SOURCE_ID = 'timeline-data'

export function apply(map: maplibregl.Map, locations: ProcessedLocation[]) {
  const geojsonData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: locations.map(location => ({
      type: 'Feature',
      properties: {
        count: location.count,
        semanticType: location.semanticType || 'Unknown'
      },
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      }
    }))
  }

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geojsonData
  })

  map.addLayer({
    id: 'timeline-heatmap',
    type: 'heatmap',
    source: SOURCE_ID,
    maxzoom: 16,
    paint: {
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
        0.05, 'rgba(103,232,249,0.4)',
        0.15, 'rgba(56,189,248,0.6)',
        0.3, 'rgba(59,130,246,0.75)',
        0.45, 'rgba(99,102,241,0.83)',
        0.6, 'rgba(124,58,237,0.9)',
        0.75, 'rgba(192,38,211,0.94)',
        0.9, 'rgba(219,39,119,0.97)',
        1, 'rgba(159,18,57,1)'
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

  map.addLayer({
    id: 'timeline-points',
    type: 'circle',
    source: SOURCE_ID,
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
        1, '#67e8f9',
        10, '#6366f1',
        50, '#9f1239'
      ],
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
      'circle-opacity': 0.8
    }
  })

  const LngLatBounds = map.getBounds().constructor as typeof maplibregl.LngLatBounds
  const bounds = new LngLatBounds()
  locations.forEach(location => {
    bounds.extend([location.longitude, location.latitude])
  })
  map.fitBounds(bounds, { padding: 50, maxZoom: 12 })
}

export function remove(map: maplibregl.Map) {
  for (const id of LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
}
