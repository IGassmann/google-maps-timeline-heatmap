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

export interface ProcessingStats {
  totalEntries: number
  validLocations: number
  invalidEntries: number
  dateRange: {
    start: Date | null
    end: Date | null
  }
}

export function parseGeoLocation(geoString: string): { lat: number; lng: number } | null {
  const match = geoString.match(/geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (!match) return null

  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])

  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

export function calculateDuration(startTime: string, endTime: string): number {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.max(0, end.getTime() - start.getTime())
  } catch {
    return 0
  }
}

export function processTimelineData(entries: TimelineEntry[]): {
  locations: ProcessedLocation[]
  stats: ProcessingStats
} {
  console.log(`Processing ${entries.length} timeline entries...`)

  const locationMap = new Map<string, ProcessedLocation>()
  const stats: ProcessingStats = {
    totalEntries: entries.length,
    validLocations: 0,
    invalidEntries: 0,
    dateRange: {
      start: null,
      end: null
    }
  }

  for (const entry of entries) {
    try {
      if (!entry.visit?.topCandidate?.placeLocation) {
        stats.invalidEntries++
        continue
      }

      const coords = parseGeoLocation(entry.visit.topCandidate.placeLocation)
      if (!coords) {
        stats.invalidEntries++
        continue
      }

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

      const entryStart = new Date(entry.startTime)
      const entryEnd = new Date(entry.endTime)

      if (!stats.dateRange.start || entryStart < stats.dateRange.start) {
        stats.dateRange.start = entryStart
      }
      if (!stats.dateRange.end || entryEnd > stats.dateRange.end) {
        stats.dateRange.end = entryEnd
      }

      stats.validLocations++
    } catch {
      stats.invalidEntries++
    }
  }

  const locations = Array.from(locationMap.values())
  console.log(`Processed data: ${locations.length} unique locations, ${stats.validLocations} valid entries, ${stats.invalidEntries} invalid entries`)

  if (locations.length > 0) {
    const sampleLocation = locations[0]
    console.log('Sample processed location:', sampleLocation)
  }

  return {
    locations,
    stats
  }
}
