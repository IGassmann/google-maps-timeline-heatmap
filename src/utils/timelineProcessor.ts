export interface TimelineEntry {
  endTime: string
  startTime: string
  visit?: {
    hierarchyLevel: string
    topCandidate: {
      probability: string
      semanticType?: string
      placeID: string
      placeLocation: string
    }
    probability: string
  }
}

export interface ProcessedLocation {
  latitude: number
  longitude: number
  count: number
  semanticType?: string
}

function parseGeoLocation(geoString: string): { lat: number; lng: number } | null {
  const match = geoString.match(/geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (!match) return null

  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])

  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

export function processTimelineData(entries: TimelineEntry[]): ProcessedLocation[] {
  const locationMap = new Map<string, ProcessedLocation>()

  for (const entry of entries) {
    try {
      if (!entry.visit?.topCandidate?.placeLocation) continue

      const coords = parseGeoLocation(entry.visit.topCandidate.placeLocation)
      if (!coords) continue

      const key = entry.visit.topCandidate.placeID
      if (!key) continue

      if (locationMap.has(key)) {
        const existing = locationMap.get(key)!
        existing.count++
      } else {
        locationMap.set(key, {
          latitude: coords.lat,
          longitude: coords.lng,
          count: 1,
          semanticType: entry.visit.topCandidate.semanticType
        })
      }
    } catch {
      // skip invalid entries
    }
  }

  return Array.from(locationMap.values())
}
