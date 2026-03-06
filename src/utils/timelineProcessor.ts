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
  totalDuration: number
  placeId: string
  semanticType?: string
  averageProbability: number
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

function calculateDuration(startTime: string, endTime: string): number {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.max(0, end.getTime() - start.getTime())
  } catch {
    return 0
  }
}

export function processTimelineData(entries: TimelineEntry[]): ProcessedLocation[] {
  const locationMap = new Map<string, ProcessedLocation>()

  for (const entry of entries) {
    try {
      if (!entry.visit?.topCandidate?.placeLocation) continue

      const coords = parseGeoLocation(entry.visit.topCandidate.placeLocation)
      if (!coords) continue

      const duration = calculateDuration(entry.startTime, entry.endTime)
      const probability = parseFloat(entry.visit.topCandidate.probability) || 0
      const placeId = entry.visit.topCandidate.placeID

      const key = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`

      if (locationMap.has(key)) {
        const existing = locationMap.get(key)!
        existing.count++
        existing.totalDuration += duration
        existing.averageProbability = (existing.averageProbability + probability) / 2
      } else {
        locationMap.set(key, {
          latitude: coords.lat,
          longitude: coords.lng,
          count: 1,
          totalDuration: duration,
          placeId,
          semanticType: entry.visit.topCandidate.semanticType,
          averageProbability: probability
        })
      }
    } catch {
      // skip invalid entries
    }
  }

  return Array.from(locationMap.values())
}
