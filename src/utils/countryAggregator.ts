import type { ProcessedLocation } from './timelineProcessor'
import type { CountryVisit } from './urlCodec'

export async function aggregateByCountry(locations: ProcessedLocation[]): Promise<CountryVisit[]> {
  const { iso1A2Code } = await import('@rapideditor/country-coder')

  const counts = new Map<string, number>()

  for (const loc of locations) {
    const code = iso1A2Code([loc.longitude, loc.latitude])
    if (code) {
      counts.set(code, (counts.get(code) ?? 0) + loc.count)
    }
  }

  return Array.from(counts, ([countryCode, count]) => ({ countryCode, count }))
    .sort((a, b) => b.count - a.count)
}
